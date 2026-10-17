import { requireElement } from './dom.js';

/** The pointer identifies a category; the final band has no numeric upper bound. */
export function createBandScaleView(root, selector, bands) {
  const figure = requireElement(root, selector);
  const marker = requireElement(figure, '.scale-marker');
  const chart = requireElement(figure, 'svg');

  return {
    render(level, value) {
      const band = bands.find(({ index }) => index === level);
      marker.toggleAttribute('hidden', !band);
      figure.dataset.level = band ? String(band.index) : '';
      const label = band ? `Now: ${value}, ${band.name}.` : 'No current reading.';
      figure.setAttribute('aria-label', label);
      chart.setAttribute('aria-label', `${label} NEA bands, lower to higher.`);
      if (band) marker.setAttribute('transform', `translate(${(band.index - 0.5) * 100} 0)`);
    },
  };
}
