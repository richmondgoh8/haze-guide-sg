import assert from 'node:assert/strict';
import test from 'node:test';
import { createDevReadings, EMPTY_SNAPSHOT } from '../../tooling/dev-readings.js';
import { snapshot, TEST_TIME } from '../fixtures/readings.js';

function clientWith(...readings) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async loadLatest() {
      return readings[Math.min(calls++, readings.length - 1)];
    },
  };
}

test('development readings fetch live data once and reuse it for 15 minutes', async () => {
  let time = TEST_TIME;
  const client = clientWith(snapshot());
  const readings = createDevReadings({ client, now: () => time, warn: () => {} });

  const first = await readings.load();
  assert.equal(first.readings.pm25.values.east, 140);
  assert.equal(first.readings.uv.value, 7);
  assert.equal(client.calls, 1);

  time += 14 * 60 * 1000;
  assert.equal((await readings.load()).readings.pm25.values.east, 140);
  assert.equal(client.calls, 1);

  time += 2 * 60 * 1000;
  await readings.load();
  assert.equal(client.calls, 2);
});

test('development readings retain the last valid feed when an upstream feed fails', async () => {
  let time = TEST_TIME;
  const stale = snapshot();
  stale.uv = null;
  const client = clientWith(snapshot(), stale);
  const readings = createDevReadings({ client, now: () => time, warn: () => {} });
  const first = await readings.load();
  assert.equal(first.readings.uv.value, 7);

  time += 16 * 60 * 1000;
  const second = await readings.load();
  assert.equal(second.readings.uv.value, 7);
  assert.equal(second.readings.pm25.timestamp, stale.pm25.timestamp);
});

test('development readings stay usable when the network is unavailable', async () => {
  const warnings = [];
  const readings = createDevReadings({
    client: {
      async loadLatest() {
        throw new Error('offline');
      },
    },
    now: () => TEST_TIME,
    warn: (message) => warnings.push(message),
  });

  assert.deepEqual(await readings.load(), EMPTY_SNAPSHOT);
  assert.deepEqual(warnings, ['Local readings unavailable: offline']);
});
