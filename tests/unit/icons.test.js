import assert from 'node:assert/strict';
import test from 'node:test';
import { renderIcon, renderIcons } from '../../tooling/icons.js';

test('guide icons are build-time decoration with no runtime dependency', () => {
  const icon = renderIcon('mask');
  assert.ok(icon.includes('aria-hidden="true"'));
  assert.ok(icon.includes('focusable="false"'));
  assert.equal(renderIcons('Before <!-- icon: mask --> after'), `Before ${icon} after`);
  assert.equal(renderIcons('<!-- include: example.html -->'), '<!-- include: example.html -->');
  assert.throws(() => renderIcon('unknown'), /Unknown guide icon/);
});
