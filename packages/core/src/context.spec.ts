import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ContextStrategy } from './index.js';
import {
  ConcurrentContextError,
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

  // The synchronous strategy cannot follow a flow across an await.
  // After the await point, the context will be null and there will be no current injector.
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

  // In an async-aware strategy, something other than crossing the await point
  // must have caused the context to be lost. We don't want to be so "helpful"
  // that we end up misleading users.
  it('withholds the await guidance from an async-aware strategy', async () => {
    const strategy: ContextStrategy = {
      ...createSyncContextStrategy(),
      preservesAsyncContext: true,
    };

    const message = (await catchAfterAwait(strategy)).message;

    expect(message).toContain('injection context');
    expect(message).not.toContain('await');
  });

  it('says nothing about awaits when a strategy does not specify whether it preserves async context', async () => {
    const { get, run } = createSyncContextStrategy();
    const strategy: ContextStrategy = { get, run };

    expect((await catchAfterAwait(strategy)).message).not.toContain('await');
  });
});

describe('replacing the context strategy', () => {
  it('routes ambient lookups through the installed strategy', () => {
    const inner = createSyncContextStrategy();
    const strategy: ContextStrategy = {
      get: vi.fn(() => inner.get()),
      run: vi.fn((context, fn) => inner.run(context, fn)),
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

describe('interleaving under the sync strategy', () => {
  /** Yields to the microtask queue so two flows can overlap. */
  const tick = (): Promise<void> => Promise.resolve();

  it('throws when a second injector runs while an earlier async run is pending', async () => {
    const root = createInjector();
    const a = root.createChild();
    const b = root.createChild();

    // Keep `a` pending while `b` starts, so both injectors have active runs at
    // the same time.
    const pending = a.run(async () => {
      await tick();
    });

    expect(() => b.run(async () => {})).toThrow(ConcurrentContextError);

    await pending;
  });

  it('allows the same injector to run concurrently with itself', async () => {
    const injector = createInjector();

    const first = injector.run(async () => {
      await tick();
      return 1;
    });
    const second = injector.run(async () => 2);

    expect(await Promise.all([first, second])).toEqual([1, 2]);
  });

  it('allows a second flow once the first has settled', async () => {
    const root = createInjector();
    const a = root.createChild();
    const b = root.createChild();

    await a.run(async () => {
      await tick();
    });

    await expect(b.run(async () => 'ok')).resolves.toBe('ok');
  });

  it('does not fire on synchronous runs', () => {
    const root = createInjector();
    const a = root.createChild();
    const b = root.createChild();

    expect(() => {
      a.run(() => undefined);
      b.run(() => undefined);
    }).not.toThrow();
  });

  it('allows overlapping runs when strict is off', async () => {
    setContextStrategy(createSyncContextStrategy({ strict: false }));

    const root = createInjector();
    const a = root.createChild();
    const b = root.createChild();

    const pending = a.run(async () => {
      await tick();
    });

    expect(() => b.run(async () => {})).not.toThrow();

    await pending;
  });
});
