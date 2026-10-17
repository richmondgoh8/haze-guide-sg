export const UNAVAILABLE_ACTIVITY = {
  alternativeShort: 'Check the current NEA reading first.',
  walkShort: 'Check the current reading first.',
  maskShort: 'Check the official advisory first.',
  vulnerable: 'Follow your care plan and check the official advisory.',
  walk: 'Check haze.gov.sg before heading out.',
  exercise: 'A current reading is needed for activity advice.',
  mask: 'Check the official advisory and the mask guide below.',
  exerciseTitle: 'Check before exercising outside',
};

export const ACTIVITY_GUIDANCE = {
  1: {
    phrases: [
      { headline: 'Can head out as usual', alternativeShort: 'Usual PCN route, if you feel well.' },
      {
        headline: 'Usual plans can go ahead',
        alternativeShort: 'Park walk or kopi run, if you feel well.',
      },
      {
        headline: 'Outdoor plans? Can, if you feel well',
        alternativeShort: 'Your usual outdoor workout can go ahead.',
      },
      {
        headline: 'Your usual outdoor plans are okay',
        alternativeShort: 'A walk around the neighbourhood, if you feel well.',
      },
    ],
    walkShort: 'Usual pace, if you feel well.',
    maskShort: 'Short commute? Generally no need.',
    walk: 'Your usual walk or trip to the shops can continue.',
    exercise: 'Your usual outdoor exercise can continue if you feel well.',
    exerciseTitle: 'Your usual exercise is okay',
    mask: 'A respirator is generally unnecessary for a short commute or indoors.',
    vulnerable: 'Usual activities can continue. Follow your care plan if you have symptoms.',
  },
  2: {
    phrases: [
      {
        headline: 'Take it easy outside',
        alternativeShort: 'Light stretch at home. PCN run can wait.',
      },
      {
        headline: 'Keep outdoor activity light',
        alternativeShort: 'Put on a playlist. Stretch at home.',
      },
      {
        headline: 'Go lighter on outdoor workouts',
        alternativeShort: 'Easy indoor movement. No need to chiong.',
      },
      {
        headline: 'Ease off the hard outdoor exercise',
        alternativeShort: 'Light indoor stretch, then catch up on your watchlist.',
      },
    ],
    walkShort: 'Gentle pace. Watch for irritation.',
    maskShort: 'Long time out? Check the advisory.',
    walk: 'Keep your walk gentle. Shorten the trip if your eyes or throat feel irritated.',
    exercise: 'No need to chiong. Reduce hard running, fast cycling or sport for the next hour.',
    exerciseTitle: 'Reduce hard outdoor exercise',
    mask: 'A respirator is generally unnecessary for a short commute. For a long period outside, check the latest advisory and your health needs.',
    vulnerable: 'Avoid strenuous outdoor activity for the next hour.',
  },
  3: {
    phrases: [
      {
        headline: 'Outdoor workout? Postpone first',
        alternativeShort: 'Indoor workout or clear your watchlist.',
      },
      {
        headline: 'Move the workout indoors',
        alternativeShort: 'Game night at home. The outdoor run can wait.',
      },
      {
        headline: 'Skip strenuous outdoor exercise',
        alternativeShort: 'Indoor session, then catch up on your shows.',
      },
      {
        headline: 'Save the outdoor workout for clearer air',
        alternativeShort: 'Playlist on. Workout indoors instead.',
      },
    ],
    walkShort: 'Necessary trips: short & gentle.',
    maskShort: 'Long exposure? Well-fitting respirator.',
    walk: 'Keep necessary trips short and gentle. People at higher risk should stay indoors.',
    exercise: 'Avoid strenuous outdoor activity, including hard running, fast cycling and sport.',
    exerciseTitle: 'Move exercise indoors',
    mask: 'For prolonged exposure, or unavoidable outings for higher-risk people, a well-fitting N95, KN95, KF94 or FFP2 can reduce exposure.',
    vulnerable:
      'Avoid all outdoor activity for the next hour. If you must go out, consider a well-fitting respirator and follow medical advice.',
  },
  4: {
    phrases: [
      {
        headline: 'Stay in, skip optional trips',
        alternativeShort: 'Low-key day in. Skip optional outdoor plans.',
      },
      {
        headline: 'Optional outing? Save it for later',
        alternativeShort: 'Clear your watchlist from the sofa. Skip optional trips.',
      },
      {
        headline: 'Keep outdoor trips to a minimum',
        alternativeShort: 'Board games at home. Outdoor plans can wait.',
      },
      {
        headline: 'Stay indoors as much as possible',
        alternativeShort: 'Book, playlist or game night. Keep it indoors.',
      },
    ],
    walkShort: 'Skip trips that can wait.',
    maskShort: 'Must go out? Consider a respirator.',
    walk: 'Minimise time outside. Postpone trips that can wait.',
    exercise: 'Postpone outdoor exercise. Choose an indoor session instead.',
    exerciseTitle: 'Postpone outdoor exercise',
    mask: 'If you must go out, consider a well-fitting N95, KN95, KF94 or FFP2. Keep the outing short even with a mask.',
    vulnerable:
      'Avoid all outdoor activity for the next hour. Seek medical advice if you feel unwell.',
  },
};
