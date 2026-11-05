import { REGIONS } from '../config.js';
import { PM25_BANDS, PSI_BANDS } from '../domain/air-quality.js';
import { UV_BANDS } from '../domain/uv.js';
import { createBandScaleView } from './band-scale-view.js';
import { getElements, requireElement } from './dom.js';

export function createReadingsView(root) {
  const elements = getElements(root, {
    region: '#region',
    towns: '#region-towns',
    pmValue: '#pm-value',
    pmTime: '#pm-time',
    pmTitle: '#pm-band',
    pmCard: '#pm-card',
    pmCategory: '#pm-category',
    psiValue: '#psi-value',
    psiLabel: '#psi-band',
    psiCard: '#psi-card',
    uvValue: '#uv-value',
    uvTime: '#uv-time',
    uvLabel: '#uv-band',
    uvCard: '#uv-card',
    uvLongOuting: '#uv-long-outing',
    uvSunblock: '#uv-sunblock',
    statusDot: '#status-dot',
    statusText: '#data-status-text',
    position: '#band-position',
  });
  const pmScale = createBandScaleView(root, '#pm-scale', PM25_BANDS);
  const psiScale = createBandScaleView(root, '#psi-scale', PSI_BANDS);
  const uvScale = createBandScaleView(root, '#uv-scale', UV_BANDS);
  const illustrations = [
    { id: 'pm', measurement: 'pm25' },
    { id: 'psi', measurement: 'psi' },
    { id: 'uv', measurement: 'uv' },
  ].map(({ id, measurement }) => ({
    measurement,
    variants: Array.from(
      requireElement(root, `#${id}-illustration`).querySelectorAll('[data-illustration]'),
    ),
  }));
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
      elements.pmTime.textContent = model.pm25.timeLabel;
      if (model.pm25.timestamp) elements.pmTime.setAttribute('datetime', model.pm25.timestamp);
      else elements.pmTime.removeAttribute('datetime');
      elements.pmTitle.textContent = model.pm25.title;
      elements.pmTitle.className = `band-pill ${model.pm25.className}`;
      elements.pmCard.dataset.band = model.pm25.className;
      elements.pmCategory.textContent = model.pm25.category;
      elements.psiValue.textContent = model.psi.value;
      elements.psiLabel.textContent = model.psi.label;
      elements.psiCard.dataset.band = model.psi.className;
      elements.uvValue.textContent = model.uv.value;
      elements.uvTime.textContent = model.uv.timeLabel;
      if (model.uv.timestamp) elements.uvTime.setAttribute('datetime', model.uv.timestamp);
      else elements.uvTime.removeAttribute('datetime');
      elements.uvLabel.textContent = model.uv.label;
      elements.uvCard.dataset.band = model.uv.className;
      elements.uvLongOuting.textContent = model.uv.longOuting;
      elements.uvSunblock.textContent = model.uv.sunblock;
      for (const { measurement, variants } of illustrations) {
        for (const variant of variants)
          variant.hidden = variant.dataset.illustration !== model[measurement].illustration;
      }
      pmScale.render({ ...model.pm25, valueLabel: `${model.pm25.value} µg/m³` });
      psiScale.render(model.psi);
      uvScale.render({ ...model.uv, valueLabel: `${model.uv.value}` });
      elements.statusDot.className = `status-dot ${model.status.warning ? 'warn' : 'ok'}`;
      elements.statusText.textContent = model.status.text;
      const position = model.severity.position;
      elements.position.hidden = !position;
      elements.position.textContent = position?.summary ?? '';

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
