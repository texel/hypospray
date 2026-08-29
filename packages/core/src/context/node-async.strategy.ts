import { AsyncLocalStorage } from 'node:async_hooks';

import type { ResolutionContext } from '../context.js';
import type { ContextStrategy } from './strategy.js';

/**
 * Carries context across `await` boundaries, so concurrent flows on one
 * process each keep their own injector.
 *
 * This is the only module in the package that needs a Node-like runtime, which
 * is why it is reached solely through the `node` export condition. Deno, Bun
 * and workerd all provide `node:async_hooks`.
 */
export function createAsyncLocalStorageContextStrategy(): ContextStrategy {
  const storage = new AsyncLocalStorage<ResolutionContext | null>();

  return {
    name: 'async-local-storage',
    preservesAsyncContext: true,

    get: () => storage.getStore() ?? null,
    run: (context, fn) => storage.run(context, fn),
  };
}
