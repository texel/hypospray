import type { ProviderArray } from './providers.js';
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
  constructor(_options?: InjectorOptions) {
    // resolution state lives here once implemented
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

  get<T>(
    token: ProviderToken<T>,
    options: InjectOptions & { optional: true },
  ): T | undefined;
  get<T>(token: ProviderToken<T>, options?: InjectOptions): T;
  get<T>(
    _token: ProviderToken<T>,
    _options?: InjectOptions,
  ): T | undefined {
    notImplemented('Injector.get');
  }

  createChild(_options?: ChildInjectorOptions): Injector {
    notImplemented('Injector.createChild');
  }
}

export function createInjector(options?: InjectorOptions): Injector {
  return new Injector(options);
}
