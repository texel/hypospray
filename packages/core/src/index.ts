export { getContextStrategy, setContextStrategy } from './context.js';

export { createSyncContextStrategy } from './context/sync.strategy.js';

export type { ResolutionContext } from './context.js';
export type { ContextStrategy } from './context/strategy.js';
export type { SyncContextStrategyOptions } from './context/sync.strategy.js';

export {
  CircularDependencyError,
  ConcurrentContextError,
  NoInjectorError,
  NoProviderError,
} from './errors.js';

export { InjectionToken, createToken } from './tokens.js';
export type { ClassConstructor, FunctionToken } from './helpers.js';
export type { ProviderToken, TokenOptions } from './tokens.js';

export {
  extendProvider,
  provide,
  provideExisting,
  provideFactory,
  provideValue,
} from './providers.js';
export type {
  ExtendDeclaration,
  ProviderExtension,
  Provider,
  ProviderList,
  ProviderDeclaration,
  ProvideOptions,
  ReplaceDeclaration,
} from './providers.js';

export { Injector, createInjector } from './injector.js';
export type { ChildInjectorOptions, InjectorOptions, Logger, ResolveOptions } from './injector.js';

export { CURRENT_INJECTOR, getCurrentInjector, inject } from './inject.js';
