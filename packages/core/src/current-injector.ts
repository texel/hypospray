import type { Injector } from './injector.js';
import { createToken } from './tokens.js';

/**
 * Resolves to the injector performing the resolution.
 *
 * Deliberately has no factory: `Injector.get` answers it directly with itself,
 * so it is never memoised. Caching it would freeze every later resolution to
 * whichever injector happened to ask first.
 *
 * Lives in its own module so `Injector` can intercept the token without
 * importing `inject.js`, which imports `Injector` back.
 */
export const CURRENT_INJECTOR = createToken<Injector>({
  name: 'CURRENT_INJECTOR',
});
