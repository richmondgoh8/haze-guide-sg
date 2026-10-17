// Household suggestions, not official NEA window-opening thresholds.
export const WINDOW_ADVICE = {
  unknown: {
    state: 'unknown',
    title: 'Check the air first',
    detail:
      'The reading is missing or out of date. Check haze.gov.sg and conditions outside your home.',
  },
  check: {
    state: 'check',
    title: 'Can consider airing',
    detail: 'Air it if outdoor conditions have improved. Normal isn’t pollution-free.',
  },
  reduce: {
    state: 'reduce',
    title: 'Mostly closed for now',
    detail: 'Keep haze out. Air the room when outdoor air improves—even briefly.',
  },
};
