import { afterEach, expect, test, vi } from 'vitest';

import { createCaptainsLog } from './captains-log';

// Forget this and later tests inherit the fake clock.
afterEach(() => {
  vi.unstubAllGlobals();
});

test('stamps each entry with the stardate', () => {
  // Fakes the clock for the whole ship.
  vi.stubGlobal('StarDate', { now: () => 41153.7 });

  const log = createCaptainsLog();

  expect(log('Engage.')).toContain('stardate 41153.7');
});
