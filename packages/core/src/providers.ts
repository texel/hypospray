import { debugToken, warnIfNoDefaultArgs } from './debug.js';
import { NoProviderError } from './errors.js';
import { isClass } from './helpers.js';
import { inject } from './inject.js';
import type { Logger } from './injector.js';
import { InjectionToken, type ProviderToken } from './tokens.js';

/** A function that creates a dependency. */
export type Provider<T> = () => T;

/**
 * Transforms the value produced by the preceding provider.
 */
export type ProviderExtension<T> = (previous: T) => T;

/** Replaces the provider associated with a token. */
export interface ReplaceDeclaration<T> {
  readonly token: ProviderToken<T>;
  readonly provider: Provider<T>;
}

/** Extends the value associated with a token. */
export interface ExtendDeclaration<T> {
  readonly token: ProviderToken<T>;
  readonly extend: ProviderExtension<T>;
}

/** A provider registration accepted by an injector. */
export type ProviderDeclaration<T> = ReplaceDeclaration<T> | ExtendDeclaration<T>;

/** Providers and provider declarations accepted by an injector. */
export type ProviderList = ReadonlyArray<ProviderToken<any> | ProviderDeclaration<any>>;

/**
 * Selects one way to provide a token. The `never` members prevent an object
 * literal from specifying more than one.
 */
export type ProvideOptions<T> =
  | { factory: Provider<T>; value?: never; existing?: never }
  | { value: T; factory?: never; existing?: never }
  | { existing: ProviderToken<T>; factory?: never; value?: never };

/**
 * Declares how a token should be satisfied. With no options, the token
 * provides itself.
 */
export function provide<T>(
  token: ProviderToken<T>,
  options?: ProvideOptions<T>,
): ReplaceDeclaration<T> {
  return { token, provider: providerFromOptions(token, options) };
}

function providerFromOptions<T>(
  token: ProviderToken<T>,
  options: ProvideOptions<T> | undefined,
): Provider<T> {
  if (options) {
    // Widen once because the union's `never` members interfere with narrowing.
    const given = options as {
      factory?: Provider<T>;
      value?: T;
      existing?: ProviderToken<T>;
    };

    if (given.factory) {
      return given.factory;
    }

    // Check presence so falsy values, including `undefined`, remain valid.
    if ('value' in given) {
      const { value } = given;
      return () => value;
    }

    if (given.existing) {
      const { existing } = given;
      // Resolve the target through the injector so both tokens return the same
      // memoised value.
      return () => inject(existing);
    }
  }

  return ensureProvider(token);
}

/**
 * Provides a fixed value for a token.
 *
 * Falsy values — `false`, `0`, `''`, `null`, `undefined` — are provided
 * values like any other.
 */
export function provideValue<T>(token: ProviderToken<T>, value: T): ReplaceDeclaration<T> {
  return provide(token, { value });
}

/**
 * Provides a factory for a token. It runs on first resolution, and the
 * result is memoised for the lifetime of the injector that owns it.
 */
export function provideFactory<T>(
  token: ProviderToken<T>,
  factory: Provider<T>,
): ReplaceDeclaration<T> {
  return provide(token, { factory });
}

/**
 * Aliases one token to another. Resolving either token returns the same
 * memoised value.
 */
export function provideExisting<T>(
  token: ProviderToken<T>,
  existing: ProviderToken<T>,
): ReplaceDeclaration<T> {
  return provide(token, { existing });
}

/**
 * Extends a token by passing its preceding value to `extend`. Multiple
 * extensions can build a value up in stages, such as a middleware stack.
 * Extensions in a child injector start with the parent's value without
 * modifying it.
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
  extend: ProviderExtension<T>,
): ExtendDeclaration<T> {
  return { token, extend };
}

/**
 * Returns the provider supplied by the token itself: an {@link InjectionToken}
 * factory, a class constructor, or a plain function.
 *
 * Returns `null` when the token cannot provide itself.
 */
export function toProvider<T>(
  token: ProviderToken<T>,
  logger: Logger = console,
): Provider<T> | null {
  if (token instanceof InjectionToken) {
    return token.factory ?? null;
  }

  // Warn only when using the token itself as the provider. Explicit factories
  // are the caller's responsibility.
  if (isClass(token)) {
    warnIfNoDefaultArgs(token, logger);
    return () => new token();
  }

  if (typeof token === 'function') {
    warnIfNoDefaultArgs(token, logger);
    return token;
  }

  // Unreachable for a well-typed caller; reachable from JavaScript, or through
  // the `as never` casts that tests use to reach the arity warning.
  return null;
}

/** Returns the token's own provider or throws if it has none. */
export function ensureProvider<T>(token: ProviderToken<T>, logger: Logger = console): Provider<T> {
  const provider = toProvider(token, logger);

  if (!provider) {
    throw noProviderError(token);
  }

  return provider;
}

/** Creates the appropriate error for a token that cannot be provided. */
export function noProviderError(token: ProviderToken<unknown>): NoProviderError {
  return new NoProviderError(
    token instanceof InjectionToken
      ? `No provider found for ${debugToken(token)}`
      : `Unsupported type, unable to create a provider: ${debugToken(token)}`,
  );
}

export function isProviderDeclaration<T>(value: unknown): value is ProviderDeclaration<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'token' in value &&
    ('provider' in value || 'extend' in value)
  );
}

export function isExtendDeclaration<T>(
  declaration: ProviderDeclaration<T>,
): declaration is ExtendDeclaration<T> {
  return 'extend' in declaration;
}
