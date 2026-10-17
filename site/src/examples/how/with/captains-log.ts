import { inject } from '@hypospray/core';

import { getStardate } from './stardate';

export function createCaptainsLog(stardate = inject(getStardate)) {
  return (entry: string) =>
    `Captain's log, stardate ${stardate()}. ${entry}`;
}
