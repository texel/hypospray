`createCaptainsLog` uses the global `StarDate` clock [directly](<#captains-log.ts:StarDate.now()>).

That works until you need to [test](<#captains-log.test.ts:vi.stubGlobal('StarDate', { now: () =\> 41153.7 })>) it: the only way to control the stardate is to replace `StarDate` for the whole process, then remember to [put it back](<#captains-log.test.ts:vi.unstubAllGlobals()>);.

Forget the `afterEach`, and every test that runs later uses the fake clock, causing havoc in the space/time continuum.

There's got to be a [better way](#with/captains-log.ts)!
