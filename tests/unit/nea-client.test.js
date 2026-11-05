import assert from 'node:assert/strict';
import test from 'node:test';
import { createNeaClient, parseReading, parseUv } from '../../src/scripts/services/nea-client.js';
import { neaPayload, neaUvPayload, TEST_TIMESTAMP } from '../fixtures/readings.js';

test('normalizes readings, keeps zero, and rejects coerced or missing values', () => {
  const payload = neaPayload('pm25', 0);
  payload.data.items[0].readings.pm25_one_hourly.north = '42';
  delete payload.data.items[0].readings.pm25_one_hourly.south;
  payload.data.items[0].readings.pm25_one_hourly.west = -1;
  const result = parseReading(payload, 'pm25');
  assert.deepEqual(result, {
    timestamp: TEST_TIMESTAMP,
    values: { north: null, south: null, east: 0, west: null, central: 100 },
  });
});

test('selects the newest source timestamp when items arrive out of order', () => {
  const payload = neaPayload('pm25', 55, '2026-10-17T09:00:00+08:00');
  payload.data.items.push(neaPayload('pm25', 140).data.items[0]);
  assert.equal(parseReading(payload, 'pm25').values.east, 140);
});

test('rejects malformed provider responses', () => {
  for (const payload of [
    null,
    { code: 1 },
    { code: 0, data: { items: [] } },
    neaPayload('pm25', 55, 'invalid'),
  ]) {
    assert.throws(() => parseReading(payload, 'pm25'));
  }
  assert.throws(() => parseReading(neaPayload('pm25'), 'unknown'), /Unknown measurement/);
});

test('UV uses the newest hourly point, keeps zero and rejects invalid values', () => {
  const payload = neaUvPayload(0, '2026-10-17T09:00:00+08:00');
  payload.data.records[0].index.push({
    hour: '2026-10-17T10:00:00+08:00',
    value: 7,
  });
  payload.data.records.push({
    timestamp: '2026-10-17T08:00:00+08:00',
    index: [{ hour: '2026-10-17T08:00:00+08:00', value: 3 }],
  });
  assert.deepEqual(parseUv(payload), { timestamp: '2026-10-17T10:00:00+08:00', value: 7 });
  assert.deepEqual(parseUv(neaUvPayload(0)), { timestamp: TEST_TIMESTAMP, value: 0 });

  for (const invalid of [
    null,
    { code: 1 },
    { code: 0, data: { records: [] } },
    { code: 0, data: { records: [{ index: [{ hour: 'invalid', value: 7 }] }] } },
    { code: 0, data: { records: [{ index: [{ hour: TEST_TIMESTAMP, value: '7' }] }] } },
    { code: 0, data: { records: [{ index: [{ hour: TEST_TIMESTAMP, value: -1 }] }] } },
  ]) {
    assert.throws(() => parseUv(invalid));
  }
});

test('a PSI failure preserves current PM2.5 and UV results', async () => {
  const requests = [];
  const client = createNeaClient({
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith('/psi')) return { ok: false, status: 503 };
      if (url.endsWith('/uv')) return { ok: true, json: async () => neaUvPayload() };
      return { ok: true, json: async () => neaPayload('pm25') };
    },
  });
  const result = await client.loadLatest();
  assert.equal(result.pm25.values.east, 140);
  assert.equal(result.psi, null);
  assert.equal(result.uv.value, 7);
  assert.deepEqual(result.errors, [{ resource: 'psi', message: 'psi: HTTP 503' }]);
  assert.equal(requests.length, 3);
  assert.ok(requests.every(({ options }) => options.cache === 'no-store' && !options.headers));
});

test('timeouts abort every feed and return explicit missing measurements', async () => {
  const client = createNeaClient({
    timeoutMs: 5,
    fetchImpl: (_, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        });
      }),
  });
  const result = await client.loadLatest();
  assert.equal(result.pm25, null);
  assert.equal(result.psi, null);
  assert.equal(result.uv, null);
  assert.equal(result.errors.length, 3);
});

test('caller cancellation reaches every feed request', async () => {
  const controller = new AbortController();
  const signals = [];
  const client = createNeaClient({
    fetchImpl: (_, { signal }) => {
      signals.push(signal);
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        });
      });
    },
  });
  const pending = client.loadLatest({ signal: controller.signal });
  controller.abort();
  const result = await pending;
  assert.ok(signals.every((signal) => signal.aborted));
  assert.equal(result.errors.length, 3);
});
