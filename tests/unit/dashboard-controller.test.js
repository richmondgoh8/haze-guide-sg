import assert from 'node:assert/strict';
import test from 'node:test';
import { createDashboardController } from '../../src/scripts/app/dashboard-controller.js';
import { snapshot, TEST_TIME } from '../fixtures/readings.js';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function setup(loadLatest = async () => snapshot()) {
  const models = [];
  const saved = [];
  let tick;
  let cleared;
  let binds = 0;
  let unbinds = 0;
  let time = TEST_TIME;
  const controller = createDashboardController({
    client: { loadLatest },
    preference: { read: () => 'east', write: (region) => saved.push(region) },
    view: {
      render: (model) => models.push(model),
      bind: () => {
        binds++;
        return () => {
          unbinds++;
        };
      },
    },
    now: () => time,
    scheduler: {
      setInterval: (callback) => {
        tick = callback;
        return 1;
      },
      clearInterval: (id) => {
        cleared = id;
      },
    },
  });
  return {
    controller,
    models,
    saved,
    tick: () => tick(),
    setTime: (value) => {
      time = value;
    },
    lifecycle: () => ({ binds, unbinds, cleared }),
  };
}

test('concurrent refreshes share one request and use the region selected during the request', async () => {
  const request = deferred();
  let calls = 0;
  const { controller, models, saved } = setup(() => {
    calls++;
    return request.promise;
  });
  const first = controller.start();
  assert.equal(controller.refresh(), first);
  controller.selectRegion('north');
  await Promise.resolve();
  assert.equal(calls, 1);
  request.resolve(snapshot());
  await first;
  assert.equal(models.at(-1).pm25.value, 20);
  assert.equal(models.at(-1).region.id, 'north');
  assert.equal(models.at(-1).loading, false);
  assert.deepEqual(saved, ['north']);
  controller.destroy();
});

test('hidden tabs skip polling and returning tabs immediately reevaluate stale advice', async () => {
  let calls = 0;
  const request = deferred();
  const fixture = setup(() => (++calls === 1 ? Promise.resolve(snapshot()) : request.promise));
  await fixture.controller.start();
  fixture.controller.setVisible(false);
  fixture.tick();
  assert.equal(calls, 1);
  fixture.setTime(TEST_TIME + 3 * 60 * 60 * 1000);
  const refresh = fixture.controller.setVisible(true);
  assert.equal(fixture.models.at(-1).windows.state, 'unknown');
  request.resolve(snapshot());
  await refresh;
  fixture.controller.destroy();
});

test('failed requests clear old measurements and stop the busy state', async () => {
  const { controller, models } = setup(async () => {
    throw new Error('Offline');
  });
  await controller.start();
  assert.equal(models.at(-1).pm25.value, '—');
  assert.equal(models.at(-1).loading, false);
  controller.destroy();
});

test('start and destroy are idempotent; teardown aborts requests and ignores late results', async () => {
  const request = deferred();
  let signal;
  const fixture = setup((options) => {
    signal = options.signal;
    return request.promise;
  });
  const pending = fixture.controller.start();
  assert.equal(fixture.controller.start(), pending);
  await Promise.resolve();
  fixture.controller.destroy();
  fixture.controller.destroy();
  const count = fixture.models.length;
  assert.equal(signal.aborted, true);
  request.resolve(snapshot());
  await pending;
  assert.equal(fixture.models.length, count);
  assert.deepEqual(fixture.lifecycle(), { binds: 1, unbinds: 1, cleared: 1 });
});
