import { READING_POLICY } from '../config.js';
import { WINDOW_ADVICE } from '../content/window-advice.js';

export const PM25_BANDS = [
  {
    limit: 55,
    name: 'Normal',
    className: 'normal',
    index: 1,
    shortLabel: 'Can go as usual',
    scaleLabel: 'Usual plans',
  },
  {
    limit: 150,
    name: 'Elevated',
    className: 'elevated',
    index: 2,
    shortLabel: 'Take it easy',
    scaleLabel: 'Take it easy',
  },
  {
    limit: 250,
    name: 'High',
    className: 'high',
    index: 3,
    shortLabel: 'Workout indoors',
    scaleLabel: 'Skip hard exercise',
  },
  {
    limit: Infinity,
    name: 'Very high',
    className: 'very-high',
    index: 4,
    shortLabel: 'Stay indoors',
    scaleLabel: 'Stay indoors',
  },
];

export function classifyPm25(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  return PM25_BANDS.find((band) => value <= band.limit);
}

export const PSI_BANDS = [
  { limit: 50, name: 'Good', className: 'good', index: 1 },
  { limit: 100, name: 'Moderate', className: 'moderate', index: 2 },
  { limit: 200, name: 'Unhealthy', className: 'unhealthy', index: 3 },
  { limit: 300, name: 'Very unhealthy', className: 'very-unhealthy', index: 4 },
  { limit: Infinity, name: 'Hazardous', className: 'hazardous', index: 5 },
];

export function classifyPsi(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  return PSI_BANDS.find((band) => value <= band.limit);
}

export function describePsi(value) {
  return classifyPsi(value)?.name ?? 'Unavailable';
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
