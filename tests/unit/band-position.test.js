import assert from 'node:assert/strict';
import test from 'node:test';
import { describeBandPosition } from '../../src/scripts/domain/band-position.js';

test('one summary uses the nearest neighbouring band and its actual entry value', () => {
  for (const [value, summary] of [
    [71, '16 µg/m³ above Normal'],
    [140, '11 µg/m³ below High'],
    [60, '5 µg/m³ above Normal'],
    [103, 'Midway between Normal and High'],
    [200.5, 'Midway between Elevated and Very high'],
    [140.25, '10.75 µg/m³ below High'],
    [55.5, '0.5 µg/m³ above Normal'],
  ]) {
    assert.deepEqual(describeBandPosition(value), { summary });
  }
});

test('lowest and open-ended highest bands do not invent an adjacent band or maximum', () => {
  assert.equal(describeBandPosition(0).summary, '56 µg/m³ below Elevated');
  assert.equal(describeBandPosition(251).summary, '1 µg/m³ above High');
  assert.equal(describeBandPosition(1250).summary, '1,000 µg/m³ above High');
  for (const value of [null, undefined, -1, NaN, Infinity, '140']) {
    assert.equal(describeBandPosition(value), null);
  }
});

test('every integer band edge gives a positive distance to the neighbouring band', () => {
  for (const [value, summary] of [
    [55, '1 µg/m³ below Elevated'],
    [56, '1 µg/m³ above Normal'],
    [150, '1 µg/m³ below High'],
    [151, '1 µg/m³ above Elevated'],
    [250, '1 µg/m³ below Very high'],
    [251, '1 µg/m³ above High'],
  ]) {
    assert.equal(describeBandPosition(value).summary, summary);
  }
});
