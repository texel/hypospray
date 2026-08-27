/**
 * Node entry point, selected by the `node` export condition.
 *
 * Identical to the default entry except that it installs the
 * AsyncLocalStorage-backed context strategy, so `inject()` keeps working
 * across `await` boundaries and concurrent requests stay isolated.
 *
 * Installing on import is deliberate — a server that forgot to opt in would
 * silently share one injector between requests. `setContextStrategy` still
 * overrides it if a host has its own mechanism.
 */
import { createAsyncLocalStorageContextStrategy } from './context-async-hooks.js';
import { setContextStrategy } from './context.js';

setContextStrategy(createAsyncLocalStorageContextStrategy());

export { createAsyncLocalStorageContextStrategy };
export * from './index.js';
