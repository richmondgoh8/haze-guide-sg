import { getElements } from './dom.js';
import { createReadingsView } from './readings-view.js';
import { createAdviceView } from './advice-view.js';

export function createDashboardView(root) {
  const elements = getElements(root, {
    region: '#region',
    regions: '#regional-list',
    refresh: '#refresh',
  });
  const readings = createReadingsView(root);
  const advice = createAdviceView(root);

  return {
    render(model) {
      readings.render(model);
      advice.render(model);
      elements.refresh.disabled = model.loading;
      elements.refresh.classList.toggle('is-loading', model.loading);
    },
    bind({ onRegionChange, onRefresh }) {
      const select = () => onRegionChange(elements.region.value);
      const choose = (event) => {
        const button = event.target.closest?.('[data-region]');
        if (button && elements.regions.contains(button)) onRegionChange(button.dataset.region);
      };
      const refresh = () => onRefresh();
      elements.region.addEventListener('change', select);
      elements.regions.addEventListener('click', choose);
      elements.refresh.addEventListener('click', refresh);

      return () => {
        elements.region.removeEventListener('change', select);
        elements.regions.removeEventListener('click', choose);
        elements.refresh.removeEventListener('click', refresh);
      };
    },
  };
}
