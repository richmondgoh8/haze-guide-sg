import assert from 'node:assert/strict';
import test from 'node:test';
import { renderIcon, renderIcons } from '../../tooling/icons.js';
import { DASHBOARD_ICONS, ICON_CREDIT } from '../../tooling/dashboard-icons.js';
import { renderUicon } from '../../tooling/uicons.js';

test('guide icons are build-time decoration with no runtime dependency', () => {
  const icon = renderIcon('mask');
  assert.ok(icon.includes('aria-hidden="true"'));
  assert.ok(icon.includes('focusable="false"'));
  assert.equal(renderIcons('Before <!-- icon: mask --> after'), `Before ${icon} after`);
  assert.equal(renderIcons('<!-- include: example.html -->'), '<!-- include: example.html -->');
  assert.throws(() => renderIcon('unknown'), /Unknown guide icon/);
});

test('every allowlisted Flaticon glyph renders deterministic, decorative SVG', () => {
  for (const name of Object.keys(DASHBOARD_ICONS)) {
    const svg = renderUicon(name);
    assert.equal(renderIcon(name), svg);
    assert.equal(renderUicon(name), svg);
    assert.ok(svg.includes('class="visual-icon uicon"'));
    assert.ok(svg.includes('aria-hidden="true"'));
    assert.ok(svg.includes('focusable="false"'));
    assert.ok(svg.includes('<path d="M'));
    assert.doesNotMatch(svg, /NaN|Infinity|<script|<foreignObject|href=|style=/);
  }
  for (const name of ['unknown', '__proto__', '../mask', '<script>']) {
    assert.throws(() => renderUicon(name), /Unknown dashboard icon/);
  }
});

test('the shared footer credits the declared icon source', () => {
  const html = renderIcons('<!-- icons: credit -->');
  assert.ok(html.includes(ICON_CREDIT.label));
  assert.ok(html.includes(`href="${ICON_CREDIT.url}"`));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});
