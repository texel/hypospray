import type { ResolutionContext } from '../context.js';
import { ConcurrentContextError } from '../errors.js';
import { isThenable } from '../helpers.js';
import type { ContextStrategy } from './strategy.js';

/**
 * Holds context in a plain variable and restores it when the function passed
 * to `run()` returns. This is suitable when all context-dependent work finishes
 * synchronously.
 *
 * This strategy cannot carry context across an `await` or isolate overlapping
 * async runs. An `inject()` after an `await` therefore has no injector context.
 * Servers should use {@link createAsyncLocalStorageContextStrategy}, which the
 * `node` entry point's `createInjector` installs. Browsers do not generally
 * provide an equivalent mechanism, so transparent async context requires a
 * framework integration or interception of async APIs, as in Zone.js.
 *
 * By default, the strategy detects one sign of unsupported concurrency: a run
 * starts with one injector while another injector's promise is still pending.
 * When that happens, it throws {@link ConcurrentContextError}. Set `strict` to
 * `false` to allow such runs without reporting them.
 *
 * @example Resolve dependencies synchronously
 * ```ts
 * injector.run(() => {
 *   const client = inject(ApiClient);
 *   client.connect();
 * });
 * ```
 *
 * @example Do not inject after an async boundary
 * ```ts
 * await injector.run(async () => {
 *   await loadConfiguration();
 *
 *   const client = inject(ApiClient); // Error! No injector context is available here.
 * });
 * ```
 *
 * @example Instead, use `get()` from the injector itself
 * ```ts
 * await injector.run(async () => {
 *   // Before the await boundary, `inject()` works
 *   const options = inject(getOptions);

 *   await loadConfiguration(options);
 *
 *   // After the `await`, we're no longer in an injector context, but we still have
 *   // a reference to the injector, so `get()` works
 *   const client = injector.get(ApiClient); // Error! No injector context is available here.
 * });

 */
export function createSyncContextStrategy(
  options: SyncContextStrategyOptions = {},
): ContextStrategy {
  const strict = options.strict ?? true;

  let current: ResolutionContext | null = null;

  const pendingAsyncRuns = new Set<ResolutionContext>();

  const hasOverlappingRun = (context: ResolutionContext | null): boolean => {
    if (!strict || !context?.isInjectorRun) {
      return false;
    }

    for (const pending of pendingAsyncRuns) {
      if (pending.injector !== context.injector) {
        return true;
      }
    }

    return false;
  };

  return {
    name: 'sync',
    preservesAsyncContext: false,

    get: () => current,

    run(context, fn) {
      if (hasOverlappingRun(context)) {
        throw new ConcurrentContextError(
          [
            'Cannot start Injector.run(): async work started by another injector is still pending.',
            '',
            'The sync context strategy supports inject() only before the first `await`. It cannot provide ambient injection to overlapping async work.',
            '',
            'If inject() is needed after an `await`, configure an async-aware context strategy. Node runtimes use AsyncLocalStorage automatically; other hosts can pass a strategy with `createInjector({ context })`.',
            '',
            'If neither run uses inject() after an `await`, resolve dependencies before awaiting or use `injector.get()` explicitly afterward. In that case, disable this check with `createSyncContextStrategy({ strict: false })`.',
          ].join('\n'),
        );
      }

      const previous = current;
      current = context;

      try {
        const result = fn();

        // Only contexts created by Injector.run() are tracked for overlap.
        // Provider factories use the same context machinery, but their
        // promises are values to resolve rather than independent runs.
        if (context?.isInjectorRun && isThenable(result)) {
          pendingAsyncRuns.add(context);

          const settle = (): void => {
            pendingAsyncRuns.delete(context);
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
  };
}

export interface SyncContextStrategyOptions {
  /**
   * Throw when one injector starts a run while another injector's async run is
   * still pending.
   *
   * On by default. Turning it off permits overlapping runs, preserving the
   * behaviour from before overlap detection was added.
   */
  strict?: boolean;
}
