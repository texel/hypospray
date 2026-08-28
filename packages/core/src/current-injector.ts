import type { Injector } from './injector.js';
import { createToken } from './tokens.js';

/**
 * Resolves to the injector performing the resolution.
 *
 * Deliberately has no factory. Every injector registers a provider for this
 * token returning itself, so ordinary owner-resolution finds the nearest one
 * and memoises it there — a value that cannot go stale, since an injector is
 * always itself.
 *
 * Lives in its own module so `Injector` can register the token without
 * importing `inject.js`, which imports `Injector` back.
 */
export const CURRENT_INJECTOR = createToken<Injector>({
  name: 'CURRENT_INJECTOR',
});
