import { READING_POLICY } from '../config.js';
import { WINDOW_ADVICE } from '../content/window-advice.js';

export const PM25_BANDS = [
  {
    limit: 55,
    name: 'Normal',
    className: 'normal',
    index: 1,
    title: 'Can head out as usual',
    shortLabel: 'Can go as usual',
    scaleLabel: 'Usual plans',
  },
  {
    limit: 150,
    name: 'Elevated',
    className: 'elevated',
    index: 2,
    title: 'Go easy outdoors, lah',
    shortLabel: 'Take it easy',
    scaleLabel: 'Take it easy',
  },
  {
    limit: 250,
    name: 'High',
    className: 'high',
    index: 3,
    title: 'Outdoor workout? Postpone first',
    shortLabel: 'Workout indoors',
    scaleLabel: 'Skip hard exercise',
  },
  {
    limit: Infinity,
    name: 'Very high',
    className: 'very-high',
    index: 4,
    title: 'Stay in, skip optional trips',
    shortLabel: 'Stay indoors',
    scaleLabel: 'Stay indoors',
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
  return (
    Number.isFinite(age) &&
    age >= -READING_POLICY.allowedClockSkewMs &&
    age <= READING_POLICY.maxAgeMs
  );
}

export function getWindowAdvice(pm25, timestamp, now = Date.now()) {
  const band = classifyPm25(pm25);
  if (!band || !isCurrentReading(timestamp, now)) return WINDOW_ADVICE.unknown;
  return band.index === 1 ? WINDOW_ADVICE.check : WINDOW_ADVICE.reduce;
}
