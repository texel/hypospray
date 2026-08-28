import { enterContext, getContext, getContextStrategy } from './context.js';
import { CURRENT_INJECTOR } from './current-injector.js';
import { NoInjectorError } from './errors.js';
import type { Injector, ResolveOptions } from './injector.js';
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
  options: ResolveOptions & { optional: true },
): T | undefined;
export function inject<T>(token: ProviderToken<T>, options?: ResolveOptions): T;
export function inject<T>(token: ProviderToken<T>, options?: ResolveOptions): T | undefined {
  return getCurrentInjector().get(token, options);
}

/**
 * The injector for the current execution context.
 *
 * Ambient state is per-flow rather than per-module, so concurrent async flows
 * each see the injector they were started under.
 */
export function getCurrentInjector(options: ResolveOptions & { optional: true }): Injector | null;
export function getCurrentInjector(options?: ResolveOptions): Injector;
export function getCurrentInjector(options?: ResolveOptions): Injector | null {
  const injector = getContext()?.injector ?? null;

  if (!injector && !options?.optional) {
    throw new NoInjectorError(noInjectorMessage());
  }

  return injector;
}

/**
 * Builds an error message for injection outside an active context, with
 * additional guidance when the current strategy does not support `await`.
 */
function noInjectorMessage(): string {
  const strategy = getContextStrategy();

  const base =
    'inject() must be called from an injection context: while a provider is being resolved, or inside the function passed to Injector.run().';

  if (strategy.preservesAsyncContext !== false) {
    return base;
  }

  return [
    base,
    '',
    `The installed context strategy (${strategy.name ?? 'unknown'}) does not carry an injection context across an \`await\`. It restores the previous context as soon as the function passed to run() returns — and an async function returns at its first \`await\`, not at its end. An inject() after an await is therefore outside the context, even though it sits inside run() lexically.`,
    '',
    'If that is what happened here:',
    '  - Capture the injector before awaiting: `const injector = getCurrentInjector()`, then `injector.get(token)` after.',
    '  - Or inject a promise rather than a value and await it at the use site, so every inject() runs before the first suspension.',
    '  - Or install an async-aware strategy. Importing from the package `node` export condition does this, and is the only one shipped today.',
  ].join('\n');
}

/**
 * Sets the ambient injector for the rest of the current flow, with no matching
 * restore. Prefer `Injector.run()` — this exists for tests and for
 * framework adapters that own their own context lifetime.
 */
export function setCurrentInjector(injector: Injector | null): void {
  enterContext(injector ? { injector, stack: [] } : null);
}
