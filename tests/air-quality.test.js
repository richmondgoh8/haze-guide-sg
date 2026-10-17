import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyPm25,
  describePsi,
  getWindowAdvice,
  isCurrentReading,
} from '../dist/air-quality.js';

const now = Date.parse('2026-10-17T10:00:00+08:00');
const current = '2026-10-17T10:00:00+08:00';

test('PM2.5 bands follow NEA boundaries', () => {
  for (const [value, index] of [
    [0, 1],
    [55, 1],
    [56, 2],
    [150, 2],
    [151, 3],
    [250, 3],
    [251, 4],
    [600, 4],
  ]) {
    assert.equal(classifyPm25(value)?.index, index, `PM2.5 ${value}`);
  }
  for (const value of [undefined, null, '55', NaN, Infinity, -1]) {
    assert.equal(classifyPm25(value), null);
  }
});

test('PSI labels use their own thresholds', () => {
  for (const [value, label] of [
    [50, 'Good'],
    [51, 'Moderate'],
    [100, 'Moderate'],
    [101, 'Unhealthy'],
    [200, 'Unhealthy'],
    [201, 'Very unhealthy'],
    [300, 'Very unhealthy'],
    [301, 'Hazardous'],
  ]) {
    assert.equal(describePsi(value), label);
  }
});

test('freshness rejects missing, invalid, old and future readings', () => {
  assert.equal(isCurrentReading(current, now), true);
  assert.equal(isCurrentReading('2026-10-17T08:00:00+08:00', now), true);
  for (const value of [
    null,
    '',
    'invalid',
    '2026-10-17T07:59:59+08:00',
    '2026-10-17T10:21:00+08:00',
  ]) {
    assert.equal(isCurrentReading(value, now), false);
  }
});

test('normal PM2.5 permits only conditional airing advice', () => {
  for (const value of [0, 30, 55]) {
    const advice = getWindowAdvice(value, current, now);
    assert.equal(advice.state, 'check');
    assert.match(advice.title, /only if the air has cleared/);
  }
});

test('raised PM2.5 suggests closing windows without prescribing indefinite closure', () => {
  for (const value of [56, 150, 151, 250, 251]) {
    const advice = getWindowAdvice(value, current, now);
    assert.equal(advice.state, 'closed');
    assert.match(advice.detail, /when outside air improves/);
  }
});

test('window advice is withheld without a valid current measurement', () => {
  for (const [value, timestamp] of [
    [-1, current],
    [undefined, current],
    [55, 'invalid'],
    [56, '2026-10-17T07:00:00+08:00'],
  ]) {
    assert.equal(getWindowAdvice(value, timestamp, now).state, 'unknown');
  }
});
