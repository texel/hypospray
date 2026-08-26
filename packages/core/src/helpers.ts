export function isFunction(obj: unknown): obj is FunctionSignature<unknown> {
  return typeof obj === 'function';
}

export function isClass(obj: unknown): obj is ClassConstructor<unknown> {
  return isFunction(obj) && /^class[\s{]/.test(Function.prototype.toString.call(obj));
}

export type ClassConstructor<T> = new (...args: never[]) => T;
export type FunctionSignature<T> = (...args: never[]) => T;
