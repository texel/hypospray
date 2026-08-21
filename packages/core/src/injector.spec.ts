import { describe, expect, it, vi } from 'vitest';

import {
  CURRENT_INJECTOR,
  NoInjectorError,
  NoProviderError,
  createInjector,
  createToken,
  getCurrentInjector,
  inject,
  provide,
  provideValue,
  setCurrentInjector,
} from './index.js';

describe('resolution', () => {
  it('resolves a plain function', () => {
    const injector = createInjector();
    const fn = () => ({ value: 42 });

    expect(injector.get(fn)).toEqual({ value: 42 });
  });

  it('resolves a class', () => {
    class MyClass {
      value = 42;
    }

    const injector = createInjector();

    expect(injector.get(MyClass)).toBeInstanceOf(MyClass);
  });

  it('resolves a token via its factory', () => {
    const injector = createInjector();
    const token = createToken({ factory: () => ({ value: 42 }) });

    expect(injector.get(token)).toEqual({ value: 42 });
  });

  it('memoises resolved values', () => {
    const factory = vi.fn(() => ({ value: 42 }));
    const token = createToken({ factory });
    const injector = createInjector();

    expect(injector.get(token)).toBe(injector.get(token));
    expect(factory).toHaveBeenCalledTimes(1);
  });

  // Regression: memoisation used to be keyed on truthiness, so a falsy value
  // re-ran its factory on every resolution.
  it('memoises falsy values', () => {
    const factory = vi.fn(() => 0);
    const token = createToken({ factory });
    const injector = createInjector();

    expect(injector.get(token)).toBe(0);
    expect(injector.get(token)).toBe(0);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('lets a registered provider override a token factory', () => {
    const token = createToken({ factory: () => ({ value: 42 }) });

    const injector = createInjector({
      providers: [provide(token, { factory: () => ({ value: 43 }) })],
    });

    expect(injector.get(token)).toEqual({ value: 43 });
  });

  it('defers factory execution until first resolution', () => {
    const factory = vi.fn(() => 'value');
    const token = createToken<string>();

    createInjector({ providers: [provide(token, { factory })] });

    expect(factory).not.toHaveBeenCalled();
  });

  // Regression: isClass tested `/class(\s|{)/` against the whole function
  // source, so any function mentioning "class " was called with `new`.
  it('does not mistake a function mentioning "class" for a constructor', () => {
    const injector = createInjector();
    const makeThing = () => {
      const label = 'class name';
      return { label };
    };

    expect(injector.get(makeThing)).toEqual({ label: 'class name' });
  });
});

describe('declaring dependencies', () => {
  it('resolves function dependencies through default parameters', () => {
    const dep = () => ({ value: 42 });
    const dependent = (injected = inject(dep)) => ({
      value: 43,
      depValue: injected,
    });

    const injector = createInjector();

    expect(injector.get(dependent)).toEqual({
      value: 43,
      depValue: { value: 42 },
    });
  });

  it('resolves class dependencies through default parameters', () => {
    class MyClass {
      value = 42;
    }
    const dependent = (dep = inject(MyClass)) => ({ depValue: dep.value });

    const injector = createInjector();

    expect(injector.get(dependent)).toEqual({ depValue: 42 });
  });

  it('returns undefined for an optional dependency with no provider', () => {
    const token = createToken<string>();
    const dependent = (dep = inject(token, { optional: true })) => ({
      token: dep,
    });

    expect(createInjector().get(dependent).token).toBeUndefined();
  });

  it('resolves an optional dependency that is provided', () => {
    const token = createToken<string>();
    const injector = createInjector({
      providers: [provideValue(token, 'present')],
    });

    expect(injector.get(token, { optional: true })).toBe('present');
  });

  // Regression: an optional miss was memoised as `undefined`, so a later
  // required resolution returned undefined instead of throwing.
  it('does not let an optional miss satisfy a later required resolution', () => {
    const token = createToken<string>({ name: 'Missing' });
    const injector = createInjector();

    expect(injector.get(token, { optional: true })).toBeUndefined();
    expect(() => injector.get(token)).toThrow(NoProviderError);
  });
});

describe('ambient injector', () => {
  it('throws when injecting with no ambient injector', () => {
    setCurrentInjector(null);

    expect(() => inject(createToken<string>())).toThrow(NoInjectorError);
  });

  it('exposes the resolving injector via CURRENT_INJECTOR', () => {
    const other = createToken({ factory: () => 'other value' });
    const token = createToken({
      factory: (injector = inject(CURRENT_INJECTOR)) => injector.get(other),
    });

    const injector = createInjector();

    expect(injector.get(token)).toBe('other value');
  });

  it('restores the previous ambient injector after invoke', () => {
    setCurrentInjector(null);
    const injector = createInjector();

    const seen = injector.invoke(() => getCurrentInjector());

    expect(seen).toBe(injector);
    expect(getCurrentInjector({ optional: true })).toBeNull();
  });

  it('restores the previous ambient injector for nested invokes', () => {
    const outer = createInjector();
    const inner = createInjector();

    outer.invoke(() => {
      inner.invoke(() => {
        expect(getCurrentInjector()).toBe(inner);
      });
      expect(getCurrentInjector()).toBe(outer);
    });
  });

  // Regression: invoke() set the ambient injector, called fn, then restored it
  // with no try/finally, so a throwing factory leaked it process-wide.
  it('restores the ambient injector when a factory throws', () => {
    setCurrentInjector(null);
    const boom = createToken({
      factory: () => {
        throw new Error('boom');
      },
    });
    const injector = createInjector();

    expect(() => injector.get(boom)).toThrow('boom');
    expect(getCurrentInjector({ optional: true })).toBeNull();
  });
});
