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
    title: 'Can consider airing the room',
    detail:
      'The reading is in NEA’s Normal band. If outdoor air has improved, take the chance to air the room. Check local conditions too; Normal does not mean pollution-free.',
  },
  reduce: {
    state: 'reduce',
    title: 'Mostly closed while it’s hazy',
    detail:
      'Limit haze coming in; air the room when outdoor air improves, even temporarily. If it gets hot or stuffy, don’t just tahan. Use the options below.',
  },
};
