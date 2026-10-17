import { PM25_BANDS, classifyPm25 } from './air-quality.js';

const numberFormat = new Intl.NumberFormat('en-SG', { maximumFractionDigits: 10 });
const format = (value) => numberFormat.format(value);

/** Distances describe adjacent published bands, never a trend or a safety margin. */
export function describeBandPosition(value) {
  const band = classifyPm25(value);
  if (!band) return null;
  const previous = PM25_BANDS[band.index - 2];
  const next = PM25_BANDS[band.index];
  const lower = previous?.limit ?? 0;
  const upper = Number.isFinite(band.limit) ? band.limit + 1 : null;
  const down = previous ? value - lower : null;
  const up = next ? upper - value : null;
  const nearest = !previous
    ? `Next band: ${next.name}`
    : !next
      ? 'Already in the highest band'
      : down === up
        ? `Midway between ${previous.name} and ${next.name}`
        : `Closer to ${down < up ? previous.name : next.name}`;
  return {
    current: `Now: ${format(value)} µg/m³ · ${band.name}`,
    nearest,
    lower,
    upper,
    value,
    lowerLabel: previous ? `${previous.name} ≤${lower}` : 'Normal starts at 0',
    upperLabel: next ? `${next.name} starts at ${upper}` : 'Very high has no upper limit',
    down: previous ? `${format(down)} µg/m³ above ${previous.name} (≤${lower})` : null,
    up: next ? `${format(up)} µg/m³ below ${next.name} (${upper})` : null,
  };
}
