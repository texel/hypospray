import {
  isExtendDeclaration,
  toProvider,
  type Provider,
  type ProviderArray,
  type ProviderDeclaration,
} from './providers.js';
import type { ProviderToken } from './tokens.js';

function notImplemented(what: string): never {
  throw new Error(`Not implemented: ${what}`);
}

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

export class Injector {
  protected readonly options: InjectorOptions;

  private providers = new Map<ProviderToken<unknown>, Provider<unknown>>();

  private values = new Map<ProviderToken<unknown>, unknown>();

  private parent: Injector | null = null;

  private logger: Logger;

  private debug = false;

  constructor(options: InjectorOptions = {}) {
    this.options = options;

    this.parent = options?.parent || null;

    this.logger = options?.logger || console;

    this.debug = options?.debug ?? false;

    if (options?.providers) {
      this.addProviders(...options.providers);
    }
  }

  /**
   * Registers providers, replacing any existing provider for the same token
   * unless the declaration was built by {@link extendProvider}.
   */
  addProviders(..._providers: ProviderArray): void {
    notImplemented('Injector.addProviders');
  }

  /**
   * Runs `fn` with this injector as the ambient injector, restoring the
   * previous one afterwards — including when `fn` throws, and independently
   * for concurrent async flows.
   */
  invoke<T>(_fn: () => T): T {
    notImplemented('Injector.invoke');
  }

  get<T>(token: ProviderToken<T>, options: InjectOptions & { optional: true }): T | undefined;
  get<T>(token: ProviderToken<T>, options?: InjectOptions): T;
  get<T>(_token: ProviderToken<T>, _options?: InjectOptions): T | undefined {
    notImplemented('Injector.get');
  }

  createChild(_options?: ChildInjectorOptions): Injector {
    notImplemented('Injector.createChild');
  }

  private getOrCreateProvider<T>(token: ProviderToken<T>): Provider<unknown> {
    const provider = this.providers.get(token);
    if (provider) {
      return provider;
    }

    const newProvider = toProvider(token);
    this.providers.set(token, newProvider);
    return newProvider;
  }

  private addProviderFromDeclaration<T>(declaration: ProviderDeclaration<T>) {
    const { token } = declaration;

    if (isExtendDeclaration(declaration)) {
      const { extend } = declaration;
      const previous = this.getOrCreateProvider(token) as Provider<T>;
      this.providers.set(token, () => extend(previous()));
    } else {
      this.providers.set(token, declaration.provider as Provider<unknown>);
    }
  }
}

export function createInjector(options?: InjectorOptions): Injector {
  return new Injector(options);
}
