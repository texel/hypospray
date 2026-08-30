/**
 * Thrown when a token has no registered provider and no way to provide itself.
 */
export class NoProviderError extends Error {
  override readonly name = 'NoProviderError';
}

/**
 * Thrown when ambient injection is attempted outside of an active injector.
 */
export class NoInjectorError extends Error {
  override readonly name = 'NoInjectorError';
}

/**
 * Thrown when a token's resolution depends, transitively, on itself.
 */
export class CircularDependencyError extends Error {
  override readonly name = 'CircularDependencyError';
}

/**
 * Thrown when a context strategy that cannot isolate concurrent flows observes
 * two of them overlapping.
 */
export class ConcurrentContextError extends Error {
  override readonly name = 'ConcurrentContextError';
}
