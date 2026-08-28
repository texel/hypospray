import { getContext, runInContext } from './context.js';
import { CURRENT_INJECTOR } from './current-injector.js';
import { debugToken, debugTokens, debugTokensHierarchically } from './debug.js';
import { CircularDependencyError } from './errors.js';
import { isThenable } from './helpers.js';
import {
  ensureProvider,
  isExtendDeclaration,
  isProviderDeclaration,
  noProviderError,
  toProvider,
  type Provider,
  type ProviderList,
  type ProviderDeclaration,
} from './providers.js';
import type { ProviderToken } from './tokens.js';

export type Logger = Pick<Console, 'debug' | 'error' | 'warn' | 'info'>;

export interface ResolveOptions {
  optional?: boolean;
}

export interface InjectorOptions {
  parent?: Injector | null;
  providers?: ProviderList;
  /** Trace every resolution to the logger. Inherited by child injectors. */
  debug?: boolean;
  /** Defaults to the global console. Inherited by child injectors. */
  logger?: Logger;
}

export type ChildInjectorOptions = Omit<InjectorOptions, 'parent'>;

type AnyToken = ProviderToken<unknown>;

export class Injector {
  // Both maps are heterogeneous, which TypeScript cannot express. Reads go
  // through `getProvider` and `getValue`, the only two type assertions in the
  // library; see the SAFETY comments there for the invariant each depends on.
  // Everywhere else, `pnpm lint:types` must stay silent.
  private readonly providers = new Map<AnyToken, Provider<unknown>>();

  private readonly values = new Map<AnyToken, unknown>();

  private readonly parent: Injector | null;

  private readonly logger: Logger;

  private readonly debug: boolean;

  constructor(options: InjectorOptions = {}) {
    this.parent = options.parent ?? null;
    this.logger = options.logger ?? console;
    this.debug = options.debug ?? false;

    // Every injector answers CURRENT_INJECTOR with itself. Registering that as
    // an ordinary provider means `get` needs no special case: owner-resolution
    // already picks the nearest injector, which is always the right answer,
    // and memoising `this` in this injector cannot go stale.
    this.providers.set(CURRENT_INJECTOR, () => this);

    if (options.providers) {
      this.addProviders(...options.providers);
    }
  }

  /**
   * Registers providers, replacing any existing provider for the same token
   * unless the declaration was built by `extendProvider`.
   */
  addProviders(...providers: ProviderList): void {
    for (const entry of providers) {
      this.addProviderFromDeclaration(this.toDeclaration(entry));
    }
  }

  /**
   * Runs `fn` with this injector available to `inject()`.
   *
   * The configured context strategy determines whether the injector remains
   * available after an `await`. The previous context is restored when `fn`
   * returns or throws.
   */
  run<T>(fn: () => T): T {
    return runInContext({ injector: this, stack: [] }, fn);
  }

  /** Resolves and memoises the value associated with `token`. */
  get<T>(token: ProviderToken<T>, options: ResolveOptions & { optional: true }): T | undefined;
  get<T>(token: ProviderToken<T>, options?: ResolveOptions): T;
  get<T>(token: ProviderToken<T>, options?: ResolveOptions): T | undefined {
    // Join the caller's resolution if there is one, so cycle detection spans
    // nested injectors; otherwise start a fresh stack for this flow.
    const stack = getContext()?.stack ?? [];

    // A token nobody provides belongs to the root, so it resolves once and is
    // shared, rather than once per injector that happens to ask.
    const owner = this.findOwner(token) ?? this.rootInjector();

    return owner.resolve(token, options, stack);
  }

  /** Creates an injector that inherits providers, debug settings, and logging from this one. */
  createChild(options: ChildInjectorOptions = {}): Injector {
    return new Injector({
      ...options,
      parent: this,
      debug: options.debug ?? this.debug,
      logger: options.logger ?? this.logger,
    });
  }

  /** The nearest injector in the chain that has a provider for `token`. */
  private findOwner(token: AnyToken): Injector | null {
    if (this.providers.has(token)) {
      return this;
    }

    return this.parent?.findOwner(token) ?? null;
  }

  private rootInjector(): Injector {
    return this.parent?.rootInjector() ?? this;
  }

