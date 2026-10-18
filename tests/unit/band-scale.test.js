import assert from 'node:assert/strict';
import test from 'node:test';
import { PM25_BANDS, PSI_BANDS } from '../../src/scripts/domain/air-quality.js';
import { getBandScalePosition } from '../../src/scripts/domain/band-scale.js';

test('positions readings within their band instead of at the category centre', () => {
  assert.ok(Math.abs(getBandScalePosition(71, PM25_BANDS) - 0.2921052632) < 1e-9);
  assert.equal(getBandScalePosition(175, PSI_BANDS), 0.55);
  assert.equal(getBandScalePosition(27.5, PM25_BANDS), 0.125);
  assert.equal(getBandScalePosition(102.5, PM25_BANDS), 0.375);
  assert.equal(getBandScalePosition(200, PM25_BANDS), 0.625);
  assert.ok(getBandScalePosition(71, PM25_BANDS) < getBandScalePosition(149, PM25_BANDS));
});

test('zero and finite band ceilings align with segment edges', () => {
  for (const bands of [PM25_BANDS, PSI_BANDS]) {
    assert.equal(getBandScalePosition(0, bands), 0);
    for (const [index, band] of bands.entries()) {
      if (!Number.isFinite(band.limit)) continue;
      assert.equal(getBandScalePosition(band.limit, bands), (index + 1) / bands.length);
      const position = getBandScalePosition(band.limit + 0.1, bands);
      assert.ok(position > (index + 1) / bands.length);
      assert.ok(position < (index + 2) / bands.length);
    }
  }
});

test('the highest band remains a category indicator without an artificial maximum', () => {
  assert.equal(getBandScalePosition(251, PM25_BANDS), 0.875);
  assert.equal(getBandScalePosition(1e9, PM25_BANDS), 0.875);
  assert.equal(getBandScalePosition(301, PSI_BANDS), 0.9);
  assert.equal(getBandScalePosition(1e9, PSI_BANDS), 0.9);
});

test('invalid or absent readings have no marker position', () => {
  for (const value of [null, undefined, '71', '—', NaN, Infinity, -1]) {
    assert.equal(getBandScalePosition(value, PM25_BANDS), null);
    assert.equal(getBandScalePosition(value, PSI_BANDS), null);
  }
});
