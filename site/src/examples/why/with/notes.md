`createCaptainsLog` [asks for its clock](<#captains-log.ts:inject(getStardate)>) instead, with `inject(getStardate)`.

`getStardate` is an ordinary function [in its own file](<#stardate.ts:export function getStardate()>), and Hypospray automatically knows how to provide it.

[The test](<#captains-log.test.ts:provideValue(getStardate, () =\> 41153.7)>) uses `provideValue` to swap the real stardate with a mock. Since each test uses its own injector, there's no mess to clean up.
