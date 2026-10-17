import { REGIONS } from '../config.js';
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
    statusDot: '#status-dot',
    statusText: '#data-status-text',
    levelCaption: '#level-caption',
    position: '#band-position',
    positionTitle: '#band-position-title',
    positionCurrent: '#band-position-current',
    positionMeter: '#band-position-meter',
    positionLower: '#band-position-lower',
    positionUpper: '#band-position-upper',
    positionDown: '#band-distance-down',
    positionUp: '#band-distance-up',
  });
  const steps = [...root.querySelectorAll('.severity-step')].map((element) => ({
    element,
    level: Number(element.dataset.level),
    marker: requireElement(element, '.level-marker'),
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
      elements.pmTitle.textContent = model.pm25.title;
      elements.pmTitle.className = `band-pill ${model.pm25.className}`;
      elements.pmCard.dataset.band = model.pm25.className;
      elements.pmCategory.textContent = model.pm25.category;
      elements.psiValue.textContent = model.psi.value;
      elements.psiLabel.textContent = model.psi.label;
      elements.statusDot.className = `status-dot ${model.status.warning ? 'warn' : 'ok'}`;
      elements.statusText.textContent = model.status.text;
      elements.levelCaption.textContent = model.severity.caption;
      const position = model.severity.position;
      elements.position.hidden = !position;
      elements.position.dataset.band = model.pm25.className;
      elements.positionTitle.textContent = position?.nearest ?? '';
      elements.positionCurrent.textContent = position?.current ?? '';
      elements.positionDown.textContent = position?.down ?? '';
      elements.positionUp.textContent = position?.up ?? '';
      elements.positionDown.hidden = !position?.down;
      elements.positionUp.hidden = !position?.up;
      elements.positionLower.textContent = position?.lowerLabel ?? '';
      elements.positionUpper.textContent = position?.upperLabel ?? '';
      elements.positionMeter.hidden = !position || position.upper === null;
      if (position && position.upper !== null) {
        elements.positionMeter.min = position.lower;
        elements.positionMeter.max = position.upper;
        elements.positionMeter.value = position.value;
        elements.positionMeter.setAttribute(
          'aria-valuetext',
          `${position.value} µg/m³. ${position.nearest}.`,
        );
      }

      for (const { element, level, marker } of steps) {
        const selected = level === model.severity.activeLevel;
        element.classList.toggle('is-current', selected);
        if (selected) element.setAttribute('aria-current', 'step');
        else element.removeAttribute('aria-current');
        marker.textContent = selected ? 'Current level' : '';
      }

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
