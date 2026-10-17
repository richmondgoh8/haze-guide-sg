import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIVITY_GUIDANCE, UNAVAILABLE_ACTIVITY } from '../../src/scripts/content/advice.js';
import {
  chooseActivityPhrases,
  resolveActivityGuidance,
} from '../../src/scripts/domain/activity-phrases.js';

test('random draws select the first and last phrase without crossing bands', () => {
  assert.deepEqual(
    chooseActivityPhrases(() => 0),
    { 1: 0, 2: 0, 3: 0, 4: 0 },
  );
  const choices = chooseActivityPhrases(() => 0.999999);
  for (const [level, { phrases }] of Object.entries(ACTIVITY_GUIDANCE)) {
    assert.equal(choices[level], phrases.length - 1);
    assert.equal(resolveActivityGuidance(level, choices[level]).headline, phrases.at(-1).headline);
  }
});

test('every phrase changes only the headline and alternative, not safety guidance', () => {
  const safetyKeys = [
    'walk',
    'walkShort',
    'exercise',
    'exerciseTitle',
    'mask',
    'maskShort',
    'vulnerable',
    'detail',
  ];
  for (const [level, entry] of Object.entries(ACTIVITY_GUIDANCE)) {
    assert.ok(entry.phrases.length >= 3);
    entry.phrases.forEach((phrase, index) => {
      assert.deepEqual(Object.keys(phrase).sort(), ['alternativeShort', 'headline']);
      assert.ok(phrase.headline.length > 0 && phrase.alternativeShort.length > 0);
      const result = resolveActivityGuidance(level, index);
      for (const key of safetyKeys) assert.equal(result[key], entry[key]);
      assert.equal(result.headline, phrase.headline);
      assert.equal(result.alternativeShort, phrase.alternativeShort);
    });
  }
});

test('invalid phrase choices fall back to the first; missing bands never get playful advice', () => {
  for (const choice of [-1, NaN, Infinity, 999, 0.5, '1', '__proto__']) {
    assert.equal(
      resolveActivityGuidance(2, choice).headline,
      ACTIVITY_GUIDANCE[2].phrases[0].headline,
    );
  }
  for (const level of [null, undefined, 0, 5, '__proto__', 'constructor']) {
    assert.equal(resolveActivityGuidance(level, 2), UNAVAILABLE_ACTIVITY);
  }
});
