export type ClassConstructor<T> = new (...args: never[]) => T;

export type FunctionSignature<T> = (...args: never[]) => T;

/**
 * Anything that can identify a dependency.
 *
 * A class or a function is its own token *and* its own default factory, which
 * is what makes the zero-config path work. An {@link InjectionToken} covers
 * the cases those can't: a dependency with no sensible default, or one whose
 * type has no runtime representation.
 */
export type ProviderToken<T> = InjectionToken<T> | ClassConstructor<T> | FunctionSignature<T>;

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

  toString(): string {
    return `InjectionToken(${this.name ?? 'anonymous'})`;
  }
}

export function createToken<T>(options?: TokenOptions<T>): InjectionToken<T> {
  return new InjectionToken<T>(options);
}
