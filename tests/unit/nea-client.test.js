import assert from 'node:assert/strict';
import test from 'node:test';
import { createNeaClient, parseReading } from '../../src/scripts/services/nea-client.js';
import { neaPayload, TEST_TIMESTAMP } from '../fixtures/readings.js';

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

test('a PSI failure preserves a current PM2.5 result', async () => {
  const requests = [];
  const client = createNeaClient({
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith('/psi')) return { ok: false, status: 503 };
      return { ok: true, json: async () => neaPayload('pm25') };
    },
  });
  const result = await client.loadLatest();
  assert.equal(result.pm25.values.east, 140);
  assert.equal(result.psi, null);
  assert.deepEqual(result.errors, [{ resource: 'psi', message: 'psi: HTTP 503' }]);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(({ options }) => options.cache === 'no-store' && !options.headers));
});

test('timeouts abort both feeds and return explicit missing measurements', async () => {
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
  assert.equal(result.errors.length, 2);
});

test('caller cancellation reaches both feed requests', async () => {
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
  assert.equal(result.errors.length, 2);
});
