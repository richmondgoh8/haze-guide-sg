import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSnapshot } from '../../src/scripts/domain/reading-snapshot.js';
import { createSnapshotClient } from '../../src/scripts/services/snapshot-client.js';
import { collectSnapshot, mergeSnapshot } from '../../tooling/publish-snapshot.js';
import {
  neaPayload,
  snapshot,
  snapshotPayload,
  TEST_TIME,
  TEST_TIMESTAMP,
} from '../fixtures/readings.js';

test('public snapshots whitelist regions and numeric values while keeping feeds independent', () => {
  const payload = snapshotPayload(0);
  payload.readings.pm25.values.north = '42';
  payload.readings.pm25.values.secret = 'ignore me';
  payload.readings.psi = { timestamp: 'invalid', values: {} };
  const result = parseSnapshot(payload);
  assert.equal(result.pm25.values.east, 0);
  assert.equal(result.pm25.values.north, null);
  assert.equal(Object.hasOwn(result.pm25.values, 'secret'), false);
  assert.equal(result.psi, null);
  assert.throws(() => parseSnapshot({ version: 2 }), /Unsupported/);
});

test('publisher retains last good feed and never relabels its source timestamp', () => {
  const latest = snapshot();
  latest.pm25 = null;
  const old = snapshot(100, '2026-10-17T09:00:00+08:00');
  const merged = mergeSnapshot(latest, old, TEST_TIME);
  assert.equal(merged.readings.pm25.timestamp, old.pm25.timestamp);
  assert.equal(merged.readings.psi.timestamp, TEST_TIMESTAMP);
  assert.equal(merged.generatedAt, new Date(TEST_TIME).toISOString());
  assert.deepEqual(mergeSnapshot(old, snapshot(), TEST_TIME).readings.pm25, snapshot().pm25);
  assert.throws(() => mergeSnapshot({}, {}, TEST_TIME), /keep the existing deployment/);
});

test('publisher rejects future timestamps, keeps old data available for stale warnings', () => {
  const future = snapshot(55, new Date(TEST_TIME + 3600000).toISOString());
  assert.throws(() => mergeSnapshot(future, null, TEST_TIME));
  const old = snapshot(55, new Date(TEST_TIME - 86400000).toISOString());
  assert.equal(mergeSnapshot(future, old, TEST_TIME).readings.pm25.timestamp, old.pm25.timestamp);
});

test('collector makes fixed upstream requests, uses published snapshot on feed failure', async () => {
  const requests = [];
  const payload = snapshotPayload(80);
  const result = await collectSnapshot({
    now: TEST_TIME,
    fetchImpl: async (input) => {
      const url = new URL(input);
      requests.push(url);
      if (url.hostname === 'richmondgoh8.github.io') return { ok: true, json: async () => payload };
      if (url.pathname.endsWith('/pm25')) return { ok: false, status: 503 };
      return { ok: true, json: async () => neaPayload('psi', 100) };
    },
  });
  assert.equal(requests.length, 3);
  assert.equal(result.readings.pm25.values.east, 80);
  assert.equal(result.readings.psi.values.east, 100);
});

test('browser requests one same-site snapshot, not one request per government feed', async () => {
  const calls = [];
  const client = createSnapshotClient({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => snapshotPayload() };
    },
  });
  assert.equal((await client.loadLatest()).pm25.values.east, 140);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, './data/latest.json');
  assert.equal(calls[0].options.cache, 'no-cache');
  assert.equal(calls[0].options.redirect, 'error');
});

test('snapshot client surfaces HTTP failure, timeout and caller cancellation', async () => {
  await assert.rejects(
    createSnapshotClient({ fetchImpl: async () => ({ ok: false, status: 503 }) }).loadLatest(),
    /503/,
  );
  const blockedFetch = (_, { signal }) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) reject(new Error('Aborted'));
      else signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
    });
  await assert.rejects(
    createSnapshotClient({ timeoutMs: 5, fetchImpl: blockedFetch }).loadLatest(),
    /Aborted/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    createSnapshotClient({ fetchImpl: blockedFetch }).loadLatest({ signal: controller.signal }),
    /Aborted/,
  );
});
