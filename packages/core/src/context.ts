import type { ContextStrategy } from './context/strategy.js';
import { createSyncContextStrategy } from './context/sync.strategy.js';
import type { Injector } from './injector.js';
import type { ProviderToken } from './tokens.js';

/**
 * Internal state carried by the ambient injection context.
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

  /** Whether this context was created by `Injector.run()`. */
  readonly isInjectorRun?: boolean;
}

let fallbackStrategy: ContextStrategy = createSyncContextStrategy();
let configuredStrategy: ContextStrategy | undefined;

/**
 * Replaces the mechanism used to carry ambient context.
 *
 * Call once, before any injector resolves. Framework adapters use this to hand
 * hypospray the host's own context mechanism. The choice is final: entry point
 * defaults will not overwrite it.
 */
export function setContextStrategy(next: ContextStrategy): void {
  configuredStrategy = next;
}

/**
 * Replaces the strategy used when none has been configured explicitly.
 *
 * Entry points use this to supply a runtime-appropriate fallback when an
 * injector is created, rather than as a side effect of being imported.
 */
export function setFallbackContextStrategy(next: ContextStrategy): void {
  fallbackStrategy = next;
}

/** Returns the strategy currently used to carry resolution context. */
export function getContextStrategy(): ContextStrategy {
  return configuredStrategy ?? fallbackStrategy;
}

export function getContext(): ResolutionContext | null {
  return getContextStrategy().get();
}

export function runInContext<T>(context: ResolutionContext | null, fn: () => T): T {
  return getContextStrategy().run(context, fn);
}
