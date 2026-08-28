import type { Injector } from './injector.js';
import type { ProviderToken } from './tokens.js';

/**
 * Internal state associated with a dependency-resolution flow.
 *
 * Context strategies carry this state between calls. Framework integrations
 * may implement a strategy, but application code generally should not use
 * this type directly.
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
 * Stores and restores resolution context for a particular runtime.
 *
 * Runtime integrations can implement this interface using facilities such as
 * Node's `AsyncLocalStorage` or a framework's context API.
 */
export interface ContextStrategy {
  /** Identifies the strategy in diagnostics. */
  readonly name?: string;

  /**
   * Whether the strategy preserves context across `await`.
   *
   * Leave undefined when this is unknown. A value of `false` enables more
   * specific diagnostics for injection attempted after an `await`.
   */
  readonly preservesAsyncContext?: boolean;

  /** The context for the current flow, or `null` outside any. */
  get(): ResolutionContext | null;

  /** Runs `fn` with `context` and restores the previous context, even if `fn` throws. */
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
    name: 'sync',
    preservesAsyncContext: false,

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

/** Returns the strategy currently used to carry resolution context. */
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
