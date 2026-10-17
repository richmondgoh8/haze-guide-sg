import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { expandHtmlIncludes } from '../../tooling/html-partials.js';
import { renderStaticFragments } from '../../tooling/static-fragments.js';

test('HTML includes support nested sections and report missing or circular files', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'haze-html-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'one.html'), '<main><!-- include: two.html --></main>');
  writeFileSync(join(root, 'two.html'), '<p>Source content</p>');
  assert.equal(
    expandHtmlIncludes('<!-- include: one.html -->', root),
    '<main><p>Source content</p></main>',
  );
  assert.throws(
    () => expandHtmlIncludes('<!-- include: missing.html -->', root),
    /Cannot read HTML include/,
  );
  assert.throws(
    () => expandHtmlIncludes('<!-- include: ../outside.html -->', root),
    /must stay inside/,
  );
  writeFileSync(join(root, 'two.html'), '<!-- include: one.html -->');
  assert.throws(
    () => expandHtmlIncludes('<!-- include: one.html -->', root),
    /Circular HTML include/,
  );
});

test('static region controls and scale use the same configuration as the client', () => {
  const result = renderStaticFragments(
    '<!-- regions: options --><!-- regions: cards --><!-- regions: hint --><!-- haze: scale -->',
  );
  assert.match(result, /value="east" selected/);
  assert.match(result, /data-region="east" aria-pressed="true"/);
  assert.match(result, /East includes Bedok/);
  assert.equal((result.match(/class="severity-step"/g) || []).length, 4);
  assert.ok(!result.includes('<!--'));
});
