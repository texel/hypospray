import { inject } from '@hypospray/core';

import { getStardate } from './captains-log';

// #region code
export function createCaptainsLog(stardate = inject(getStardate)) {
  return (entry: string) => `Captain's log, stardate ${stardate()}. ${entry}`;
}
// Tests provide a fixed stardate. Nothing else changes.
// #endregion
