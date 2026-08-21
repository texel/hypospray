import type { ProviderToken } from './tokens.js';

function notImplemented(what: string): never {
  throw new Error(`Not implemented: ${what}`);
}

/**
 * Produces a dependency. Providers take no arguments — the "extend" case has
 * its own type so that the accumulator parameter doesn't leak into every
 * provider signature.
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
  readonly extend?: false;
}

export interface ExtendDeclaration<T> {
  readonly token: ProviderToken<T>;
  readonly provider: ExtendFn<T>;
  readonly extend: true;
}

/**
 * Associates a token with the provider that satisfies it.
 */
export type ProviderDeclaration<T> =
  | ReplaceDeclaration<T>
  | ExtendDeclaration<T>;

export type ProviderArray = ReadonlyArray<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ProviderToken<any> | ProviderDeclaration<any>
>;

export type ProvideOptions<T> =
  | { factory: Provider<T>; value?: never; existing?: never }
  | { value: T; factory?: never; existing?: never }
  | { existing: ProviderToken<T>; factory?: never; value?: never };

/**
 * Declares how a token should be satisfied. With no options, the token
 * provides itself.
 */
export function provide<T>(
  _token: ProviderToken<T>,
  _options?: ProvideOptions<T>,
): ProviderDeclaration<T> {
  notImplemented('provide');
}

/**
 * Provide a fixed value for the given token.
 *
 * Falsy values — `false`, `0`, `''`, `null`, `undefined` — are provided
 * values like any other.
 */
export function provideValue<T>(
  _token: ProviderToken<T>,
  _value: T,
): ProviderDeclaration<T> {
  notImplemented('provideValue');
}

/**
 * Provide a factory for the given token. It runs on first resolution, and the
 * result is memoised for the lifetime of the injector that owns it.
 */
export function provideFactory<T>(
  _token: ProviderToken<T>,
  _factory: Provider<T>,
): ProviderDeclaration<T> {
  notImplemented('provideFactory');
}

/**
 * Alias one token to another. Resolving either yields the *same* instance —
 * the aliased token is resolved through the injector, not re-constructed.
 */
export function provideExisting<T, U extends T>(
  _token: ProviderToken<T>,
  _existing: ProviderToken<U>,
): ProviderDeclaration<T> {
  notImplemented('provideExisting');
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
  _token: ProviderToken<T>,
  _extendFn: ExtendFn<T>,
): ProviderDeclaration<T> {
  notImplemented('extendProvider');
}
