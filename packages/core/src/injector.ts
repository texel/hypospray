import { getContext, runInContext } from './context.js';
import { CURRENT_INJECTOR } from './current-injector.js';
import { debugToken, debugTokens, debugTokensHierarchically } from './debug.js';
import { CircularDependencyError, NoProviderError } from './errors.js';
import { isThenable } from './helpers.js';
import {
  isExtendDeclaration,
  isProviderDeclaration,
  toProvider,
  type Provider,
  type ProviderArray,
  type ProviderDeclaration,
} from './providers.js';
import type { ProviderToken } from './tokens.js';

export type Logger = Pick<Console, 'debug' | 'error' | 'warn' | 'info'>;

export interface InjectOptions {
  optional?: boolean;
}

export interface InjectorOptions {
  parent?: Injector | null;
  providers?: ProviderArray;
  /** Trace every resolution to the logger. Inherited by child injectors. */
  debug?: boolean;
  /** Defaults to the global console. Inherited by child injectors. */
  logger?: Logger;
}

export type ChildInjectorOptions = Omit<InjectorOptions, 'parent'>;

type AnyToken = ProviderToken<unknown>;

export class Injector {
  private readonly providers = new Map<AnyToken, Provider<unknown>>();

  private readonly values = new Map<AnyToken, unknown>();

  private readonly parent: Injector | null;

  private readonly logger: Logger;

  private readonly debug: boolean;

  constructor(options: InjectorOptions = {}) {
    this.parent = options.parent ?? null;
    this.logger = options.logger ?? console;
    this.debug = options.debug ?? false;

    if (options.providers) {
      this.addProviders(...options.providers);
    }
  }

  /**
   * Registers providers, replacing any existing provider for the same token
   * unless the declaration was built by `extendProvider`.
   */
  addProviders(...providers: ProviderArray): void {
    for (const entry of providers) {
      this.addProviderFromDeclaration(this.toDeclaration(entry));
    }
  }

  /**
   * Runs `fn` with this injector as the ambient one, so `inject()` inside it
   * resolves from here. The previous context is restored afterwards, including
   * when `fn` throws.
   *
   * How far that reaches into an async `fn` is the installed
   * {@link ContextStrategy}'s business: an async-aware strategy carries the
   * context across `await`, while the default synchronous one stops at the
   * first suspension point.
   */
  run<T>(fn: () => T): T {
    return runInContext({ injector: this, stack: [] }, fn);
  }

  get<T>(token: ProviderToken<T>, options: InjectOptions & { optional: true }): T | undefined;
  get<T>(token: ProviderToken<T>, options?: InjectOptions): T;
  get<T>(token: ProviderToken<T>, options?: InjectOptions): T | undefined {
    // We can short-circuit requests for the current injector because
    // hey buddy, we're it.
    if (token === CURRENT_INJECTOR) {
      return this as unknown as T;
    }

    // Join the caller's resolution if there is one, so cycle detection spans
    // nested injectors; otherwise start a fresh stack for this flow.
    const stack = getContext()?.stack ?? [];

    // A token nobody provides belongs to the root, so it resolves once and is
    // shared, rather than once per injector that happens to ask.
    const owner = this.findOwner(token) ?? this.rootInjector();

    return owner.resolve(token, options, stack);
  }

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

  /**
   * Resolves `token` in this injector, which by now is known to be the one
   * that owns it. Memoised here, so a value has exactly one home.
   */
  private resolve<T>(
    token: ProviderToken<T>,
    options: InjectOptions | undefined,
    stack: Array<AnyToken>,
  ): T | undefined {
    const key = token as AnyToken;

    if (this.values.has(key)) {
      return this.values.get(key) as T;
    }

    if (stack.includes(key)) {
      throw new CircularDependencyError(
        `Circular dependency detected for ${debugToken(key)}: ${debugTokens([...stack, key])}`,
      );
    }

    let provider = this.providers.get(key);

    if (!provider) {
      try {
        provider = toProvider(token, this.logger);
      } catch (error) {
        if (error instanceof NoProviderError) {
          // Nothing is recorded for a miss, so an optional lookup cannot
          // satisfy a later required one.
          if (options?.optional) {
            return undefined;
          }

          throw new NoProviderError(`No provider found for ${debugToken(key)}`);
        }

        throw error;
      }

      this.providers.set(key, provider);
    }

    stack.push(key);

    try {
      if (this.debug) {
        this.logger.debug(`Injector: resolving ${debugTokensHierarchically(stack)}`);
      }

      const value = runInContext({ injector: this, stack }, provider);

      // FIXME: This reads awkwardly
      // A memoised promise is handed to every later consumer, and any of them
      // may await it a turn or more after it settles. Node treats a rejection
      // with no handler attached as fatal, so claim it here — consumers
      // awaiting the promise still see the rejection exactly as before.
      if (isThenable(value)) {
        value.catch((error: unknown) => {
          if (this.debug) {
            this.logger.debug(`Injector: ${debugToken(key)} rejected: ${String(error)}`);
          }
        });
      }

      this.values.set(key, value);

      return value as T;
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

    const token = entry as ProviderToken<T>;
    return { token, provider: toProvider(token, this.logger) as Provider<T> };
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
      this.providers.set(key, declaration.provider as Provider<unknown>);
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
    const own = this.providers.get(token);
    if (own) {
      return own as Provider<T>;
    }

    if (this.parent) {
      return this.parent.inheritedProvider(token);
    }

    return toProvider(token, this.logger) as Provider<T>;
  }
}

export function createInjector(options?: InjectorOptions): Injector {
  return new Injector(options);
}
