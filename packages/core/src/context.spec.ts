import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ContextStrategy } from './index.js';
import {
  createInjector,
  createSyncContextStrategy,
  createToken,
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
  it('makes an injector ambient for the duration of invoke', () => {
    const injector = createInjector();

    expect(getCurrentInjector({ optional: true })).toBeNull();
    expect(injector.invoke(() => getCurrentInjector())).toBe(injector);
    expect(getCurrentInjector({ optional: true })).toBeNull();
  });

  it('restores the previous context when invoke throws', () => {
    const injector = createInjector();

    expect(() =>
      injector.invoke(() => {
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

    const seen = await injector.invoke(async () => {
      await Promise.resolve();
      return getCurrentInjector({ optional: true });
    });

    expect(seen).toBeNull();
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

    const token = createToken<string>({ name: 'Token' });
    const injector = createInjector({ providers: [provideValue(token, 'value')] });

    expect(injector.invoke(() => inject(token))).toBe('value');
    expect(strategy.run).toHaveBeenCalled();
    expect(strategy.get).toHaveBeenCalled();
  });

  it('reports the installed strategy', () => {
    const strategy = createSyncContextStrategy();

    setContextStrategy(strategy);

    expect(getContextStrategy()).toBe(strategy);
  });
});
