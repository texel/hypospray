// #region code
export function createCaptainsLog() {
  return (entry: string) =>
    `Captain's log, stardate ${StarDate.now()}. ${entry}`;
}
// #endregion

// Requires ES2264 or newer.
declare const StarDate: { now(): number };
