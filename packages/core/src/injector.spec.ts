import { describe, expect, it, vi } from 'vitest';

import {
  CURRENT_INJECTOR,
  Injector,
  NoInjectorError,
  NoProviderError,
  createInjector,
  createSyncContextStrategy,
  createToken,
  getCurrentInjector,
  inject,
  provide,
  provideValue,
} from './index.js';

describe('configuration', () => {
  it('rejects a process-wide context strategy on a child injector', () => {
    const parent = createInjector();
    const createInvalidChild = (): Injector =>
      // @ts-expect-error A child injector cannot configure the context strategy.
      new Injector({ parent, context: createSyncContextStrategy() });

    expect(createInvalidChild).toThrowError(
      'A child injector cannot configure the process-wide context strategy.',
    );
  });
});

describe('resolution', () => {
  it('resolves a plain function', () => {
    const createConfig = () => ({ retries: 3 });

    expect(createInjector().get(createConfig)).toEqual({ retries: 3 });
  });

  it('resolves a class', () => {
    class HttpClient {
      timeout = 5000;
    }

    expect(createInjector().get(HttpClient)).toBeInstanceOf(HttpClient);
  });

  // An InjectionToken is the escape hatch for the cases a function or class
  // cannot cover: a bare config value, or a type with no runtime identity.
  it('resolves a token via its factory', () => {
    const ApiUrl = createToken({ name: 'ApiUrl', factory: () => 'https://example.com' });

    expect(createInjector().get(ApiUrl)).toBe('https://example.com');
  });

  it('memoises resolved values', () => {
    const connectToDatabase = vi.fn(() => ({ id: 1 }));
    const injector = createInjector();

    expect(injector.get(connectToDatabase)).toBe(injector.get(connectToDatabase));
    expect(connectToDatabase).toHaveBeenCalledTimes(1);
  });

  // memoisation used to be keyed on truthiness, so a falsy value
  // re-ran its factory on every resolution.
  it('memoises falsy values', { tags: ['regression'] }, () => {
    const getRetryCount = vi.fn(() => 0);
    const injector = createInjector();

    expect(injector.get(getRetryCount)).toBe(0);
    expect(injector.get(getRetryCount)).toBe(0);
    expect(getRetryCount).toHaveBeenCalledTimes(1);
  });

  it('lets a registered provider stand in for a class', () => {
    class Clock {
      now(): number {
        return Date.now();
      }
    }

    const injector = createInjector({
      providers: [provide(Clock, { factory: () => ({ now: () => 1_700_000_000 }) })],
    });

    expect(injector.get(Clock).now()).toBe(1_700_000_000);
  });

  it('defers construction until first resolution', () => {
    const connectToDatabase = vi.fn(() => ({ query: () => [] }));

    createInjector({ providers: [connectToDatabase] });

    expect(connectToDatabase).not.toHaveBeenCalled();
  });

  // isClass tested `/class(\s|{)/` against the whole function
  // source, so any function mentioning "class " was called with `new`.
  it(
    'does not mistake a function mentioning "class" for a constructor',
    { tags: ['regression'] },
    () => {
      const injector = createInjector();
      const makeThing = () => {
        const label = 'class name';
        return { label };
      };

      expect(injector.get(makeThing)).toEqual({ label: 'class name' });
    },
  );
});

describe('declaring dependencies', () => {
  it('resolves function dependencies through default parameters', () => {
    const createLogger = () => ({ level: 'info' });
    const createRequestLogger = (logger = inject(createLogger)) => ({
      prefix: '[request]',
      logger,
    });

    expect(createInjector().get(createRequestLogger)).toEqual({
      prefix: '[request]',
      logger: { level: 'info' },
    });
  });

  it('resolves class dependencies through constructor default parameters', () => {
    class Clock {
      now(): number {
        return 1234;
      }
    }

    class Stopwatch {
      startedAt: number;

      constructor(clock = inject(Clock)) {
        this.startedAt = clock.now();
      }
    }

    expect(createInjector().get(Stopwatch).startedAt).toBe(1234);
  });

  it('mixes classes and functions in one graph', () => {
    class Clock {
      now(): number {
        return 7;
      }
    }

    const createTimestamper =
      (clock = inject(Clock)) =>
      () =>
        clock.now();

    class Report {
      stamp: number;

      constructor(timestamp = inject(createTimestamper)) {
        this.stamp = timestamp();
      }
    }

    expect(createInjector().get(Report).stamp).toBe(7);
  });

  it('returns undefined for an optional dependency with no provider', () => {
    // Only a factory-less token can genuinely be missing — a function or class
    // always knows how to provide itself.
    const FeatureFlags = createToken<Record<string, boolean>>({ name: 'FeatureFlags' });
    const createDashboard = (flags = inject(FeatureFlags, { optional: true })) => ({ flags });

    expect(createInjector().get(createDashboard).flags).toBeUndefined();
  });

  it('resolves an optional dependency that is provided', () => {
    const getTheme = () => 'system';

    const injector = createInjector({ providers: [provideValue(getTheme, 'dark')] });

    expect(injector.get(getTheme, { optional: true })).toBe('dark');
  });

  // an optional miss was memoised as `undefined`, so a later
  // required resolution returned undefined instead of throwing.
  it(
    'does not let an optional miss satisfy a later required resolution',
    { tags: ['regression'] },
    () => {
      const FeatureFlags = createToken<Record<string, boolean>>({ name: 'FeatureFlags' });
      const injector = createInjector();

      expect(injector.get(FeatureFlags, { optional: true })).toBeUndefined();
      expect(() => injector.get(FeatureFlags)).toThrow(NoProviderError);
    },
  );
});

describe('ambient injector', () => {
  it('throws when injecting with no ambient injector', () => {
    const createMailer = () => ({ send: () => 'sent' });

    expect(() => inject(createMailer)).toThrow(NoInjectorError);
  });

  it('exposes the resolving injector via CURRENT_INJECTOR', () => {
    const createMailer = () => ({ send: () => 'sent' });
    const createNotifier = (injector = inject(CURRENT_INJECTOR)) => injector.get(createMailer);

    expect(createInjector().get(createNotifier).send()).toBe('sent');
  });

  it('restores the previous ambient injector after run', () => {
    const injector = createInjector();

    const seen = injector.run(() => getCurrentInjector());

    expect(seen).toBe(injector);
    expect(getCurrentInjector({ optional: true })).toBeNull();
  });

  it('restores the previous ambient injector for nested runs', () => {
    const outer = createInjector();
    const inner = createInjector();

    outer.run(() => {
      inner.run(() => {
        expect(getCurrentInjector()).toBe(inner);
      });
      expect(getCurrentInjector()).toBe(outer);
    });
  });

  // run() set the ambient injector, called fn, then restored it
  // with no try/finally, so a throwing factory leaked it process-wide.
  it('restores the ambient injector when a factory throws', { tags: ['regression'] }, () => {
    const connectToDatabase = (): { query: () => unknown[] } => {
      throw new Error('connection refused');
    };
    const injector = createInjector();

    expect(() => injector.get(connectToDatabase)).toThrow('connection refused');
    expect(getCurrentInjector({ optional: true })).toBeNull();
  });
});
