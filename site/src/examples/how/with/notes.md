The same parameters, but each default [asks for](<#bridge.ts:inject(createCaptainsLog)>) its dependency instead of building it. The log [does the same](<#captains-log.ts:inject(getStardate)>) for its clock.

`getStardate` is an ordinary function [in its own file](<#stardate.ts:export function getStardate()>), and Hypospray automatically knows how to provide it.

[The test](<#bridge.test.ts:provideValue(getStardate, () =\> 41153.7)>) names only what it wants to change, and the injector hands it to whoever asks, however deep. Since each test uses its own injector, there's no mess to clean up.

And they're still just parameters: [pass an argument](<#bridge.test.ts:test('still takes plain arguments'>) and Hypospray never runs.
