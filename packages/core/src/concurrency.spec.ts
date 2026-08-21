import { describe, expect, it, vi } from 'vitest';

import {
  CircularDependencyError,
  createInjector,
  createToken,
  getCurrentInjector,
  inject,
  provideFactory,
  provideValue,
  setCurrentInjector,
} from './index.js';

/** Yields to the microtask queue so concurrent flows interleave. */
const tick = (times = 1): Promise<void> =>
  times === 0 ? Promise.resolve() : Promise.resolve().then(() => tick(times - 1));

describe('interleaved resolution', () => {
  it('keeps ambient injectors separate across concurrent async flows', async () => {
    const RequestId = createToken<string>({ name: 'RequestId' });

    const handler = async () => {
      const before = inject(RequestId);
      await tick(3);
      const after = inject(RequestId);
      return { before, after };
    };

    const root = createInjector();
    const requestA = root.createChild({
      providers: [provideValue(RequestId, 'a')],
    });
    const requestB = root.createChild({
      providers: [provideValue(RequestId, 'b')],
    });

    const [a, b] = await Promise.all([
      requestA.invoke(handler),
      requestB.invoke(handler),
    ]);

    expect(a).toEqual({ before: 'a', after: 'a' });
    expect(b).toEqual({ before: 'b', after: 'b' });
  });

  it('reports the right ambient injector after an await', async () => {
    const injectorA = createInjector();
    const injectorB = createInjector();

    const observe = async (expected: unknown) => {
      expect(getCurrentInjector()).toBe(expected);
      await tick(2);
      expect(getCurrentInjector()).toBe(expected);
    };

    await Promise.all([
      injectorA.invoke(() => observe(injectorA)),
      injectorB.invoke(() => observe(injectorB)),
    ]);
  });

  it('resolves per-injector values when two flows race on the same token', async () => {
    const Session = createToken<string>({ name: 'Session' });
    const Greeting = createToken<Promise<string>>({ name: 'Greeting' });

    const root = createInjector();
    root.addProviders(
      provideFactory(Greeting, async (): Promise<string> => {
        const session = inject(Session);
        await tick(2);
        return `hello ${session}`;
      }),
    );

    const a = root.createChild({ providers: [provideValue(Session, 'a')] });
    const b = root.createChild({ providers: [provideValue(Session, 'b')] });

    const [first, second] = await Promise.all([a.get(Greeting), b.get(Greeting)]);

    expect(first).toBe('hello a');
    expect(second).toBe('hello b');
  });

  it('does not let one flow observe another flow through a shared root', async () => {
    const Scope = createToken<string>({ name: 'Scope' });
    const seen: string[] = [];

    const record = async () => {
      seen.push(inject(Scope));
      await tick(1);
      seen.push(inject(Scope));
      await tick(1);
      seen.push(inject(Scope));
    };

    const root = createInjector();

    await Promise.all(
      ['one', 'two', 'three'].map((name) =>
        root.createChild({ providers: [provideValue(Scope, name)] }).invoke(record),
      ),
    );

    expect(seen.filter((s) => s === 'one')).toHaveLength(3);
    expect(seen.filter((s) => s === 'two')).toHaveLength(3);
    expect(seen.filter((s) => s === 'three')).toHaveLength(3);
  });

  it('restores ambient state when one of several concurrent flows rejects', async () => {
    setCurrentInjector(null);

    const failing = createInjector();
    const succeeding = createInjector();

    const results = await Promise.allSettled([
      failing.invoke(async () => {
        await tick(1);
        throw new Error('boom');
      }),
      succeeding.invoke(async () => {
        await tick(2);
        return getCurrentInjector();
      }),
    ]);

    expect(results[0]).toMatchObject({ status: 'rejected' });
    expect(results[1]).toMatchObject({ status: 'fulfilled', value: succeeding });
    expect(getCurrentInjector({ optional: true })).toBeNull();
  });
});

describe('resolution state isolation', () => {
  // Regression: the cycle-detection stack was a module-level array shared by
  // every injector, and was hand-balanced with pop/push around parent lookups.
  it('does not leak cycle-detection state after a failed resolution', () => {
    const boom = createToken({
      name: 'Boom',
      factory: (): string => {
        throw new Error('boom');
      },
    });

    expect(() => createInjector().get(boom)).toThrow('boom');

    let thrown: unknown;
    try {
      createInjector().get(boom);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(CircularDependencyError);
  });

  it('does not report a false cycle when one injector resolves through another', () => {
    const Inner = createToken({ name: 'Inner', factory: () => 'inner value' });
    const other = createInjector();

    const Bridge = createToken({
      name: 'Bridge',
      factory: () => other.get(Inner),
    });

    expect(createInjector().get(Bridge)).toBe('inner value');
  });

  it('does not report a false cycle when the same token resolves in two injectors', () => {
    const Shared = createToken({ name: 'Shared', factory: () => ({}) });

    const outer = createInjector();
    const inner = createInjector();

    const Wrapper = createToken({
      name: 'Wrapper',
      factory: () => ({
        own: inject(Shared),
        other: inner.get(Shared),
      }),
    });

    const result = outer.get(Wrapper);

    expect(result.own).not.toBe(result.other);
  });

  it('runs a memoised factory once even when raced', async () => {
    const factory = vi.fn(() => ({}));
    const token = createToken({ name: 'Once', factory });

    const injector = createInjector();

    const [a, b] = await Promise.all([
      Promise.resolve().then(() => injector.get(token)),
      Promise.resolve().then(() => injector.get(token)),
    ]);

    expect(a).toBe(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
