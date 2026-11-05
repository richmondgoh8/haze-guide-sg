import assert from 'node:assert/strict';
import test from 'node:test';
import { getSingaporeHour } from '../../src/scripts/formatters.js';
import { classifyUv, getUvOffHours, resolveUvState } from '../../src/scripts/domain/uv.js';

const now = Date.parse('2026-10-17T10:00:00+08:00');
const current = '2026-10-17T10:00:00+08:00';

test('UV bands follow the international exposure categories', () => {
  for (const [value, index, className] of [
    [0, 1, 'low'],
    [2, 1, 'low'],
    [3, 2, 'moderate'],
    [5, 2, 'moderate'],
    [6, 3, 'high'],
    [7, 3, 'high'],
    [8, 4, 'very-high'],
    [10, 4, 'very-high'],
    [11, 5, 'extreme'],
    [20, 5, 'extreme'],
  ]) {
    assert.equal(classifyUv(value)?.index, index, `UV ${value}`);
    assert.equal(classifyUv(value)?.className, className, `UV ${value}`);
  }
  for (const value of [undefined, null, '7', NaN, Infinity, -1]) {
    assert.equal(classifyUv(value), null);
  }
});

test('Singapore daylight hours determine when UV is not reported', () => {
  assert.equal(getSingaporeHour(Date.parse('2026-10-17T10:00:00+08:00')), 10);
  assert.equal(getUvOffHours(Date.parse('2026-10-17T10:00:00+08:00')), null);
  assert.equal(getUvOffHours(Date.parse('2026-10-17T06:30:00+08:00')), 'before-sunrise');
  assert.equal(getUvOffHours(Date.parse('2026-10-17T19:00:00+08:00')), 'after-sunset');
  assert.equal(getUvOffHours(Date.parse('2026-10-17T23:00:00+08:00')), 'after-sunset');
});

test('current UV readings resolve to sun protection and long-outing advice', () => {
  const state = resolveUvState({ timestamp: current, value: 7 }, now);
  assert.equal(state.state, 'current');
  assert.equal(state.current, true);
  assert.equal(state.band.name, 'High');
  assert.match(state.longOuting, /11am–3pm/);
  assert.match(state.sunblock, /SPF 30\+/);
});

test('old daytime UV keeps its reported value but withholds advice', () => {
  const state = resolveUvState({ timestamp: '2026-10-17T07:00:00+08:00', value: 9 }, now);
  assert.equal(state.state, 'reported');
  assert.equal(state.current, false);
  assert.equal(state.value, 9);
  assert.equal(state.band.index, 4);
  assert.match(state.sunblock, /Check the UV reading/);
});

test('evening and early-morning states override missing or stale readings', () => {
  for (const [timestamp, expected] of [
    ['2026-10-17T20:00:00+08:00', 'after-sunset'],
    ['2026-10-18T06:30:00+08:00', 'before-sunrise'],
  ]) {
    const state = resolveUvState({ timestamp: current, value: 7 }, Date.parse(timestamp));
    assert.equal(state.state, expected);
    assert.equal(state.value, null);
    assert.equal(state.label, expected === 'after-sunset' ? 'After sunset' : 'Before 7am');
    assert.match(state.sunblock, /No sunblock needed/);
  }
});

test('invalid UV is unavailable during the day', () => {
  for (const reading of [
    null,
    { timestamp: 'invalid', value: 7 },
    { timestamp: current, value: -1 },
  ]) {
    const state = resolveUvState(reading, now);
    assert.equal(state.state, 'unavailable');
    assert.equal(state.value, null);
    assert.match(state.sunblock, /Check the UV reading/);
  }
});
