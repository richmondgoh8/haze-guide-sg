import assert from 'node:assert/strict';
import test from 'node:test';
import { createDashboardModel } from '../../src/scripts/domain/dashboard-model.js';
import { snapshot, TEST_TIME } from '../fixtures/readings.js';

function model(readings, region = 'east', now = TEST_TIME) {
  return createDashboardModel({ readings, region }, now);
}

test('selected region drives values, advice, windows, town examples and selected button', () => {
  const east = model(snapshot());
  assert.equal(east.pm25.value, 140);
  assert.equal(east.severity.activeLevel, 2);
  assert.equal(east.windows.state, 'reduce');
  assert.match(east.region.towns, /Bedok/);
  assert.equal(east.regions.find((region) => region.id === 'east').selected, true);
  const north = model(snapshot(), 'north');
  assert.equal(north.pm25.value, 20);
  assert.equal(north.severity.activeLevel, 1);
  assert.equal(north.windows.state, 'check');
});

test('missing PSI does not suppress PM2.5-based guidance', () => {
  const readings = snapshot();
  readings.psi = null;
  const result = model(readings);
  assert.equal(result.psi.value, '—');
  assert.equal(result.severity.activeLevel, 2);
  assert.equal(result.windows.state, 'reduce');
  assert.equal(result.status.warning, true);
});

test('missing PM2.5 withholds activity guidance even when PSI is available', () => {
  const readings = snapshot();
  readings.pm25 = null;
  const result = model(readings);
  assert.equal(result.psi.value, 143);
  assert.equal(result.severity.activeLevel, null);
  assert.equal(result.windows.state, 'unknown');
  assert.equal(result.activity.className, 'unavailable');
  assert.equal(result.severity.position, null);
});

test('aging readings retain reported values but remove actionable advice and regional recommendations', () => {
  const result = model(snapshot(), 'east', TEST_TIME + 3 * 60 * 60 * 1000);
  assert.equal(result.pm25.value, 140);
  assert.match(result.pm25.category, /Last reported/);
  assert.equal(result.severity.activeLevel, null);
  assert.equal(result.windows.state, 'unknown');
  assert.ok(result.regions.every((region) => region.label === 'Old reading'));
  assert.equal(result.severity.position, null);
});

test('unknown regions fail at the model boundary', () => {
  assert.throws(() => model(snapshot(), 'somewhere'), /Unknown region/);
});

test('short activity verdicts follow the same freshness and band decisions as full advice', () => {
  const readings = snapshot();
  for (const value of [0, 56, 151, 251]) {
    readings.pm25.values.east = value;
    const { activity } = model(readings);
    assert.ok(activity.walkShort.length > 0);
    assert.ok(activity.maskShort.length > 0);
    assert.ok(activity.exerciseTitle.length > 0);
  }
  const stale = model(readings, 'east', TEST_TIME + 3 * 60 * 60 * 1000);
  assert.equal(stale.activity.walkShort, 'Check the current reading first.');
  assert.equal(stale.activity.maskShort, 'Check the official advisory first.');
  readings.pm25 = null;
  assert.equal(model(readings).activity.walkShort, stale.activity.walkShort);
});
