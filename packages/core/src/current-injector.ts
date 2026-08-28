import type { Injector } from './injector.js';
import { createToken } from './tokens.js';

/**
 * Resolves to the injector performing the resolution.
 *
 * There's no default factory because every injector registers a provider for this
 * token returning itself.
 *
 * Lives in its own module so `Injector` can register the token without
 * importing `inject.js`, which would cause a circular dependency.
 */
export const CURRENT_INJECTOR = createToken<Injector>({
  name: 'CURRENT_INJECTOR',
});
