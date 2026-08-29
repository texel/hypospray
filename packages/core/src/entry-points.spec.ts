import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('the node entry point', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('installs nothing merely by being imported', async () => {
    const { getContextStrategy } = await import('./index.node.js');

    expect(getContextStrategy().name).toBe('sync');
  });

  it('installs the AsyncLocalStorage strategy when an injector is created', async () => {
    const { createInjector, getContextStrategy, nodeContextStrategy } =
      await import('./index.node.js');

    createInjector();

    expect(getContextStrategy()).toBe(nodeContextStrategy());
    expect(getContextStrategy().name).toBe('async-local-storage');
  });

  it('reuses one store across injectors', async () => {
    const { createInjector, nodeContextStrategy } = await import('./index.node.js');
    const first = nodeContextStrategy();

    createInjector();
    createInjector();

    expect(nodeContextStrategy()).toBe(first);
  });

  it('does not override a strategy chosen explicitly', async () => {
    const { createInjector, createSyncContextStrategy, getContextStrategy, setContextStrategy } =
      await import('./index.node.js');
    const chosen = createSyncContextStrategy();
    setContextStrategy(chosen);

    createInjector();

    expect(getContextStrategy()).toBe(chosen);
  });

  it('lets an injector option choose the strategy', async () => {
    const { createInjector, createSyncContextStrategy, getContextStrategy } =
      await import('./index.node.js');
    const chosen = createSyncContextStrategy();

    createInjector({ context: chosen });

    expect(getContextStrategy()).toBe(chosen);
  });
});
