import { createInjector, provideValue } from '@hypospray/core';
import { expect, test } from 'vitest';

import { createBridge } from './bridge';
import { createCaptainsLog } from './captains-log';
import { getStardate } from './stardate';

test('logs each arrival with the stardate', () => {
  // Reaches the clock however deep it is. Nothing to undo.
  const bridge = createInjector({
    providers: [provideValue(getStardate, () => 41153.7)],
  }).get(createBridge);

  expect(bridge.arrive('Farpoint Station')).toContain(
    'stardate 41153.7',
  );
});

test('still takes plain arguments', () => {
  // A passed argument skips inject(), so no injector is needed.
  const bridge = createBridge(createCaptainsLog(() => 41153.7));

  expect(bridge.arrive('Farpoint Station')).toContain(
    'stardate 41153.7',
  );
});
