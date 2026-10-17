import { REGIONS } from '../config.js';
import { PM25_BANDS, PSI_BANDS } from '../domain/air-quality.js';
import { createBandScaleView } from './band-scale-view.js';
import { getElements, requireElement } from './dom.js';

export function createReadingsView(root) {
  const elements = getElements(root, {
    region: '#region',
    towns: '#region-towns',
    pmValue: '#pm-value',
    pmTitle: '#pm-band',
    pmCard: '#pm-card',
    pmCategory: '#pm-category',
    psiValue: '#psi-value',
    psiLabel: '#psi-band',
    psiCard: '#psi-card',
    statusDot: '#status-dot',
    statusText: '#data-status-text',
    position: '#band-position',
    positionTitle: '#band-position-title',
    positionDown: '#band-distance-down',
    positionUp: '#band-distance-up',
  });
  const pmScale = createBandScaleView(root, '#pm-scale', PM25_BANDS);
  const psiScale = createBandScaleView(root, '#psi-scale', PSI_BANDS);
  const regionButtons = new Map(
    REGIONS.map(({ id }) => {
      const button = requireElement(root, `[data-region="${id}"]`);
      return [
        id,
        { button, ...getElements(button, { value: '.region-value', label: '.region-band' }) },
      ];
    }),
  );

  return {
    render(model) {
      elements.region.value = model.region.id;
      elements.towns.textContent = `${model.region.name} includes ${model.region.towns}.`;
      elements.pmValue.textContent = model.pm25.value;
      elements.pmTitle.textContent = model.pm25.title;
      elements.pmTitle.className = `band-pill ${model.pm25.className}`;
      elements.pmCard.dataset.band = model.pm25.className;
      elements.pmCategory.textContent = model.pm25.category;
      elements.psiValue.textContent = model.psi.value;
      elements.psiLabel.textContent = model.psi.label;
      elements.psiCard.dataset.band = model.psi.className;
      pmScale.render(model.severity.activeLevel, `${model.pm25.value} µg/m³`);
      psiScale.render(model.psi.activeLevel, model.psi.value);
      elements.statusDot.className = `status-dot ${model.status.warning ? 'warn' : 'ok'}`;
      elements.statusText.textContent = model.status.text;
      const position = model.severity.position;
      elements.position.hidden = !position;
      elements.positionTitle.textContent = position?.nearest ?? '';
      elements.positionDown.textContent = position?.down ?? '';
      elements.positionUp.textContent = position?.up ?? '';
      elements.positionDown.hidden = !position?.down;
      elements.positionUp.hidden = !position?.up;

      for (const region of model.regions) {
        const { button, value, label } = regionButtons.get(region.id);
        button.classList.toggle('selected', region.selected);
        button.setAttribute('aria-pressed', String(region.selected));
        value.textContent = region.value;
        label.textContent = region.label;
        label.className = `region-band ${region.className}`;
      }
    },
  };
}
