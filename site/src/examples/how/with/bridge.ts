import { inject } from '@hypospray/core';

import { createCaptainsLog } from './captains-log';

export function createBridge(log = inject(createCaptainsLog)) {
  return {
    arrive: (destination: string) =>
      log(`We have arrived at ${destination}.`),
  };
}
