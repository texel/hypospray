/**
 * Thrown when a token has no provider and no way to synthesise one.
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
