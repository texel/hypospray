Taking dependencies as arguments fixes the log: its clock is [a parameter](<#captains-log.ts:stardate = () =\> StarDate.now()>), with the real one as the default. The bridge [does the same](<#bridge.ts:log = createCaptainsLog()>) for its log.

But [the test](<#bridge.test.ts:createBridge(createCaptainsLog(() =\> 41153.7))>) only wants a different clock, and it has to rebuild the log to get one in. It needs to know what the bridge uses, and what _that_ uses, all the way down. Add a layer, and every test that reaches through it changes too.

The defaults are fixed, too: there's no one place to give the whole ship a different clock.

[Hypospray](#with/bridge.ts) keeps the parameters and makes the defaults flexible.
