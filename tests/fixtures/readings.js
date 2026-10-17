export const TEST_TIME = Date.parse('2026-10-17T10:00:00+08:00');
export const TEST_TIMESTAMP = '2026-10-17T10:00:00+08:00';

export function measurement(east = 140, timestamp = TEST_TIMESTAMP) {
  return { timestamp, values: { north: 20, south: 30, east, west: 80, central: 100 } };
}

export function snapshot(east = 140, timestamp = TEST_TIMESTAMP) {
  return { pm25: measurement(east, timestamp), psi: measurement(143, timestamp), errors: [] };
}

export function snapshotPayload(east = 140, timestamp = TEST_TIMESTAMP) {
  const { pm25, psi } = snapshot(east, timestamp);
  return { version: 1, generatedAt: TEST_TIMESTAMP, readings: { pm25, psi } };
}

export function neaPayload(resource, east = 140, timestamp = TEST_TIMESTAMP) {
  const field = resource === 'pm25' ? 'pm25_one_hourly' : 'psi_twenty_four_hourly';
  return {
    code: 0,
    data: { items: [{ timestamp, readings: { [field]: measurement(east, timestamp).values } }] },
  };
}
