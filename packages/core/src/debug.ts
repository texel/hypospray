import type { ClassConstructor, FunctionToken } from './helpers.js';
import type { Logger } from './injector.js';
import { InjectionToken, type ProviderToken } from './tokens.js';

export function debugToken(token: ProviderToken<unknown> | undefined): string {
  if (token === undefined) {
    return '<no token>';
  }

  if (token instanceof InjectionToken) {
    // Named or not, toString() always yields something readable.
    return token.toString();
  }

  if (typeof token === 'function') {
    return token.name || '<anonymous function>';
  }

  return String(token);
}

export function debugTokens(tokens: Array<ProviderToken<unknown>>) {
  return tokens.map(debugToken).join(' > ');
}

export function debugTokensHierarchically(tokens: Array<ProviderToken<unknown>>) {
  const length = tokens.length - 1;
  const lastToken = tokens[length];
  const treeSeparator = length > 0 ? '└╴' : '';

  return ' '.repeat(length) + treeSeparator + debugToken(lastToken);
}

/**
 * If we're using TypeScript, we should be able to statically detect
 * when a function or class constructor has forgotten to inject default arguments.
 * But, we can't actually do that, since that would make it hard to use DI
 * for external libraries with classes that expect arguments.
 *
 * In those cases, you need to provide a factory function that creates the instance.
 * If you forgot to do that, this function will log a warning at runtime.
 */
export function warnIfNoDefaultArgs(
  fn: FunctionToken<unknown> | ClassConstructor<unknown>,
  console: Logger,
) {
  if (fn.length > 0) {
    console.warn(
      `Hypospray: Function ${fn.name} appears to expect arguments but none were given. Did you forget to inject default arguments?`,
    );
  }
}
