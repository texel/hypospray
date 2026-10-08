import { createInjector, provideValue } from '@hypospray/core';

import { getStardate } from './captains-log';

// #region override
const injector = createInjector({
  providers: [provideValue(getStardate, () => 47988.1)],
});
// #endregion

export { injector };
