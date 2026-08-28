import { describe, expect, it, vi } from 'vitest';

import {
  CircularDependencyError,
  createInjector,
  getCurrentInjector,
  inject,
  provideValue,
  setCurrentInjector,
} from './index.node.js';

// We're explicitly importing from the `node` entrypoint to test the
// async flow. The default entry's sync strategy is covered in
// context.spec.ts.

/** Yields to the microtask queue so concurrent flows interleave. */
const tick = (times = 1): Promise<void> =>
  times === 0 ? Promise.resolve() : Promise.resolve().then(() => tick(times - 1));

describe('interleaved resolution', () => {
  it('keeps ambient injectors separate across concurrent async flows', async () => {
    const getRequestId = () => 'no request';

    const handler = async () => {
      const before = inject(getRequestId);
      await tick(3);
      const after = inject(getRequestId);
      return { before, after };
    };

    const root = createInjector();
    const requestA = root.createChild({ providers: [provideValue(getRequestId, 'a')] });
    const requestB = root.createChild({ providers: [provideValue(getRequestId, 'b')] });

    const [a, b] = await Promise.all([requestA.run(handler), requestB.run(handler)]);

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
      injectorA.run(() => observe(injectorA)),
      injectorB.run(() => observe(injectorB)),
    ]);
  });

  it('resolves per-injector values when two flows race on the same token', async () => {
    const getSession = () => 'anonymous';

    const greet = async (): Promise<string> => {
      const session = inject(getSession);
      await tick(2);
      return `hello ${session}`;
    };

    // Both request-scoped providers are registered on the request injector.
    // A provider resolves in the injector that owns it, so registering
    // `greet` on the root would deny it any view of a per-request session.
    const root = createInjector();
    const a = root.createChild({ providers: [provideValue(getSession, 'a'), greet] });
    const b = root.createChild({ providers: [provideValue(getSession, 'b'), greet] });

    const [first, second] = await Promise.all([a.get(greet), b.get(greet)]);

    expect(first).toBe('hello a');
    expect(second).toBe('hello b');
  });

  it('does not let one flow observe another flow through a shared root', async () => {
    const getScope = () => 'unscoped';
    const seen: string[] = [];

    const record = async () => {
      seen.push(inject(getScope));
      await tick(1);
      seen.push(inject(getScope));
      await tick(1);
      seen.push(inject(getScope));
    };

    const root = createInjector();

    await Promise.all(
      ['one', 'two', 'three'].map((name) =>
        root.createChild({ providers: [provideValue(getScope, name)] }).run(record),
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
      failing.run(async () => {
        await tick(1);
        throw new Error('boom');
      }),
      succeeding.run(async () => {
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
  // the cycle-detection stack was a module-level array shared by
  // every injector, and was hand-balanced with pop/push around parent lookups.
  it(
    'does not leak cycle-detection state after a failed resolution',
    { tags: ['regression'] },
    () => {
      const connectToDatabase = (): { query: () => unknown[] } => {
        throw new Error('connection refused');
      };

      expect(() => createInjector().get(connectToDatabase)).toThrow('connection refused');

      let thrown: unknown;
      try {
        createInjector().get(connectToDatabase);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      expect(thrown).not.toBeInstanceOf(CircularDependencyError);
    },
  );

  it('does not report a false cycle when one injector resolves through another', () => {
    const other = createInjector();
    const loadSettings = () => ({ theme: 'dark' });
    const createBridge = () => other.get(loadSettings);

    expect(createInjector().get(createBridge)).toEqual({ theme: 'dark' });
  });

  it('does not report a false cycle when the same token resolves in two injectors', () => {
    class Cache {
      entries = new Map<string, string>();
    }

    const outer = createInjector();
    const inner = createInjector();

    const createReport = () => ({
      own: inject(Cache),
      other: inner.get(Cache),
    });

    const result = outer.get(createReport);

    expect(result.own).not.toBe(result.other);
  });

  it('runs a memoised factory once even when raced', async () => {
    const createCache = vi.fn(() => new Map<string, string>());

    const injector = createInjector();

    const [a, b] = await Promise.all([
      Promise.resolve().then(() => injector.get(createCache)),
      Promise.resolve().then(() => injector.get(createCache)),
    ]);

    expect(a).toBe(b);
    expect(createCache).toHaveBeenCalledTimes(1);
  });
});
