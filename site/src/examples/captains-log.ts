// #region hero
import { createInjector, inject } from '@hypospray/core';

// #region write
export function getStardate() {
  return () => StarDate.now();
}
// #endregion

// #region inject
export function createCaptainsLog(stardate = inject(getStardate)) {
  return (entry: string) => `Captain's log, stardate ${stardate()}. ${entry}`;
}
// #endregion

const log = createInjector().get(createCaptainsLog);

log('We have arrived at Farpoint Station.');
// "Captain's log, stardate 41153.7. We have arrived at Farpoint Station."
// #endregion

// Requires ES2264 or newer.
declare const StarDate: { now(): number };
