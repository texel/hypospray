import { ConcurrentContextError } from './errors.js';
import { isThenable } from './helpers.js';
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

  /**
   * Whether this context begins an ambient flow, as `Injector.run()` does.
   *
   * Provider resolution reuses the same plumbing to make an injector current
   * while a factory executes, but that is bookkeeping inside a call, not a
   * flow a strategy has to keep apart from its neighbours. Only flows are
   * tracked for interleaving.
   */
  readonly flow?: boolean;
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

export interface SyncContextStrategyOptions {
  /**
   * Throw when a second flow enters while an earlier one is still suspended.
   *
   * On by default. Turning it off restores last-writer-wins, where the second
   * flow silently takes over the ambient context.
   */
  strict?: boolean;
}

/**
 * Holds context in a plain variable. Correct in any runtime where multiple concurrent flows with
 * different injectors can't run at the same time.
 *
 * It cannot distinguish concurrent async flows: an `inject()` after an `await`
 * sees whatever is ambient at that moment, which on a server is another
 * request's injector or nothing at all. Servers should use an async-aware
 * strategy — {@link createAsyncLocalStorageContextStrategy}, which the `node`
 * entry point's `createInjector` installs.
 *
 * Because that mistake is otherwise silent, this strategy watches for it. A
 * `run()` whose function returns a promise has escaped the synchronous window
 * this strategy can account for; if another injector enters while such a flow
 * is still pending, the two have interleaved and the ambient context is no
 * longer trustworthy. In `strict` mode — the default — that throws
 * {@link ConcurrentContextError} rather than resolving from whichever injector
 * happens to be current.
 */
export function createSyncContextStrategy(
  options: SyncContextStrategyOptions = {},
): ContextStrategy {
  const strict = options.strict ?? true;

  let current: ResolutionContext | null = null;

  // Contexts whose run() returned a promise and has not settled. Held as a set
  // rather than a count so the error can name the injector already in flight.
  const suspended = new Set<ResolutionContext>();

  const conflicting = (context: ResolutionContext | null): ResolutionContext | null => {
    if (!strict || !context?.flow) {
      return null;
    }

    for (const pending of suspended) {
      if (pending.injector !== context.injector) {
        return pending;
      }
    }

    return null;
  };

  return {
    name: 'sync',
    preservesAsyncContext: false,

    get: () => current,

    run(context, fn) {
      if (conflicting(context)) {
        throw new ConcurrentContextError(
          [
            'Two injectors are active at once under the sync context strategy, which keeps a single ambient context and cannot tell concurrent flows apart.',
            '',
            "An earlier run() was handed an async function. That function returned at its first `await`, leaving its flow suspended while this run() begins — so whichever finishes an `await` next would read the other flow's injector.",
            '',
            'Install a strategy that carries context across `await`:',
            '  - On Node, Deno, Bun or workerd, import createInjector from the package `node` export condition.',
            '  - In a host with its own context mechanism, implement ContextStrategy and pass it as `createInjector({ context })`.',
            '',
            'If the flows genuinely cannot interleave, `createSyncContextStrategy({ strict: false })` restores the previous last-writer-wins behaviour.',
          ].join('\n'),
        );
      }

      const previous = current;
      current = context;

      try {
        const result = fn();

        // A promise means the flow outlives this call. Track it until it
        // settles so an overlapping run() can be reported instead of silently
        // reading the wrong injector.
        if (context?.flow && isThenable(result)) {
          suspended.add(context);

          const settle = (): void => {
            suspended.delete(context);
          };

          // Both handlers, so a rejection also clears the entry. This attaches
          // to a promise the caller still owns and awaits; the derived promise
          // is discarded.
          result.then(settle, settle);
        }

        return result;
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

// Whether the strategy above was chosen deliberately rather than defaulted
// into. An explicit choice outranks any entry point's default, however late
// that default arrives.
let strategyIsExplicit = false;

/**
 * Replaces the mechanism used to carry ambient context.
 *
 * Call once, before any injector resolves. Framework adapters use this to hand
 * hypospray the host's own context mechanism. The choice is final: entry point
 * defaults will not overwrite it.
 */
export function setContextStrategy(next: ContextStrategy): void {
  strategy = next;
  strategyIsExplicit = true;
}

/**
 * Installs `next` only if no strategy has been chosen explicitly.
 *
 * Entry points use this to supply a runtime-appropriate default at the moment
 * an injector is created, rather than as a side effect of being imported. A
 * host that has already called {@link setContextStrategy}, or an injector
 * created with a `context` option, keeps what it chose.
 */
export function setDefaultContextStrategy(next: ContextStrategy): void {
  if (strategyIsExplicit) {
    return;
  }

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
