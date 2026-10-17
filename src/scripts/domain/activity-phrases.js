import { ACTIVITY_GUIDANCE, UNAVAILABLE_ACTIVITY } from '../content/advice.js';

/** Pick once per page load so polling and region changes don't shuffle the copy. */
export function chooseActivityPhrases(random) {
  return Object.fromEntries(
    Object.entries(ACTIVITY_GUIDANCE).map(([level, { phrases }]) => [
      level,
      Math.floor(random() * phrases.length),
    ]),
  );
}

export function resolveActivityGuidance(level, choice = 0) {
  if (!Object.hasOwn(ACTIVITY_GUIDANCE, level)) return UNAVAILABLE_ACTIVITY;
  const entry = ACTIVITY_GUIDANCE[level];
  const { phrases, ...guidance } = entry;
  const index = Number.isInteger(choice) && choice >= 0 && choice < phrases.length ? choice : 0;
  const phrase = phrases[index];
  return { ...guidance, headline: phrase.headline, alternativeShort: phrase.alternativeShort };
}
