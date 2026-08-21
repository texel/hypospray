import { describe, expect, it } from 'vitest';

import { InjectionToken, createInjector, createToken } from './index.js';

describe('createToken', () => {
  it('creates a token with a factory', () => {
    const myToken = createToken({ factory: () => ({ value: 42 }) });

    expect(myToken).toBeInstanceOf(InjectionToken);
    expect(myToken.factory?.()).toEqual({ value: 42 });
  });

  it('creates a token without a factory', () => {
    const myToken = createToken<{ value: number }>();

    expect(myToken.factory).toBeUndefined();
  });

  it('carries an optional name for diagnostics', () => {
    const named = createToken({ name: 'Clock', factory: () => 'tick' });
    const anonymous = createToken({ factory: () => 'tick' });

    expect(named.name).toBe('Clock');
    expect(anonymous.name).toBeUndefined();
  });

  // Regression: the name replaces the old positional `id`, which read like an
  // identity but never participated in lookup.
  it('identifies tokens by reference, never by name', () => {
    const a = createToken({ name: 'shared', factory: () => 'a' });
    const b = createToken({ name: 'shared', factory: () => 'b' });

    const injector = createInjector();

    expect(a).not.toBe(b);
    expect(injector.get(a)).toBe('a');
    expect(injector.get(b)).toBe('b');
  });

  it('stringifies to something readable', () => {
    expect(String(createToken({ name: 'Clock' }))).toContain('Clock');
    expect(String(createToken())).not.toContain('[object Object]');
  });
});
