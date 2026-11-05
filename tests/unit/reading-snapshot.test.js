import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSnapshot } from '../../src/scripts/domain/reading-snapshot.js';
import { createSnapshotClient } from '../../src/scripts/services/snapshot-client.js';
import { collectSnapshot, mergeSnapshot } from '../../tooling/publish-snapshot.js';
import {
  neaPayload,
  neaUvPayload,
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
  assert.equal(result.uv.value, 7);
  assert.throws(() => parseSnapshot({ version: 2 }), /Unsupported/);
});

test('UV snapshots reject coerced, negative or malformed values without failing the rest', () => {
  for (const uv of [
    null,
    { timestamp: 'invalid', value: 7 },
    { timestamp: TEST_TIMESTAMP, value: '7' },
    { timestamp: TEST_TIMESTAMP, value: -1 },
    { timestamp: TEST_TIMESTAMP, value: Infinity },
  ]) {
    const payload = snapshotPayload();
    payload.readings.uv = uv;
    assert.equal(parseSnapshot(payload).uv, null);
    assert.equal(parseSnapshot(payload).pm25.values.east, 140);
  }
  const payload = snapshotPayload();
  delete payload.readings.uv;
  assert.equal(parseSnapshot(payload).uv, null);
});

test('publisher retains last good feed and never relabels its source timestamp', () => {
  const latest = snapshot();
  latest.pm25 = null;
  const old = snapshot(100, '2026-10-17T09:00:00+08:00');
  const merged = mergeSnapshot(latest, old, TEST_TIME);
  assert.equal(merged.readings.pm25.timestamp, old.pm25.timestamp);
  assert.equal(merged.readings.psi.timestamp, TEST_TIMESTAMP);
  assert.equal(merged.readings.uv.timestamp, TEST_TIMESTAMP);
  assert.equal(merged.generatedAt, new Date(TEST_TIME).toISOString());
  assert.deepEqual(mergeSnapshot(old, snapshot(), TEST_TIME).readings.pm25, snapshot().pm25);
  assert.throws(() => mergeSnapshot({}, {}, TEST_TIME), /keep the existing deployment/);
});

test('publisher retains the last good UV value without relabelling its timestamp', () => {
  const latest = snapshot();
  latest.uv = null;
  const old = snapshot(100, '2026-10-17T09:00:00+08:00');
  old.uv = { timestamp: '2026-10-17T09:00:00+08:00', value: 5 };
  const merged = mergeSnapshot(latest, old, TEST_TIME);
  assert.deepEqual(merged.readings.uv, old.uv);
  const future = snapshot();
  future.uv = { timestamp: new Date(TEST_TIME + 3600000).toISOString(), value: 9 };
  assert.equal(mergeSnapshot(future, old, TEST_TIME).readings.uv.value, 5);
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
      if (url.hostname === 'hazelah.me') return { ok: true, json: async () => payload };
      if (url.pathname.endsWith('/pm25')) return { ok: false, status: 503 };
      if (url.pathname.endsWith('/uv')) return { ok: true, json: async () => neaUvPayload(8) };
      return { ok: true, json: async () => neaPayload('psi', 100) };
    },
  });
  assert.equal(requests.length, 4);
  assert.equal(result.readings.pm25.values.east, 80);
  assert.equal(result.readings.psi.values.east, 100);
  assert.equal(result.readings.uv.value, 8);
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
