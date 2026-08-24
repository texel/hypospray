import type { InjectOptions, Injector } from './injector.js';
import { createToken } from './tokens.js';
import type { ProviderToken } from './tokens.js';

// FIXME: This implementation isn't async-safe for node etc.
// We need to use AsyncLocalStorage or similar to make this work with async/await and promises.
// For now, this is just a placeholder.
let currentInjector: Injector | null = null;

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
export function inject<T>(_token: ProviderToken<T>, _options?: InjectOptions): T | undefined {
  return currentInjector?.get(_token, _options);
}

/**
 * The injector for the current execution context.
 *
 * Instead of setting this in a global variable, we need to use a context mechanism that works with async/await and promises.
 * This is typically done using AsyncLocalStorage in Node.js or similar mechanisms in other environments.
 */
export function getCurrentInjector(options: InjectOptions & { optional: true }): Injector | null;
export function getCurrentInjector(options?: InjectOptions): Injector;
export function getCurrentInjector(_options?: InjectOptions): Injector | null {
  return currentInjector;
}

/**
 * Sets the ambient injector directly. Prefer `Injector.invoke()` — this exists
 * for tests and for framework adapters that own their own context lifetime.
 */
export function setCurrentInjector(injector: Injector | null): void {
  currentInjector = injector;
}

/**
 * Resolves to the injector that is resolving it.
 */
export const CURRENT_INJECTOR = createToken<Injector>({
  name: 'CURRENT_INJECTOR',
  factory: () => getCurrentInjector(),
});
