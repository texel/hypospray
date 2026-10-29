import { createCaptainsLog } from './captains-log';

export function createBridge(log = createCaptainsLog()) {
  return {
    arrive: (destination: string) =>
      log(`We have arrived at ${destination}.`),
  };
}