  /** The provider registered here for `token`, if any. */
  private getProvider<T>(token: ProviderToken<T>): Provider<T> | null {
    // SAFETY: `providers` is heterogeneous — a `ProviderToken<T>` key leads to
    // a `Provider<T>` value — and TypeScript cannot tie a Map's value type to
    // its key's type parameter. The correspondence is an invariant we maintain,
    // not one the compiler checks.
    //
    // Upheld because the map is private, is never handed out, and every writer
    // pairs the two types at the point of the write:
    //   - the constructor stores `() => this` under CURRENT_INJECTOR, whose
    //     token type is `Injector`;
    //   - `resolve` stores what `toProvider(token)` returned, under `token`;
    //   - `addProviderFromDeclaration` stores `declaration.provider` under
    //     `declaration.token`, which `ProviderDeclaration<T>` binds together,
    //     or its extend closure, which returns `ProviderExtension<T>`'s `T`.
    //
    // A new writer has to keep that pairing or this read becomes unsound.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return (this.providers.get(token) as Provider<T>) ?? null;
  }

  /**
   * The memoised value for `token`. Call only when `values.has(token)` — a
   * token may legitimately resolve to `undefined`, so absence and a stored
   * `undefined` cannot be told apart from the return value.
   */
  private getValue<T>(token: ProviderToken<T>): T {
    // SAFETY: the same heterogeneous-map invariant as {@link getProvider}, with
    // one writer upholding it. `resolve` stores the value it has just obtained
    // by calling that token's own `Provider<T>`, keyed by that same token, and
    // nothing else writes to `values`. The map is private and never escapes.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return this.values.get(token) as T;
  }

  /**
   * Resolves `token` in this injector, which by now is known to be the one
   * that owns it. The result is memoized, and will be reused for future lookups.
   */
  private resolve<T>(
    token: ProviderToken<T>,
    options: ResolveOptions | undefined,
    stack: Array<AnyToken>,
  ): T | undefined {
    const key: AnyToken = token;

    if (this.values.has(key)) {
      return this.getValue(token);
    }

    if (stack.includes(key)) {
      throw new CircularDependencyError(
        `Circular dependency detected for ${debugToken(key)}: ${debugTokens([...stack, key])}`,
      );
    }

    let provider = this.getProvider(token);

    if (!provider) {
      provider = toProvider(token, this.logger);

      if (!provider) {
        // Nothing is recorded for a miss, so an optional lookup cannot satisfy
        // a later required one.
        if (options?.optional) {
          return undefined;
        }

        throw noProviderError(token);
      }

      this.providers.set(key, provider);
    }

    stack.push(key);

    try {
      if (this.debug) {
        this.logger.debug(`Injector: resolving ${debugTokensHierarchically(stack)}`);
      }

      const value = runInContext({ injector: this, stack }, provider);

      // Attach a handler before caching the promise: consumers may not await it
      // until after it rejects, which Node would report as an unhandled rejection.
      // Since unhandled rejections kill the process, leaving this out would be
      // disruptive. Awaiting the original promise still propagates the rejection normally.
      if (isThenable(value)) {
        value.catch((error: unknown) => {
          if (this.debug) {
            this.logger.debug(`Injector: ${debugToken(key)} rejected: ${String(error)}`);
          }
        });
      }

      this.values.set(key, value);

      return value;
    } finally {
      // Always unwind, so a throw leaves nothing behind for the next caller.
      stack.pop();
    }
  }

  private toDeclaration<T>(
    entry: ProviderToken<T> | ProviderDeclaration<T>,
  ): ProviderDeclaration<T> {
    if (isProviderDeclaration<T>(entry)) {
      return entry;
    }

    return { token: entry, provider: ensureProvider(entry, this.logger) };
  }

  private addProviderFromDeclaration<T>(declaration: ProviderDeclaration<T>): void {
    const key = declaration.token;

    if (isExtendDeclaration(declaration)) {
      const { extend } = declaration;
      // Captured now, so the extension builds on whatever was registered at
      // this point, including a provider inherited from an ancestor.
      const previous = this.inheritedProvider(declaration.token);
      this.providers.set(key, () => extend(previous()));
    } else {
      this.providers.set(key, declaration.provider);
    }
  }

  /**
   * The provider an extension should build on: the nearest one in the chain,
   * or a freshly synthesised one if the token has never been provided.
   *
   * Read-only with respect to ancestors — extending in a child never mutates
   * the parent's registration.
   */
  private inheritedProvider<T>(token: ProviderToken<T>): Provider<T> {
    return (
      this.getProvider(token) ??
      this.parent?.inheritedProvider(token) ??
      ensureProvider(token, this.logger)
    );
  }
}

/** Creates an injector with the supplied providers and options. */
export function createInjector(options?: InjectorOptions): Injector {
  return new Injector(options);
}
