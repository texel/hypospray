import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ContextStrategy } from './index.js';
import {
  NoInjectorError,
  createInjector,
  createSyncContextStrategy,
  getContextStrategy,
  getCurrentInjector,
  inject,
  provideValue,
  setContextStrategy,
} from './index.js';

afterEach(() => {
  setContextStrategy(createSyncContextStrategy());
});

describe('the default context strategy', () => {
  it('makes an injector ambient for the duration of run', () => {
    const injector = createInjector();

    expect(getCurrentInjector({ optional: true })).toBeNull();
    expect(injector.run(() => getCurrentInjector())).toBe(injector);
    expect(getCurrentInjector({ optional: true })).toBeNull();
  });

  it('restores the previous context when run throws', () => {
    const injector = createInjector();

    expect(() =>
      injector.run(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(getCurrentInjector({ optional: true })).toBeNull();
  });

  // The synchronous strategy cannot follow a flow across an await. It fails
  // closed — the context is already restored — rather than handing back
  // whatever injector happens to be ambient. Servers get the async-aware
  // strategy via the `node` export condition instead.
  it('does not carry context across an await', async () => {
    const injector = createInjector();

    const seen = await injector.run(async () => {
      await Promise.resolve();
      return getCurrentInjector({ optional: true });
    });

    expect(seen).toBeNull();
  });
});

describe('diagnosing a lost context', () => {
  /** Runs `fn` past a suspension point and hands back whatever it threw. */
  const catchAfterAwait = async (strategy: ContextStrategy): Promise<Error> => {
    setContextStrategy(strategy);
    const getTheme = () => 'system';

    const error = await createInjector().run(async () => {
      await Promise.resolve();
      try {
        inject(getTheme);
      } catch (thrown) {
        return thrown as Error;
      }
      return null;
    });

    expect(error).toBeInstanceOf(NoInjectorError);
    return error as Error;
  };

  // Naming run() as the fix is the one thing that cannot help here: the call
  // already was inside run(), just past an await.
  it('explains that a non-async-aware strategy cannot cross an await', async () => {
    const message = (await catchAfterAwait(createSyncContextStrategy())).message;

    expect(message).toContain('await');
    expect(message).toContain('sync');
    expect(message).toContain('getCurrentInjector()');
    expect(message).toContain('node');
  });

  it('names the installed strategy', async () => {
    const strategy: ContextStrategy = { ...createSyncContextStrategy(), name: 'my-adapter' };

    expect((await catchAfterAwait(strategy)).message).toContain('my-adapter');
  });

  // The guidance would be a red herring for a strategy that does carry context
  // across awaits: there, a missing injector means run() really was skipped.
  it('withholds the await guidance from an async-aware strategy', async () => {
    const strategy: ContextStrategy = { ...createSyncContextStrategy(), asyncAware: true };

    const message = (await catchAfterAwait(strategy)).message;

    expect(message).toContain('injection context');
    expect(message).not.toContain('await');
  });

  it('says nothing about awaits when a strategy declines to answer', async () => {
    const { get, run, enter } = createSyncContextStrategy();
    const strategy: ContextStrategy = { get, run, enter };

    expect((await catchAfterAwait(strategy)).message).not.toContain('await');
  });
});

describe('replacing the context strategy', () => {
  it('routes ambient lookups through the installed strategy', () => {
    const inner = createSyncContextStrategy();
    const strategy: ContextStrategy = {
      get: vi.fn(() => inner.get()),
      run: vi.fn((context, fn) => inner.run(context, fn)),
      enter: vi.fn((context) => inner.enter(context)),
    };

    setContextStrategy(strategy);

    const getTheme = () => 'system';
    const injector = createInjector({ providers: [provideValue(getTheme, 'dark')] });

    expect(injector.run(() => inject(getTheme))).toBe('dark');
    expect(strategy.run).toHaveBeenCalled();
    expect(strategy.get).toHaveBeenCalled();
  });

  it('reports the installed strategy', () => {
    const strategy = createSyncContextStrategy();

    setContextStrategy(strategy);

    expect(getContextStrategy()).toBe(strategy);
  });
});
