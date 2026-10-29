/**
 * A TNG-flavoured stardate: TNG premiered in 1987 at stardate 41xxx and
 * advanced roughly 1000 per season, so each real year adds 1000.
 */
export function stardate(date: Date): string {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const fraction = (date.getTime() - start) / (end - start);
  const value = 41000 + 1000 * (year - 1987) + 1000 * fraction;
  return value.toFixed(1);
}
