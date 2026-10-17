import { REGIONS } from '../config.js';

export function normalizeMeasurement(value) {
  if (
    !value ||
    typeof value.timestamp !== 'string' ||
    !Number.isFinite(Date.parse(value.timestamp)) ||
    !value.values ||
    typeof value.values !== 'object' ||
    Array.isArray(value.values)
  )
    return null;
  const values = Object.fromEntries(
    REGIONS.map(({ id }) => {
      const reading = value.values[id];
      return [id, Number.isFinite(reading) && reading >= 0 ? reading : null];
    }),
  );
  if (Object.values(values).every((reading) => reading === null)) return null;
  return { timestamp: value.timestamp, values };
}

export function parseSnapshot(payload) {
  if (payload?.version !== 1 || !payload.readings || typeof payload.readings !== 'object') {
    throw new Error('Unsupported reading snapshot');
  }
  return {
    pm25: normalizeMeasurement(payload.readings.pm25),
    psi: normalizeMeasurement(payload.readings.psi),
    errors: [],
  };
}
