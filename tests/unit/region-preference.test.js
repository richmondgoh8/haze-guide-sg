import assert from 'node:assert/strict';
import test from 'node:test';
import { createRegionPreference } from '../../src/scripts/services/region-preference.js';

test('defaults to East when no valid choice was saved', () => {
  for (const value of [null, 'invalid']) {
    const preference = createRegionPreference({ getStorage: () => ({ getItem: () => value }) });
    assert.equal(preference.read(), 'east');
  }
});

test('storage failures do not prevent using the dashboard', () => {
  const preference = createRegionPreference({
    getStorage: () => {
      throw new Error('Blocked');
    },
  });
  assert.equal(preference.read(), 'east');
  assert.doesNotThrow(() => preference.write('north'));
});

test('saves valid choices and ignores invalid values', () => {
  let value;
  const preference = createRegionPreference({
    getStorage: () => ({
      getItem: () => value,
      setItem: (key, next) => {
        value = next;
      },
    }),
  });
  preference.write('north');
  preference.write('invalid');
  assert.equal(preference.read(), 'north');
});
