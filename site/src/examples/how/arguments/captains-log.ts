// #region code
export function createCaptainsLog(
  stardate = () => StarDate.now(),
) {
  return (entry: string) =>
    `Captain's log, stardate ${stardate()}. ${entry}`;
}
// #endregion

// Requires ES2264 or newer.
declare const StarDate: { now(): number };
