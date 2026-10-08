// #region code
export function createCaptainsLog() {
  const stardate = () => StarDate.now();
  return (entry: string) => `Captain's log, stardate ${stardate()}. ${entry}`;
}
// Testing this means faking the clock for the whole ship.
// #endregion

declare const StarDate: { now(): number };
