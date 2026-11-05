import { isCurrentReading } from './air-quality.js';
import { getSingaporeHour } from '../formatters.js';
import { UV_GUIDANCE, UV_OFF_HOURS, UV_UNAVAILABLE } from '../content/sun-advice.js';

export const UV_BANDS = [
  { limit: 2, name: 'Low', className: 'low', index: 1 },
  { limit: 5, name: 'Moderate', className: 'moderate', index: 2 },
  { limit: 7, name: 'High', className: 'high', index: 3 },
  { limit: 10, name: 'Very high', className: 'very-high', index: 4 },
  { limit: Infinity, name: 'Extreme', className: 'extreme', index: 5 },
];

export function classifyUv(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  return UV_BANDS.find((band) => value <= band.limit);
}

/** UV is not measured or reported between 7pm and 7am in Singapore. */
export function getUvOffHours(now = Date.now()) {
  const hour = getSingaporeHour(now);
  if (hour >= 19) return 'after-sunset';
  if (hour < 7) return 'before-sunrise';
  return null;
}

export function resolveUvState(reading, now = Date.now()) {
  const offHours = getUvOffHours(now);
  if (offHours) {
    return {
      state: offHours,
      band: null,
      current: false,
      value: null,
      ...UV_OFF_HOURS[offHours],
    };
  }

  const band = classifyUv(reading?.value);
  if (!band) {
    return { state: 'unavailable', band: null, current: false, value: null, ...UV_UNAVAILABLE };
  }

  if (!Number.isFinite(Date.parse(reading?.timestamp))) {
    return { state: 'unavailable', band: null, current: false, value: null, ...UV_UNAVAILABLE };
  }

  if (!isCurrentReading(reading.timestamp, now)) {
    return {
      state: 'reported',
      band,
      current: false,
      value: reading.value,
      ...UV_UNAVAILABLE,
    };
  }

  return {
    state: 'current',
    band,
    current: true,
    value: reading.value,
    ...UV_GUIDANCE[band.index],
  };
}
