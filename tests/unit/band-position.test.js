import assert from 'node:assert/strict';
import test from 'node:test';
import { describeBandPosition } from '../../src/scripts/domain/band-position.js';

test('distance uses actual entry values of adjacent bands, not the current band ceiling', () => {
  const position = describeBandPosition(140);
  assert.equal(position.nearest, 'Closer to High');
  assert.equal(position.up, '11 µg/m³ below High (151)');
  assert.equal(position.down, '85 µg/m³ above Normal (≤55)');
  assert.equal(position.lower, 55);
  assert.equal(position.upper, 151);
  assert.equal(describeBandPosition(60).nearest, 'Closer to Normal');
  assert.equal(describeBandPosition(103).nearest, 'Midway between Normal and High');
  assert.equal(describeBandPosition(140.25).up, '10.75 µg/m³ below High (151)');
  assert.equal(describeBandPosition(140.25).current, 'Now: 140.25 µg/m³ · Elevated');
});

test('lowest and open-ended highest bands do not invent an adjacent band or maximum', () => {
  assert.equal(describeBandPosition(0).up, '56 µg/m³ below Elevated (56)');
  assert.equal(describeBandPosition(0).down, null);
  assert.equal(describeBandPosition(251).upper, null);
  assert.equal(describeBandPosition(251).up, null);
  assert.equal(describeBandPosition(251).down, '1 µg/m³ above High (≤250)');
  for (const value of [null, undefined, -1, NaN, Infinity, '140']) {
    assert.equal(describeBandPosition(value), null);
  }
});

test('every integer band edge gives a positive distance to the neighbouring band', () => {
  for (const value of [55, 56, 150, 151, 250, 251]) {
    const position = describeBandPosition(value);
    assert.ok(position.down || position.up);
    if (position.upper !== null) assert.ok(position.upper > position.value);
  }
});
