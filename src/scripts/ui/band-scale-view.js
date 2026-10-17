import { requireElement } from './dom.js';

/** The pointer identifies a category; the final band has no numeric upper bound. */
export function createBandScaleView(root, selector, bands) {
  const figure = requireElement(root, selector);
  const marker = requireElement(figure, '.scale-marker');
  const chart = requireElement(figure, 'svg');

  return {
    render({ reportedLevel, value, current }) {
      const band = bands.find(({ index }) => index === reportedLevel);
      marker.toggleAttribute('hidden', !band);
      figure.dataset.level = band ? String(band.index) : '';
      figure.dataset.freshness = band ? (current ? 'current' : 'reported') : 'unavailable';
      const label = band
        ? `${current ? 'Now' : 'Last reported'}: ${value}, ${band.name}.`
        : 'No reading available.';
      figure.setAttribute('aria-label', label);
      chart.setAttribute('aria-label', `${label} NEA bands, lower to higher.`);
      if (band) marker.setAttribute('transform', `translate(${(band.index - 0.5) * 100} 0)`);
    },
  };
}
