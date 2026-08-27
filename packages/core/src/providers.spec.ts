import { describe, expect, it, vi } from 'vitest';

import {
  createInjector,
  extendProvider,
  provide,
  provideExisting,
  provideFactory,
  provideValue,
} from './index.js';

describe('provideValue', () => {
  it('provides a fixed value', () => {
    const getRetryPolicy = () => ({ retries: 3 });
    const policy = { retries: 10 };

    const injector = createInjector({ providers: [provideValue(getRetryPolicy, policy)] });

    expect(injector.get(getRetryPolicy)).toBe(policy);
  });

  // provide() branched on `if (options.value)`, so every falsy
  // value fell through and the token silently provided itself instead.
  it.each([
    ['false', false],
    ['zero', 0],
    ['empty string', ''],
    ['null', null],
  ] as const)('provides %s', { tags: ['regression'] }, (_label, value) => {
    const getSetting = (): unknown => 'its own value';

    const injector = createInjector({ providers: [provideValue(getSetting, value)] });

    expect(injector.get(getSetting)).toBe(value);
  });

  it('provides undefined without falling back to the function it names', () => {
    const getNickname = (): string | undefined => 'fallback';

    const injector = createInjector({ providers: [provideValue(getNickname, undefined)] });

    expect(injector.get(getNickname)).toBeUndefined();
  });
});

describe('provideFactory', () => {
  // The documented answer for a class the injector cannot construct on its
  // own: hand it a factory instead of letting it guess at the arguments.
  it('runs the factory once and memoises the result', () => {
    class Database {
      url: string;

      constructor(url: string) {
        this.url = url;
      }
    }

    const factory = vi.fn(() => new Database('postgres://test'));

    const injector = createInjector({ providers: [provideFactory(Database, factory)] });

    expect(injector.get(Database)).toBe(injector.get(Database));
    expect(injector.get(Database).url).toBe('postgres://test');
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe('provideExisting', () => {
  it('aliases one function to another', () => {
    const connectPrimary = () => 'primary connection';
    const connectReplica = () => 'replica connection';

    const injector = createInjector({
      providers: [provideExisting(connectReplica, connectPrimary)],
    });

    expect(injector.get(connectReplica)).toBe('primary connection');
  });

  // the alias re-invoked the target's factory instead of resolving
  // it through the injector, so aliasing a class produced a second instance.
  it('yields the same instance as the aliased token', { tags: ['regression'] }, () => {
    class Logger {
      id = Math.random();
    }
    class ConsoleLogger extends Logger {}

    const injector = createInjector({ providers: [provideExisting(Logger, ConsoleLogger)] });

    expect(injector.get(Logger)).toBe(injector.get(ConsoleLogger));
    expect(injector.get(Logger)).toBeInstanceOf(ConsoleLogger);
  });

  it('respects an override of the aliased token', () => {
    const connectPrimary = () => 'primary connection';
    const connectReplica = () => 'replica connection';

    const injector = createInjector({
      providers: [
        provideExisting(connectReplica, connectPrimary),
        provideValue(connectPrimary, 'overridden'),
      ],
    });

    expect(injector.get(connectReplica)).toBe('overridden');
  });
});

describe('provide', () => {
  it('makes a class provide itself when given no options', () => {
    class EventBus {
      listeners: string[] = [];
    }

    const injector = createInjector({ providers: [provide(EventBus)] });

    expect(injector.get(EventBus)).toBeInstanceOf(EventBus);
  });

  it('accepts a bare class or function as shorthand for providing itself', () => {
    class EventBus {
      listeners: string[] = [];
    }
    const createQueue = () => ['job'];

    const injector = createInjector({ providers: [EventBus, createQueue] });

    expect(injector.get(EventBus)).toBeInstanceOf(EventBus);
    expect(injector.get(createQueue)).toEqual(['job']);
  });

  it('replaces an earlier provider for the same token', () => {
    const getEnvironment = () => 'development';

    const injector = createInjector({
      providers: [
        provideValue(getEnvironment, 'staging'),
        provideValue(getEnvironment, 'production'),
      ],
    });

    expect(injector.get(getEnvironment)).toBe('production');
  });
});

describe('extendProvider', () => {
  it('accumulates values in registration order', () => {
    const getMiddleware = (): string[] => [];

    const injector = createInjector();
    injector.addProviders(
      extendProvider(getMiddleware, (middleware) => [...middleware, 'auth']),
      extendProvider(getMiddleware, (middleware) => [...middleware, 'logging']),
    );

    expect(injector.get(getMiddleware)).toEqual(['auth', 'logging']);
  });

  it('extends a value registered by an earlier provider', () => {
    const getMiddleware = (): string[] => [];

    const injector = createInjector({
      providers: [
        provideValue(getMiddleware, ['compression']),
        extendProvider(getMiddleware, (middleware) => [...middleware, 'auth']),
      ],
    });

    expect(injector.get(getMiddleware)).toEqual(['compression', 'auth']);
  });

  it('runs each extension once', () => {
    const getMiddleware = (): string[] => [];
    const extend = vi.fn((middleware: string[]) => [...middleware, 'auth']);

    const injector = createInjector();
    injector.addProviders(extendProvider(getMiddleware, extend));

    injector.get(getMiddleware);
    injector.get(getMiddleware);

    expect(extend).toHaveBeenCalledTimes(1);
  });
});
