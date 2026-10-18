/** Return a position from 0 to 1 across equal-width bands. */
export function getBandScalePosition(value, bands) {
  if (!Number.isFinite(value) || value < 0) return null;
  const index = bands.findIndex((band) => value <= band.limit);
  if (index < 0) return null;

  const upper = bands[index].limit;
  const lower = bands[index - 1]?.limit ?? 0;
  // The open-ended band identifies a category, not progress towards a maximum.
  const progress = Number.isFinite(upper) ? (value - lower) / (upper - lower) : 0.5;
  return (index + progress) / bands.length;
}
