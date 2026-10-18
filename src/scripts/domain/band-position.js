import { PM25_BANDS, classifyPm25 } from './air-quality.js';

const numberFormat = new Intl.NumberFormat('en-SG', { maximumFractionDigits: 10 });
const format = (value) => numberFormat.format(value);

/** Distances describe adjacent published bands, never a trend or a safety margin. */
export function describeBandPosition(value) {
  const band = classifyPm25(value);
  if (!band) return null;
  const previous = PM25_BANDS[band.index - 2];
  const next = PM25_BANDS[band.index];
  const down = previous ? value - previous.limit : Infinity;
  const up = next ? band.limit + 1 - value : Infinity;
  const summary =
    down === up
      ? `Midway between ${previous.name} and ${next.name}`
      : down < up
        ? `${format(down)} µg/m³ above ${previous.name}`
        : `${format(up)} µg/m³ below ${next.name}`;
  return {
    summary,
  };
}
