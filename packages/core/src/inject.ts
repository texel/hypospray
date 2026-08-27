import { enterContext, getContext } from './context.js';
import { CURRENT_INJECTOR } from './current-injector.js';
import { NoInjectorError } from './errors.js';
import type { InjectOptions, Injector } from './injector.js';
import type { ProviderToken } from './tokens.js';

export { CURRENT_INJECTOR };

/**
 * Resolves a dependency from the ambient injector.
 *
 * Intended to be called in a default parameter position, which is what lets a
 * plain function declare its own dependencies:
 *
 * ```ts
 * const createUserService = (db = inject(createDb)) => ({ ... });
 * ```
 */
export function inject<T>(
  token: ProviderToken<T>,
  options: InjectOptions & { optional: true },
): T | undefined;
export function inject<T>(token: ProviderToken<T>, options?: InjectOptions): T;
export function inject<T>(token: ProviderToken<T>, options?: InjectOptions): T | undefined {
  return getCurrentInjector().get(token, options as InjectOptions);
}

/**
 * The injector for the current execution context.
 *
 * Ambient state is per-flow rather than per-module, so concurrent async flows
 * each see the injector they were started under.
 */
export function getCurrentInjector(options: InjectOptions & { optional: true }): Injector | null;
export function getCurrentInjector(options?: InjectOptions): Injector;
export function getCurrentInjector(options?: InjectOptions): Injector | null {
  const injector = getContext()?.injector ?? null;

  if (!injector && !options?.optional) {
    throw new NoInjectorError(
      'No injector is active. inject() must be called while an injector is resolving, or inside Injector.invoke().',
    );
  }

  return injector;
}

/**
 * Sets the ambient injector for the rest of the current flow, with no matching
 * restore. Prefer `Injector.invoke()` — this exists for tests and for
 * framework adapters that own their own context lifetime.
 */
export function setCurrentInjector(injector: Injector | null): void {
  enterContext(injector ? { injector, stack: [] } : null);
}
