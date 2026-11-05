export const UV_UNAVAILABLE = {
  longOuting: 'Check the current UV index first.',
  sunblock: 'Check the UV reading first.',
  sunblockShort: 'Check the UV reading first.',
};

export const UV_OFF_HOURS = {
  'before-sunrise': {
    label: 'Before 7am',
    longOuting: 'UV-wise, outings are fine before 7am.',
    sunblock: 'No sunblock needed now.',
    sunblockShort: 'No sunblock needed now.',
  },
  'after-sunset': {
    label: 'After sunset',
    longOuting: 'UV-wise, outings are fine after sunset.',
    sunblock: 'No sunblock needed now.',
    sunblockShort: 'No sunblock needed now.',
  },
};

export const UV_GUIDANCE = {
  1: {
    longOuting: 'UV-wise, long outings are fine.',
    sunblock: 'Not essential for a quick errand; optional for long exposure.',
    sunblockShort: 'Not essential for a quick errand.',
  },
  2: {
    longOuting: 'Long outings are okay with sun protection.',
    sunblock: 'Yes when outdoors — SPF 30+.',
    sunblockShort: 'Yes when outdoors — SPF 30+.',
  },
  3: {
    longOuting: 'Keep long outings out of the 11am–3pm peak.',
    sunblock: 'Yes — SPF 30+, shade and a hat.',
    sunblockShort: 'Yes — SPF 30+, shade and a hat.',
  },
  4: {
    longOuting: 'Postpone long outings if you can.',
    sunblock: 'Yes — SPF 30+, shade, hat and sunglasses.',
    sunblockShort: 'Yes — SPF 30+, shade, hat and sunglasses.',
  },
  5: {
    longOuting: 'Avoid long outdoor exposure, especially 11am–3pm.',
    sunblock: 'Yes — SPF 30+, and keep exposure short.',
    sunblockShort: 'Yes — SPF 30+, and keep exposure short.',
  },
};
