import { setFallbackContextStrategy } from './context.js';
import { createAsyncLocalStorageContextStrategy } from './context/node-async.strategy.js';
/**
 * Node entry point, selected by the `node` export condition.
 *
 * Identical to the default entry except that `createInjector` installs the
 * AsyncLocalStorage-backed context strategy, so `inject()` keeps working
 * across `await` boundaries and concurrent requests stay isolated.
 *
 * Installing happens when an injector is created rather than when this module
 * is imported: importing a module has no observable effect, but a server that
 * forgot to opt in would silently share one injector between requests, so the
 * default rides along with the call every application already makes.
 * `setContextStrategy` and `createInjector({ context })` both outrank it.
 */
import type { ContextStrategy } from './context/strategy.js';
import { Injector, createInjector as createBaseInjector } from './injector.js';
import type { InjectorOptions } from './injector.js';

let strategy: ContextStrategy | undefined;

/**
 * Returns a memoized instance of the AsyncLocalStorage context strategy.
 *
 * A second AsyncLocalStorage would not see contexts
 * entered through the first, so repeated `createInjector` calls must share it.
 */
export function nodeContextStrategy(): ContextStrategy {
  strategy ??= createAsyncLocalStorageContextStrategy();
  return strategy;
}

/** Creates an injector, defaulting ambient context to AsyncLocalStorage. */
export function createInjector(options?: InjectorOptions): Injector {
  setFallbackContextStrategy(nodeContextStrategy());
  return createBaseInjector(options);
}

export { createAsyncLocalStorageContextStrategy };
export * from './index.js';
