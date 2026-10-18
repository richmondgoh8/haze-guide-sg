import { getBandScalePosition } from '../domain/band-scale.js';
import { requireElement } from './dom.js';

export function createBandScaleView(root, selector, bands) {
  const figure = requireElement(root, selector);
  const marker = requireElement(figure, '.scale-marker');
  const chart = requireElement(figure, 'svg');
  const note = requireElement(figure, '.scale-note');
  const rangeLabels = [...figure.querySelectorAll('.scale-range')];
  const highestBandStart = (bands.at(-2)?.limit ?? -1) + 1;

  return {
    render({ reportedLevel, value, valueLabel = value, current }) {
      const position = getBandScalePosition(value, bands);
      const band = position === null ? null : bands.find(({ index }) => index === reportedLevel);
      marker.toggleAttribute('hidden', !band);
      figure.dataset.level = band ? String(band.index) : '';
      figure.dataset.freshness = band ? (current ? 'current' : 'reported') : 'unavailable';
      const label = band
        ? `${current ? 'Now' : 'Last reported'}: ${valueLabel}, ${band.name}.`
        : 'No reading available.';
      figure.setAttribute('aria-label', label);
      const highestBand = band && !Number.isFinite(band.limit);
      note.textContent = highestBand ? `${highestBandStart}+ · Highest band` : 'Equal-width bands.';
      chart.setAttribute(
        'aria-label',
        `${label} NEA bands, lower to higher.${highestBand ? ' Highest band has no upper limit; arrow indicates category only.' : ''}`,
      );
      for (const range of rangeLabels) {
        if (band && current && range.dataset.level === String(band.index)) {
          range.setAttribute('aria-current', 'true');
        } else {
          range.removeAttribute('aria-current');
        }
      }
      if (band)
        marker.setAttribute('transform', `translate(${position * chart.viewBox.baseVal.width} 0)`);
    },
  };
}
