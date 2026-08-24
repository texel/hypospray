import { describe, expect, it, vi } from 'vitest';

import {
  createInjector,
  createToken,
  extendProvider,
  provide,
  provideExisting,
  provideFactory,
  provideValue,
} from './index.js';

describe('provideValue', () => {
  it('provides a fixed value', () => {
    const token = createToken<{ value: number }>();
    const value = { value: 42 };

    const injector = createInjector({ providers: [provideValue(token, value)] });

    expect(injector.get(token)).toBe(value);
  });

  // Regression: provide() branched on `if (options.value)`, so every falsy
  // value fell through and the token silently provided itself instead.
  it.each([
    ['false', false],
    ['zero', 0],
    ['empty string', ''],
    ['null', null],
  ] as const)('provides %s', (_label, value) => {
    const token = createToken<typeof value>({
      factory: () => 'fallback' as never,
    });

    const injector = createInjector({ providers: [provideValue(token, value)] });

    expect(injector.get(token)).toBe(value);
  });

  it('provides undefined without falling back to the token factory', () => {
    const token = createToken<string | undefined>({
      factory: () => 'fallback',
    });

    const injector = createInjector({
      providers: [provideValue(token, undefined)],
    });

    expect(injector.get(token)).toBeUndefined();
  });
});

describe('provideFactory', () => {
  it('runs the factory once and memoises the result', () => {
    const factory = vi.fn(() => ({ value: 42 }));
    const token = createToken<{ value: number }>();

    const injector = createInjector({
      providers: [provideFactory(token, factory)],
    });

    expect(injector.get(token)).toBe(injector.get(token));
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe('provideExisting', () => {
  it('aliases a token to a value provided elsewhere', () => {
    const createValueA = () => 'A';
    const createValueB = () => 'B';

    const injector = createInjector({
      providers: [provide(createValueA), provideExisting(createValueB, createValueA)],
    });

    expect(injector.get(createValueB)).toBe('A');
  });

  // Regression: the alias re-invoked the target's factory instead of resolving
  // it through the injector, so aliasing a class produced a second instance.
  it('yields the same instance as the aliased token', () => {
    class Thing {
      id = Math.random();
    }
    const canonical = createToken({ factory: () => new Thing() });
    const alias = createToken<Thing>();

    const injector = createInjector({
      providers: [provideExisting(alias, canonical)],
    });

    expect(injector.get(alias)).toBe(injector.get(canonical));
  });

  it('respects an override of the aliased token', () => {
    const canonical = createToken({ factory: () => 'original' });
    const alias = createToken<string>();

    const injector = createInjector({
      providers: [provideExisting(alias, canonical), provideValue(canonical, 'overridden')],
    });

    expect(injector.get(alias)).toBe('overridden');
  });
});

describe('provide', () => {
  it('makes a token provide itself when given no options', () => {
    class MyClass {
      value = 42;
    }

    const injector = createInjector({ providers: [provide(MyClass)] });

    expect(injector.get(MyClass)).toBeInstanceOf(MyClass);
  });

  it('replaces an earlier provider for the same token', () => {
    const token = createToken<string>();

    const injector = createInjector({
      providers: [provideValue(token, 'first'), provideValue(token, 'second')],
    });

    expect(injector.get(token)).toBe('second');
  });
});

describe('extendProvider', () => {
  it('accumulates values in registration order', () => {
    const getWidgets = (): string[] => [];

    const injector = createInjector();
    injector.addProviders(
      extendProvider(getWidgets, (widgets) => [...widgets, 'new widget']),
      extendProvider(getWidgets, (widgets) => [...widgets, 'another widget']),
    );

    expect(injector.get(getWidgets)).toEqual(['new widget', 'another widget']);
  });

  it('extends a value registered by an earlier provider', () => {
    const token = createToken<string[]>();

    const injector = createInjector({
      providers: [
        provideValue(token, ['base']),
        extendProvider(token, (items) => [...items, 'extended']),
      ],
    });

    expect(injector.get(token)).toEqual(['base', 'extended']);
  });

  it('runs each extension once', () => {
    const getWidgets = (): string[] => [];
    const extend = vi.fn((widgets: string[]) => [...widgets, 'widget']);

    const injector = createInjector();
    injector.addProviders(extendProvider(getWidgets, extend));

    injector.get(getWidgets);
    injector.get(getWidgets);

    expect(extend).toHaveBeenCalledTimes(1);
  });
});
