import type { ClassConstructor, FunctionToken } from './helpers.js';

/**
 * Anything that can identify a dependency.
 *
 * A class or a function acts as a token *and* its own default factory, which
 * makes most dependencies simple and ergonomic to construct.
 * ```ts
 * interface Store {
 *   count: number;
 * }

 * function createStore(): Store {
 *   return {
 *     count: 0,
 *   };
 * }
 *
 * const injector = new Injector();
 * const store = injector.get(createStore);
 * ```

 * Functions can even be used for cases where a default doesn't make sense -
 * just raise an error instead of returning a value.

 * ```ts
 * function createStore(): Store {
 *   throw new Error('Please provide a store implementation');
 * }
 * ```
 *
 * An {@link InjectionToken} covers cases where a dependency
 * type has no runtime representation, or if you want to customize
 * the token or factory function.
 */
export type ProviderToken<T> = InjectionToken<T> | ClassConstructor<T> | FunctionToken<T>;

export interface TokenOptions<T> {
  /**
   * Label used in error messages and debug traces. It plays no part in
   * lookup — token identity is always by reference.
   */
  name?: string;

  /**
   * Produces the dependency when nothing else provides it.
   */
  factory?: () => T;
}

/**
 * A unique key used to register and retrieve a dependency.
 *
 * Identity is by object reference. Two tokens sharing a `name` are still two
 * distinct tokens.
 */
export class InjectionToken<T> {
  /** Present only to keep structurally-similar objects from type-checking. */
  declare private readonly _brand: T;

  readonly name: string | undefined;

  readonly factory: (() => T) | undefined;

  constructor(options?: TokenOptions<T>) {
    this.name = options?.name;
    this.factory = options?.factory;
  }

  // FIXME: try to make a nicer fallback if we're missing a name
  toString(): string {
    return `InjectionToken(${this.name ?? 'anonymous'})`;
  }
}

/** Creates a unique token for a dependency that has no runtime representation. */
export function createToken<T>(options?: TokenOptions<T>): InjectionToken<T> {
  return new InjectionToken<T>(options);
}
