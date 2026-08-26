import { describe, expect, it, vi } from 'vitest';

import { createInjector, createToken, extendProvider, provide, provideValue } from './index.js';

describe('hierarchical injectors', () => {
  it('resolves a parent-provided value from a child', () => {
    const token = createToken<object>();
    const providedValue = {};

    const parent = createInjector({
      providers: [provideValue(token, providedValue)],
    });

    expect(parent.createChild().get(token)).toBe(providedValue);
  });

  it('lets a child override a parent provider', () => {
    const token = createToken({ factory: () => ({ value: 42 }) });

    const parent = createInjector();
    const child = parent.createChild({
      providers: [provide(token, { factory: () => ({ value: 43 }) })],
    });

    expect(parent.get(token)).toEqual({ value: 42 });
    expect(child.get(token)).toEqual({ value: 43 });
  });

  it('does not let a child override leak into the parent', () => {
    const token = createToken({ factory: () => 'parent' });

    const parent = createInjector();
    const child = parent.createChild({
      providers: [provideValue(token, 'child')],
    });

    expect(child.get(token)).toBe('child');
    expect(parent.get(token)).toBe('parent');
  });

  it('does not re-run a parent factory when resolved from a child', () => {
    const makeService = vi.fn(() => `service-${Math.random()}`);

    const parent = createInjector();
    const child = parent.createChild();

    expect(parent.get(makeService)).toBe(child.get(makeService));
    expect(makeService).toHaveBeenCalledTimes(1);
  });

  // the parent lookup checked `if (value)`, so a parent that
  // legitimately resolved a falsy value looked like a miss and the child built
  // its own copy.
  it.each([
    ['zero', 0],
    ['false', false],
    ['empty string', ''],
    ['null', null],
  ] as const)(
    'shares a parent-resolved %s rather than rebuilding it',
    { tags: ['regression'] },
    (_label, value) => {
      const factory = vi.fn(() => value);
      const token = createToken<typeof value>({ factory });

      const parent = createInjector({ providers: [provide(token, { factory })] });
      const child = parent.createChild();

      expect(child.get(token)).toBe(value);
      expect(parent.get(token)).toBe(value);
      expect(factory).toHaveBeenCalledTimes(1);
    },
  );

  it('resolves implicit tokens once, at the root', () => {
    const makeService = vi.fn(() => ({}));

    const root = createInjector();
    const childA = root.createChild();
    const childB = root.createChild();

    expect(childA.get(makeService)).toBe(childB.get(makeService));
    expect(makeService).toHaveBeenCalledTimes(1);
  });

  describe('extendProvider across injectors', () => {
    // getOrCreateProvider only consulted its own injector, so
    // extending in a child silently discarded the parent's contributions —
    // exactly the accumulation case extendProvider exists for.
    it('builds on the value contributed by the parent', { tags: ['regression'] }, () => {
      const getWidgets = (): string[] => [];

      const parent = createInjector();
      parent.addProviders(extendProvider(getWidgets, (w) => [...w, 'parent']));

      const child = parent.createChild({
        providers: [extendProvider(getWidgets, (w) => [...w, 'child'])],
      });

      expect(child.get(getWidgets)).toEqual(['parent', 'child']);
    });

    it('does not let a child extension modify the parent value', () => {
      const getWidgets = (): string[] => [];

      const parent = createInjector();
      parent.addProviders(extendProvider(getWidgets, (w) => [...w, 'parent']));

      const child = parent.createChild({
        providers: [extendProvider(getWidgets, (w) => [...w, 'child'])],
      });

      expect(child.get(getWidgets)).toEqual(['parent', 'child']);
      expect(parent.get(getWidgets)).toEqual(['parent']);
    });

    it('keeps sibling extensions isolated from one another', () => {
      const getWidgets = (): string[] => [];

      const parent = createInjector();
      parent.addProviders(extendProvider(getWidgets, (w) => [...w, 'parent']));

      const a = parent.createChild({
        providers: [extendProvider(getWidgets, (w) => [...w, 'a'])],
      });
      const b = parent.createChild({
        providers: [extendProvider(getWidgets, (w) => [...w, 'b'])],
      });

      expect(a.get(getWidgets)).toEqual(['parent', 'a']);
      expect(b.get(getWidgets)).toEqual(['parent', 'b']);
    });
  });
});
