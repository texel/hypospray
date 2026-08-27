import type { Injector } from './injector.js';
import type { ProviderToken } from './tokens.js';

/**
 * The state of one resolution flow. From the perspective of the calling code,
 * this is "global", but we can't represent it as a module-level variable,
 * since that would cause problems with concurrent flows (e.g. two requests
 * running at the same time).
 */
export interface ResolutionContext {
  /**
   * The injector currently being used to resolve dependencies
   */
  readonly injector: Injector;

  /**
   * The chain of dependencies currently being resolved innermost last.
   * We use this for, among other things, tracking of circular dependencies.
   */
  readonly stack: Array<ProviderToken<unknown>>;
}

/**
 * How resolution context is carried across a call.
 *
 * Different runtimes have different mechanisms for carrying per-flow (or per-request) context.
 * Node has `AsyncLocalStorage`, Svelte has `setContext`, React has providers - so core
 * defines the shape and lets the environment supply the mechanism.
 */
export interface ContextStrategy {
  /** The context for the current flow, or `null` outside any. */
  get(): ResolutionContext | null;

  /**
   * Runs `fn` with `context`, restoring the previous one afterwards.
   * It's **very** important for the previous context to be restored
   * if `fn` throws.
   */
  run<T>(context: ResolutionContext | null, fn: () => T): T;

  /** Sets the context for the rest of the current flow, with no restore. */
  enter(context: ResolutionContext | null): void;
}

/**
 * Holds context in a plain variable. Correct in any runtime where multiple concurrent flows with
 * different injectors can't run at the same time.
 *
 * It cannot distinguish concurrent async flows: an `inject()` after an `await`
 * sees whatever is ambient at that moment, which on a server is another
 * request's injector or nothing at all. Servers should use an async-aware
 * strategy — {@link createAsyncLocalStorageContextStrategy}, which the `node`
 * export condition installs automatically.
 */
export function createSyncContextStrategy(): ContextStrategy {
  let current: ResolutionContext | null = null;

  return {
    get: () => current,

    run(context, fn) {
      const previous = current;
      current = context;

      try {
        return fn();
      } finally {
        current = previous;
      }
    },

    enter(context) {
      current = context;
    },
  };
}

let strategy: ContextStrategy = createSyncContextStrategy();

/**
 * Replaces the mechanism used to carry ambient context.
 *
 * Call once, before any injector resolves. Framework adapters use this to hand
 * hypospray the host's own context mechanism.
 */
export function setContextStrategy(next: ContextStrategy): void {
  strategy = next;
}

export function getContextStrategy(): ContextStrategy {
  return strategy;
}

export function getContext(): ResolutionContext | null {
  return strategy.get();
}

export function runInContext<T>(context: ResolutionContext | null, fn: () => T): T {
  return strategy.run(context, fn);
}

export function enterContext(context: ResolutionContext | null): void {
  strategy.enter(context);
}
