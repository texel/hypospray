import type { InjectOptions, Injector } from './injector.js';
import { createToken } from './tokens.js';
import type { ProviderToken } from './tokens.js';

function notImplemented(what: string): never {
  throw new Error(`Not implemented: ${what}`);
}


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
export function inject<T>(
  token: ProviderToken<T>,
  options?: InjectOptions,
): T;
export function inject<T>(
  _token: ProviderToken<T>,
  _options?: InjectOptions,
): T | undefined {
  notImplemented('inject');
}

/**
 * The injector for the current execution context.
 *
 * Ambient state is per-flow, not per-module: concurrent async flows each see
 * the injector they were started under.
 */
export function getCurrentInjector(
  options: InjectOptions & { optional: true },
): Injector | null;
export function getCurrentInjector(options?: InjectOptions): Injector;
export function getCurrentInjector(
  _options?: InjectOptions,
): Injector | null {
  notImplemented('getCurrentInjector');
}

/**
 * Sets the ambient injector directly. Prefer `Injector.invoke()` — this exists
 * for tests and for framework adapters that own their own context lifetime.
 */
export function setCurrentInjector(_injector: Injector | null): void {
  notImplemented('setCurrentInjector');
}

/**
 * Resolves to the injector that is resolving it.
 */
export const CURRENT_INJECTOR = createToken<Injector>({
  name: 'CURRENT_INJECTOR',
  factory: () => getCurrentInjector(),
});
