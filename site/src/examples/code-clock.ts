// #region example
import { createInjector, provideValue } from '@hypospray/core';

import { createCaptainsLog, getStardate } from './captains-log';

const log = createInjector({
  providers: [provideValue(getStardate, () => 47988.1)],
}).get(createCaptainsLog);

log('All good things must come to an end.');
// "Captain's log, stardate 47988.1. All good things must come to an end."
// #endregion
