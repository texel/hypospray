import { debugToken, warnIfNoDefaultArgs } from './debug.js';
import { NoProviderError } from './errors.js';
import { isClass, type FunctionSignature } from './helpers.js';
import { inject } from './inject.js';
import type { Logger } from './injector.js';
import { InjectionToken, type ProviderToken } from './tokens.js';

/**
 * Produces a dependency. Providers take no arguments — the "extend" case has
 * its own declaration shape so the accumulator never leaks into this signature.
 */
export type Provider<T> = () => T;

/**
 * Receives the previously-registered value for a token and returns its
 * replacement.
 */
export type ExtendFn<T> = (previous: T) => T;

export interface ReplaceDeclaration<T> {
  readonly token: ProviderToken<T>;
  readonly provider: Provider<T>;
}

export interface ExtendDeclaration<T> {
  readonly token: ProviderToken<T>;
  readonly extend: ExtendFn<T>;
}

/**
 * Associates a token with the provider that satisfies it.
 *
 * The two arms carry their function in differently-named properties rather
 * than sharing `provider` with a boolean flag. A zero-argument `Provider<T>`
 * is assignable to a one-argument `ExtendFn<T>`, so a shared property could
 * never tell them apart — `'extend' in declaration` can.
 */
export type ProviderDeclaration<T> = ReplaceDeclaration<T> | ExtendDeclaration<T>;

export type ProviderArray = ReadonlyArray<ProviderToken<any> | ProviderDeclaration<any>>;

/**
 * Exactly one of these may be given. The `never` members stop an object
 * literal from satisfying the union by mixing two of them.
 */
export type ProvideOptions<T> =
  | { factory: Provider<T>; value?: never; existing?: never }
  | { value: T; factory?: never; existing?: never }
  | { existing: ProviderToken<T>; factory?: never; value?: never };

/**
 * Declares how a token should be satisfied. With no options, the token
 * provides itself.
 *
 * `ProviderToken<T>` is covariant, so `existing` and `value` already accept
 * any subtype of `T` without a second type parameter.
 */
export function provide<T>(
  token: ProviderToken<T>,
  options?: ProvideOptions<T>,
): ReplaceDeclaration<T> {
  return { token, provider: toValueProvider(token, options) };
}

function toValueProvider<T>(
  token: ProviderToken<T>,
  options: ProvideOptions<T> | undefined,
): Provider<T> {
  if (options) {
    // The union's `never` members make each branch unreachable to narrowing,
    // so widen once here rather than casting at every access.
    const given = options as {
      factory?: Provider<T>;
      value?: T;
      existing?: ProviderToken<T>;
    };

    if (given.factory) {
      return given.factory;
    }

    // Presence, not truthiness: `false`, `0`, `''`, `null` and `undefined` are
    // provided values like any other.
    if ('value' in given) {
      const { value } = given;
      return () => value as T;
    }

    if (given.existing) {
      const { existing } = given;
      // Resolved through the injector so the alias yields the *same* instance
      // rather than re-running the target's factory.
      return () => inject(existing);
    }
  }

  return toProvider(token) as Provider<T>;
}

/**
 * Provide a fixed value for the given token.
 *
 * Falsy values — `false`, `0`, `''`, `null`, `undefined` — are provided
 * values like any other.
 */
export function provideValue<T>(token: ProviderToken<T>, value: T): ReplaceDeclaration<T> {
  return provide(token, { value });
}

/**
 * Provide a factory for the given token. It runs on first resolution, and the
 * result is memoised for the lifetime of the injector that owns it.
 */
export function provideFactory<T>(
  token: ProviderToken<T>,
  factory: Provider<T>,
): ReplaceDeclaration<T> {
  return provide(token, { factory });
}

/**
 * Alias one token to another. Resolving either yields the *same* instance —
 * the aliased token is resolved through the injector, not re-constructed.
 */
export function provideExisting<T>(
  token: ProviderToken<T>,
  existing: ProviderToken<T>,
): ReplaceDeclaration<T> {
  return provide(token, { existing });
}

/**
 * Build a value up across several providers, each receiving what the previous
 * one produced. Extensions registered on a child injector build on the
 * parent's value without modifying it.
 *
 * ```ts
 * const injector = createInjector({
 *   providers: [
 *     extendProvider(provideApolloLinks, (links) => [...links, new AuthLink()]),
 *     extendProvider(provideApolloLinks, (links) => [...links, new XSRFLink()]),
 *   ],
 * });
 * ```
 */
export function extendProvider<T>(
  token: ProviderToken<T>,
  extend: ExtendFn<T>,
): ExtendDeclaration<T> {
  return { token, extend };
}

/**
 * Synthesises a provider for a token that has to satisfy itself: an
 * {@link InjectionToken} with a factory, a class, or a plain function.
 */
export function toProvider(t: unknown, logger: Logger = console): Provider<unknown> {
  if (t instanceof InjectionToken && t.factory) {
    return t.factory;
  }

  // The arity check belongs here and nowhere else: this is the only point at
  // which we know we are about to construct the token ourselves, rather than
  // hand back a factory somebody else supplied.
  if (isClass(t)) {
    warnIfNoDefaultArgs(t, logger);
    return () => new t();
  }

  if (typeof t === 'function') {
    warnIfNoDefaultArgs(t as FunctionSignature<unknown>, logger);
    return t as Provider<unknown>;
  }

  throw new NoProviderError(
    `Unsupported type, unable to create a provider: ${debugToken(t as ProviderToken<unknown>)}`,
  );
}

export function isProviderDeclaration<T>(t: unknown): t is ProviderDeclaration<T> {
  return typeof t === 'object' && t !== null && 'token' in t && ('provider' in t || 'extend' in t);
}

export function isExtendDeclaration<T>(
  declaration: ProviderDeclaration<T>,
): declaration is ExtendDeclaration<T> {
  return 'extend' in declaration;
}
