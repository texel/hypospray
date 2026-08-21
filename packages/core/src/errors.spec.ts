import { describe, expect, it } from 'vitest';

import {
  CircularDependencyError,
  InjectionToken,
  NoInjectorError,
  NoProviderError,
  createInjector,
  createToken,
  inject,
  provideValue,
  setCurrentInjector,
} from './index.js';

describe('NoProviderError', () => {
  it('is thrown for a token with no factory and no provider', () => {
    const token = createToken<string>({ name: 'ApiUrl' });

    expect(() => createInjector().get(token)).toThrow(NoProviderError);
  });

  // Regression: this path was `it.todo` and interpolated the raw token, so the
  // one error most likely to be seen read "No provider found for [object Object]".
  it('names the token it could not resolve', () => {
    const token = createToken<string>({ name: 'ApiUrl' });

    expect(() => createInjector().get(token)).toThrow(/ApiUrl/);
  });

  it('never renders a token as [object Object]', () => {
    const anonymous = createToken<string>();

    let thrown: unknown;
    try {
      createInjector().get(anonymous);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(NoProviderError);
    expect((thrown as Error).message).not.toContain('[object Object]');
  });

  it('is an Error', () => {
    const error = new NoProviderError('nope');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NoProviderError');
  });
});

describe('NoInjectorError', () => {
  it('is thrown when injecting outside an injector', () => {
    setCurrentInjector(null);

    expect(() => inject(createToken<string>())).toThrow(NoInjectorError);
  });
});

describe('CircularDependencyError', () => {
  it('detects a token that depends on itself', () => {
    const circular: InjectionToken<unknown> = createToken({
      name: 'circular',
      factory: (dep = inject(circular)) => dep,
    });

    expect(() => createInjector().get(circular)).toThrow(
      CircularDependencyError,
    );
  });

  it('detects a cycle between two tokens', () => {
    const a: InjectionToken<unknown> = createToken({
      name: 'A',
      factory: () => inject(b),
    });
    const b: InjectionToken<unknown> = createToken({
      name: 'B',
      factory: () => inject(a),
    });

    expect(() => createInjector().get(a)).toThrow(CircularDependencyError);
  });

  it('reports the path that formed the cycle', () => {
    const a: InjectionToken<unknown> = createToken({
      name: 'Alpha',
      factory: () => inject(b),
    });
    const b: InjectionToken<unknown> = createToken({
      name: 'Beta',
      factory: () => inject(a),
    });

    expect(() => createInjector().get(a)).toThrow(/Alpha.*Beta/s);
  });

  it('still detects a cycle that crosses an injector boundary', () => {
    const a: InjectionToken<unknown> = createToken({
      name: 'A',
      factory: () => inject(b),
    });
    const b: InjectionToken<unknown> = createToken({
      name: 'B',
      factory: () => inject(a),
    });

    const child = createInjector().createChild();

    expect(() => child.get(a)).toThrow(CircularDependencyError);
  });

  it('does not report a cycle for a diamond dependency', () => {
    const shared = createToken({ name: 'Shared', factory: () => ({ v: 1 }) });
    const left = createToken({ factory: () => inject(shared) });
    const right = createToken({ factory: () => inject(shared) });
    const root = createToken({
      factory: () => [inject(left), inject(right)],
    });

    const injector = createInjector();

    expect(injector.get(root)).toEqual([{ v: 1 }, { v: 1 }]);
  });

  it('does not report a cycle when a token is resolved twice in sequence', () => {
    const shared = createToken({ factory: () => 'shared' });
    const injector = createInjector({
      providers: [provideValue(shared, 'shared')],
    });

    expect(injector.get(shared)).toBe('shared');
    expect(injector.get(shared)).toBe('shared');
  });
});
