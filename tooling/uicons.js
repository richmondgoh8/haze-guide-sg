import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import opentype from 'opentype.js';
import { DASHBOARD_ICONS, ICON_CREDIT } from './dashboard-icons.js';

let paths;

/** Convert the pinned font once per build process; no font or parser reaches the browser. */
function loadPaths() {
  const require = createRequire(import.meta.url);
  const directory = dirname(require.resolve(`${ICON_CREDIT.package}/package.json`));
  const metadata = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
  if (metadata.version !== ICON_CREDIT.version) throw new Error('Unexpected Flaticon version.');
  const cssDirectory = resolve(directory, 'css/regular');
  const css = readFileSync(resolve(cssDirectory, 'rounded.css'), 'utf8');
  const fontPath = css.match(/url\(([^)]+\.woff)\)/)?.[1];
  if (!fontPath) throw new Error('Flaticon WOFF source is missing.');
  const data = readFileSync(resolve(cssDirectory, fontPath));
  const font = opentype.parse(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  );
  const codepoints = new Map(
    Array.from(
      css.matchAll(/\.fi-rr-([a-z0-9-]+):before\{content:"\\([a-f0-9]+)"\}/g),
      ([, name, codepoint]) => [name, Number.parseInt(codepoint, 16)],
    ),
  );
  return new Map(
    Object.entries(DASHBOARD_ICONS).map(([name, source]) => {
      const codepoint = codepoints.get(source);
      if (!Number.isInteger(codepoint)) throw new Error(`Missing Flaticon glyph: ${source}`);
      const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
      if (!glyph.index) throw new Error(`Invalid Flaticon glyph: ${source}`);
      const path = glyph.getPath(0, 0, 24);
      const { x1, y1, x2, y2 } = path.getBoundingBox();
      if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1)
        throw new Error(`Empty Flaticon glyph: ${source}`);
      return [name, { viewBox: `${x1} ${y1} ${x2 - x1} ${y2 - y1}`, path: path.toPathData(3) }];
    }),
  );
}

export function renderUicon(name) {
  if (!Object.hasOwn(DASHBOARD_ICONS, name)) throw new Error(`Unknown dashboard icon: ${name}`);
  paths ??= loadPaths();
  const icon = paths.get(name);
  return `<svg class="visual-icon uicon" viewBox="${icon.viewBox}" aria-hidden="true" focusable="false"><path d="${icon.path}"/></svg>`;
}
