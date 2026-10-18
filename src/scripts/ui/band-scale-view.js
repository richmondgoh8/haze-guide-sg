import { getBandScalePosition } from '../domain/band-scale.js';
import { requireElement } from './dom.js';

export function createBandScaleView(root, selector, bands) {
  const figure = requireElement(root, selector);
  const marker = requireElement(figure, '.scale-marker');
  const chart = requireElement(figure, 'svg');

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
      chart.setAttribute('aria-label', `${label} NEA bands, lower to higher.`);
      if (band) marker.setAttribute('transform', `translate(${position * bands.length * 100} 0)`);
    },
  };
}
