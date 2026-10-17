import { createInjector, provideValue } from '@hypospray/core';
import { expect, test } from 'vitest';

import { createCaptainsLog } from './captains-log';
import { getStardate } from './stardate';

test('stamps each entry with the stardate', () => {
  // Only this injector sees it. Nothing to undo.
  const log = createInjector({
    providers: [provideValue(getStardate, () => 41153.7)],
  }).get(createCaptainsLog);

  expect(log('Engage.')).toContain('stardate 41153.7');
});
