The bridge builds its own captain's log, and the log reads the global `StarDate` clock [directly](<#captains-log.ts:StarDate.now()>).

The bridge never touches the clock, but to [test it](<#bridge.test.ts:vi.stubGlobal('StarDate', { now: () =\> 41153.7 })>) you have to replace `StarDate` for the whole process, then remember to [put it back](<#bridge.test.ts:vi.unstubAllGlobals()>).

Forget the `afterEach`, and every test that runs later uses the fake clock, causing havoc in the space/time continuum.

Could we just [pass the clock in](#arguments/captains-log.ts)?
