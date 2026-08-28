import { describe, expect, it } from 'vitest';

import {
  createInjector,
  createSyncContextStrategy,
  getContextStrategy,
  nodeContextStrategy,
  setContextStrategy,
} from './index.node.js';

// These assertions are about module-level state, so they depend on running in
// declaration order within this file: the first one must observe the strategy
// before anything in the suite has created an injector. Vitest runs tests in
// declaration order, and each file gets a fresh module registry.
describe('the node entry point', () => {
  it('installs nothing merely by being imported', () => {
    // The import above is the whole setup. If loading the module had a side
    // effect, the strategy would already be AsyncLocalStorage-backed.
    expect(getContextStrategy().name).toBe('sync');
  });

  it('installs the AsyncLocalStorage strategy when an injector is created', () => {
    createInjector();

    expect(getContextStrategy()).toBe(nodeContextStrategy());
    expect(getContextStrategy().name).toBe('async-local-storage');
  });

  it('reuses one store across injectors', () => {
    const first = nodeContextStrategy();

    createInjector();
    createInjector();

    expect(nodeContextStrategy()).toBe(first);
  });

  it('does not override a strategy chosen explicitly', () => {
    const chosen = createSyncContextStrategy();
    setContextStrategy(chosen);

    createInjector();

    expect(getContextStrategy()).toBe(chosen);
  });

  it('lets an injector option choose the strategy', () => {
    const chosen = createSyncContextStrategy();

    createInjector({ context: chosen });

    expect(getContextStrategy()).toBe(chosen);
  });
});
