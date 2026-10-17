const HOUR_MS = 60 * 60 * 1000;

export const PM25_BANDS = [
  {
    limit: 55,
    name: 'Normal',
    className: 'normal',
    index: 1,
    title: 'Can head out as usual',
    shortLabel: 'Can go as usual',
  },
  {
    limit: 150,
    name: 'Elevated',
    className: 'elevated',
    index: 2,
    title: 'Go easy outdoors, lah',
    shortLabel: 'Take it easy',
  },
  {
    limit: 250,
    name: 'High',
    className: 'high',
    index: 3,
    title: 'Outdoor workout? Postpone first',
    shortLabel: 'Workout indoors',
  },
  {
    limit: Infinity,
    name: 'Very high',
    className: 'very-high',
    index: 4,
    title: 'Stay in, skip optional trips',
    shortLabel: 'Stay indoors',
  },
];

export function classifyPm25(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  return PM25_BANDS.find((band) => value <= band.limit);
}

export function describePsi(value) {
  if (!Number.isFinite(value) || value < 0) return 'Unavailable';
  if (value <= 50) return 'Good';
  if (value <= 100) return 'Moderate';
  if (value <= 200) return 'Unhealthy';
  if (value <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

export function isCurrentReading(timestamp, now = Date.now()) {
  if (!timestamp) return false;
  const age = now - Date.parse(timestamp);
  // Allow publication delay and minor clock differences, but never advise from old data.
  return Number.isFinite(age) && age >= -20 * 60 * 1000 && age <= 2 * HOUR_MS;
}

export const ACTIVITY_GUIDANCE = {
  1: {
    main: 'Usual plans can go ahead if you feel well.',
    detail: 'Going out for a bit? Can. Check the reading again before a long outing.',
    walk: 'Your usual walk or trip to the shops can continue.',
    exercise: 'Your usual outdoor exercise can continue if you feel well.',
    exerciseTitle: 'Your usual exercise is okay',
    alternative:
      'Your usual park connector route can go ahead. Check the air again before setting off.',
    mask: 'A respirator is generally unnecessary for a short commute or indoors.',
    vulnerable: 'Usual activities can continue. Follow your care plan if you have symptoms.',
  },
  2: {
    main: 'Haze is up. Take it easy outside, lah.',
    detail:
      'Cut back on hard exercise for the next hour. Children, older adults, pregnant people and people with heart or lung conditions should avoid strenuous outdoor activity.',
    walk: 'Keep your walk gentle. Shorten the trip if your eyes or throat feel irritated.',
    exercise: 'No need to chiong. Reduce hard running, fast cycling or sport for the next hour.',
    exerciseTitle: 'Reduce hard outdoor exercise',
    alternative:
      'PCN run can wait. Put on a playlist, do a light stretch at home, or save the workout for clearer air.',
    mask: 'A respirator is generally unnecessary for a short commute. For a long period outside, check the latest advisory and your health needs.',
    vulnerable: 'Avoid strenuous outdoor activity for the next hour.',
  },
  3: {
    main: 'Haze is high. Outdoor workout, postpone first.',
    detail:
      'Move exercise indoors for the next hour. People at higher risk should avoid all outdoor activity.',
    walk: 'Keep necessary trips short and gentle. People at higher risk should stay indoors.',
    exercise: 'Avoid strenuous outdoor activity, including hard running, fast cycling and sport.',
    exerciseTitle: 'Move exercise indoors',
    alternative:
      'Indoor workout, game night, or finally clearing your watchlist. The outdoor training can wait.',
    mask: 'For prolonged exposure, or unavoidable outings for higher-risk people, a well-fitting N95, KN95, KF94 or FFP2 can reduce exposure.',
    vulnerable:
      'Avoid all outdoor activity for the next hour. If you must go out, consider a well-fitting respirator and follow medical advice.',
  },
  4: {
    main: 'Haze is very high. Better stay in as much as possible.',
    detail:
      'Postpone optional trips and outdoor exercise. People at higher risk should avoid all outdoor activity.',
    walk: 'Minimise time outside. Postpone trips that can wait.',
    exercise: 'Postpone outdoor exercise. Choose an indoor session instead.',
    exerciseTitle: 'Postpone outdoor exercise',
    alternative:
      'Watchlist, board game, low-key day at home. Skip optional outdoor plans till the air improves.',
    mask: 'If you must go out, consider a well-fitting N95, KN95, KF94 or FFP2. Keep the outing short even with a mask.',
    vulnerable:
      'Avoid all outdoor activity for the next hour. Seek medical advice if you feel unwell.',
  },
};

export function getWindowAdvice(pm25, timestamp, now = Date.now()) {
  const band = classifyPm25(pm25);
  if (!band || !isCurrentReading(timestamp, now)) {
    return {
      state: 'unknown',
      title: 'Check the air first',
      detail:
        'The reading is missing or out of date. Check haze.gov.sg and conditions outside your home.',
    };
  }

  // NEA has no one-hour opening threshold. This is a cautious household suggestion.
  if (band.index === 1) {
    return {
      state: 'check',
      title: 'Can consider airing the room',
      detail:
        'The reading is in NEA’s Normal band. If outdoor air has improved, take the chance to air the room. Check local conditions too; Normal does not mean pollution-free.',
    };
  }

  return {
    state: 'reduce',
    title: 'Mostly closed while it’s hazy',
    detail:
      'Limit haze coming in; air the room when outdoor air improves, even temporarily. If it gets hot or stuffy, don’t just tahan. Use the options below.',
  };
}
