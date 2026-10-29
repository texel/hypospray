import { afterEach, expect, test, vi } from 'vitest';

import { createBridge } from './bridge';

// Forget this and later tests inherit the fake clock.
afterEach(() => {
  vi.unstubAllGlobals();
});

test('logs each arrival with the stardate', () => {
  // Fakes the clock for the whole ship.
  vi.stubGlobal('StarDate', { now: () => 41153.7 });

  const bridge = createBridge();

  expect(bridge.arrive('Farpoint Station')).toContain(
    'stardate 41153.7',
  );
});
