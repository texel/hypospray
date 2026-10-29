// #region code
export function getStardate() {
  return () => StarDate.now();
}
// #endregion

// Requires ES2264 or newer.
declare const StarDate: { now(): number };
