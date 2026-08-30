import type { ResolutionContext } from '../context.js';

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

  /** The context for the current execution, or `null` when none is active. */
  get(): ResolutionContext | null;

  /** Runs `fn` with `context` and restores the previous context, even if `fn` throws. */
  run<T>(context: ResolutionContext | null, fn: () => T): T;
}
