import assert from 'node:assert/strict';
import test from 'node:test';
import { createDashboardModel } from '../../src/scripts/domain/dashboard-model.js';
import { snapshot, TEST_TIME } from '../fixtures/readings.js';

function model(readings, region = 'east', now = TEST_TIME) {
  return createDashboardModel({ readings, region }, now);
}

test('illustrations follow validated bands and never reassure from old data', () => {
  for (const [value, illustration] of [
    [0, 'clear'],
    [56, 'caution'],
    [151, 'mask'],
    [251, 'warning'],
  ]) {
    const readings = snapshot(value);
    assert.equal(model(readings).pm25.illustration, illustration);
    assert.equal(model(readings).psi.illustration, 'air');
    const old = model(readings, 'east', TEST_TIME + 3 * 60 * 60 * 1000);
    assert.equal(old.pm25.illustration, 'unknown');
    assert.equal(old.psi.illustration, 'unknown');
  }
  const missing = model({ pm25: null, psi: null });
  assert.equal(missing.pm25.illustration, 'unknown');
  assert.equal(missing.psi.illustration, 'unknown');
});

test('card time uses the PM2.5 source timestamp, including for old readings', () => {
  const readings = snapshot();
  readings.psi.timestamp = '2026-10-17T09:00:00+08:00';
  const current = model(readings);
  assert.equal(current.pm25.timestamp, readings.pm25.timestamp);
  assert.match(current.pm25.timeLabel, /17 Oct.*10:00.*am SGT/);
  assert.equal(
    model(readings, 'east', TEST_TIME + 3 * 60 * 60 * 1000).pm25.timeLabel,
    current.pm25.timeLabel,
  );
  readings.pm25 = null;
  assert.equal(model(readings).pm25.timestamp, null);
  assert.equal(model(readings).pm25.timeLabel, 'Time unavailable');
});

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
  assert.equal(result.pm25.reportedLevel, 2);
  assert.equal(result.pm25.current, false);
  assert.match(result.pm25.category, /Last reported/);
  assert.equal(result.severity.activeLevel, null);
  assert.equal(result.windows.state, 'unknown');
  assert.ok(result.regions.every((region) => region.label === 'Old reading'));
  assert.equal(result.severity.position, null);
});

test('unknown regions fail at the model boundary', () => {
  assert.throws(() => model(snapshot(), 'somewhere'), /Unknown region/);
});

test('stale or missing readings ignore every phrase choice', () => {
  const readings = snapshot();
  const phraseChoices = { 1: 3, 2: 3, 3: 3, 4: 3 };
  const result = createDashboardModel(
    { readings, region: 'east', phraseChoices },
    TEST_TIME + 3 * 60 * 60 * 1000,
  );
  assert.equal(result.pm25.title, 'Current advice unavailable');
  assert.equal(result.activity.alternativeShort, 'Check the current NEA reading first.');
  readings.pm25 = null;
  const missing = createDashboardModel({ readings, region: 'east', phraseChoices }, TEST_TIME);
  assert.equal(missing.pm25.title, result.pm25.title);
  assert.equal(missing.activity.alternativeShort, result.activity.alternativeShort);
});

test('PM2.5 and PSI colors are independent; old PSI keeps its value but not a current marker', () => {
  const readings = snapshot(20);
  const current = model(readings);
  assert.equal(current.pm25.className, 'normal');
  assert.equal(current.psi.className, 'unhealthy');
  assert.equal(current.psi.activeLevel, 3);
  readings.psi.timestamp = new Date(TEST_TIME - 3 * 60 * 60 * 1000).toISOString();
  const stale = model(readings);
  assert.equal(stale.psi.value, 143);
  assert.equal(stale.psi.className, '');
  assert.equal(stale.psi.activeLevel, null);
  assert.equal(stale.psi.reportedLevel, 3);
  assert.equal(stale.psi.current, false);
  assert.equal(stale.psi.label, 'Unhealthy · Last reported');
  assert.equal(stale.pm25.className, 'normal');
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
