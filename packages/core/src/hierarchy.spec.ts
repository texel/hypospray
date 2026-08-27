import { describe, expect, it, vi } from 'vitest';

import { createInjector, extendProvider, inject, provide, provideValue } from './index.js';

describe('hierarchical injectors', () => {
  it('resolves a parent-provided value from a child', () => {
    class Config {
      url = 'https://example.com';
    }

    const parent = createInjector({ providers: [Config] });
    const child = parent.createChild();

    expect(child.get(Config)).toBeInstanceOf(Config);
    expect(child.get(Config)).toBe(parent.get(Config));
  });

  it('lets a child override a parent provider', () => {
    function getValue() {
      return 42;
    }

    const parent = createInjector();
    const child = parent.createChild({
      providers: [provide(getValue, { factory: () => 43 })],
    });

    expect(parent.get(getValue)).toEqual(42);
    expect(child.get(getValue)).toEqual(43);
  });

  it('does not let a child override leak into the parent', () => {
    const getEnvironment = () => 'production';

    const parent = createInjector();
    const child = parent.createChild({
      providers: [provideValue(getEnvironment, 'test')],
    });

    expect(child.get(getEnvironment)).toBe('test');
    expect(parent.get(getEnvironment)).toBe('production');
  });

  it('does not re-run a parent factory when resolved from a child', () => {
    const connectToDatabase = vi.fn(() => ({ id: Math.random() }));

    const parent = createInjector();
    const child = parent.createChild();

    expect(parent.get(connectToDatabase)).toBe(child.get(connectToDatabase));
    expect(connectToDatabase).toHaveBeenCalledTimes(1);
  });

  // Regression: the parent lookup checked `if (value)`, so a parent that
  // resolved a falsy value looked like a miss and the child built
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
      const getSetting = vi.fn(() => value);

      const parent = createInjector({ providers: [getSetting] });
      const child = parent.createChild();

      expect(child.get(getSetting)).toBe(value);
      expect(parent.get(getSetting)).toBe(value);
      expect(getSetting).toHaveBeenCalledTimes(1);
    },
  );

  // A provider resolves in the injector that owns it, not in whichever one
  // asked. Without this, a root-registered singleton would be rebuilt for
  // every child that resolved it, and could see per-request overrides.
  it('resolves a parent-owned provider against the parent, not the caller', () => {
    const getDatabaseUrl = () => 'postgres://primary';

    class Repository {
      url: string;

      constructor(url = inject(getDatabaseUrl)) {
        this.url = url;
      }
    }

    const parent = createInjector({ providers: [getDatabaseUrl, Repository] });
    const child = parent.createChild({
      providers: [provideValue(getDatabaseUrl, 'postgres://replica')],
    });

    const repository = child.get(Repository);

    expect(repository.url).toBe('postgres://primary');
    expect(repository).toBe(parent.get(Repository));
  });

  it('resolves implicit tokens once, at the root', () => {
    const createEventBus = vi.fn(() => ({ listeners: [] }));

    const root = createInjector();
    const childA = root.createChild();
    const childB = root.createChild();

    const eventBus = root.get(createEventBus);

    expect(childA.get(createEventBus)).toBe(eventBus);
    expect(childB.get(createEventBus)).toBe(eventBus);
    expect(createEventBus).toHaveBeenCalledTimes(1);
  });

  describe('extendProvider across injectors', () => {
    // getOrCreateProvider only consulted its own injector, so
    // extending in a child silently discarded the parent's contributions —
    // exactly the accumulation case extendProvider exists for.
    it('builds on the value contributed by the parent', { tags: ['regression'] }, () => {
      const getMiddleware = (): string[] => [];

      const parent = createInjector();
      parent.addProviders(extendProvider(getMiddleware, (m) => [...m, 'logging']));

      const child = parent.createChild({
        providers: [extendProvider(getMiddleware, (m) => [...m, 'auth'])],
      });

      expect(child.get(getMiddleware)).toEqual(['logging', 'auth']);
    });

    it('does not let a child extension modify the parent value', () => {
      const getMiddleware = (): string[] => [];

      const parent = createInjector();
      parent.addProviders(extendProvider(getMiddleware, (m) => [...m, 'logging']));

      const child = parent.createChild({
        providers: [extendProvider(getMiddleware, (m) => [...m, 'auth'])],
      });

      expect(child.get(getMiddleware)).toEqual(['logging', 'auth']);
      expect(parent.get(getMiddleware)).toEqual(['logging']);
    });

    it('keeps sibling extensions isolated from one another', () => {
      const getMiddleware = (): string[] => [];

      const parent = createInjector();
      parent.addProviders(extendProvider(getMiddleware, (m) => [...m, 'logging']));

      const a = parent.createChild({
        providers: [extendProvider(getMiddleware, (m) => [...m, 'auth'])],
      });
      const b = parent.createChild({
        providers: [extendProvider(getMiddleware, (m) => [...m, 'metrics'])],
      });

      expect(a.get(getMiddleware)).toEqual(['logging', 'auth']);
      expect(b.get(getMiddleware)).toEqual(['logging', 'metrics']);
    });
  });
});
