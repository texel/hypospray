export function isFunction(obj: unknown): obj is FunctionSignature<unknown> {
  return typeof obj === 'function';
}

export function isClass(obj: unknown): obj is ClassConstructor<unknown> {
  return isFunction(obj) && /^class[\s{]/.test(Function.prototype.toString.call(obj));
}

export type ClassConstructor<T> = new (...args: never[]) => T;
export type FunctionSignature<T> = (...args: never[]) => T;

/**
 * A promise-like we can attach a rejection handler to.
 *
 * Deliberately requires `catch` as well as `then`: the point of the check is
 * to claim a rejection, and a bare thenable gives us no way to do that.
 */
export function isThenable(value: unknown): value is Promise<unknown> {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return false;
  }

  const candidate = value as { then?: unknown; catch?: unknown };
  return typeof candidate.then === 'function' && typeof candidate.catch === 'function';
}
