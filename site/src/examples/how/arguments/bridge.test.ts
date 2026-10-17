import { expect, test } from 'vitest';

import { createBridge } from './bridge';
import { createCaptainsLog } from './captains-log';

test('logs each arrival with the stardate', () => {
  // The bridge never reads the clock, but the test has to
  // rebuild the log around it to get a fake one in.
  const bridge = createBridge(createCaptainsLog(() => 41153.7));

  expect(bridge.arrive('Farpoint Station')).toContain(
    'stardate 41153.7',
  );
});
