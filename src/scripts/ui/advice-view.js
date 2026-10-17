import { getElements } from './dom.js';

export function createAdviceView(root) {
  const elements = getElements(root, {
    vulnerable: '#action-vulnerable',
    walk: '#activity-walk',
    walkShort: '#activity-walk-short',
    maskShort: '#activity-mask-short',
    exercise: '#activity-exercise',
    mask: '#activity-mask',
    exerciseTitle: '#exercise-verdict',
    exerciseDetail: '#exercise-detail',
    alternative: '#exercise-alternative',
    windowCard: '#window-guide',
    windowTitle: '#window-verdict',
    windowDetail: '#window-detail',
  });

  return {
    render({ activity, windows }) {
      for (const key of [
        'vulnerable',
        'walk',
        'walkShort',
        'maskShort',
        'exercise',
        'mask',
        'exerciseTitle',
      ]) {
        elements[key].textContent = activity[key];
      }
      elements.alternative.textContent = activity.alternativeShort;
      elements.exerciseDetail.textContent = activity.exerciseDetail;
      elements.windowCard.dataset.state = windows.state;
      elements.windowTitle.textContent = windows.title;
      elements.windowDetail.textContent = windows.detail;
    },
  };
}
