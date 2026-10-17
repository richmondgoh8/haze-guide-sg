import { getElements } from './dom.js';

export function createAdviceView(root) {
  const elements = getElements(root, {
    region: '#action-region',
    status: '#action-status',
    main: '#action-main',
    detail: '#action-detail',
    vulnerable: '#action-vulnerable',
    summary: '#outdoor-verdict',
    summaryCard: '#outdoor-summary',
    walk: '#activity-walk',
    walkShort: '#activity-walk-short',
    maskShort: '#activity-mask-short',
    exerciseShort: '#activity-exercise-short',
    exercise: '#activity-exercise',
    mask: '#activity-mask',
    exerciseTitle: '#exercise-verdict',
    exerciseDetail: '#exercise-detail',
    alternative: '#exercise-alternative',
    windowCard: '#window-card',
    windowTitle: '#window-verdict',
    windowDetail: '#window-detail',
  });

  return {
    render({ activity, windows, region }) {
      elements.region.textContent = `${region.name} · Next hour`;
      for (const key of [
        'status',
        'main',
        'detail',
        'vulnerable',
        'summary',
        'walk',
        'walkShort',
        'maskShort',
        'exercise',
        'mask',
        'exerciseTitle',
        'alternative',
      ]) {
        elements[key].textContent = activity[key];
      }
      elements.summaryCard.dataset.band = activity.className;
      elements.exerciseShort.textContent = activity.exerciseTitle;
      elements.exerciseDetail.textContent = activity.exerciseDetail;
      elements.windowCard.dataset.state = windows.state;
      elements.windowTitle.textContent = windows.title;
      elements.windowDetail.textContent = windows.detail;
    },
  };
}
