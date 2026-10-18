import { DEFAULT_REGION, REGIONS } from '../src/scripts/config.js';
import { PM25_BANDS, PSI_BANDS } from '../src/scripts/domain/air-quality.js';

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
}

export function renderStaticFragments(html) {
  const regionOptions = REGIONS.map(
    ({ id, name }) =>
      `<option value="${escapeHtml(id)}"${id === DEFAULT_REGION ? ' selected' : ''}>${escapeHtml(name)}</option>`,
  ).join('\n');
  const regionCards = REGIONS.map(({ id, name }) => {
    const selected = id === DEFAULT_REGION;
    return `<button class="region-item${selected ? ' selected' : ''}" type="button" data-region="${escapeHtml(id)}" aria-pressed="${selected}">
      <span class="region-name">${escapeHtml(name)}</span>
      <span class="region-reading"><span class="region-value">—</span> <small>µg/m³</small></span>
      <span class="region-band">Checking…</span><span class="region-arrow" aria-hidden="true">↗</span>
    </button>`;
  }).join('\n');
  const renderScale = (bands, id) => {
    const ranges = bands.map((band, index) => {
      const lower = index === 0 ? 0 : bands[index - 1].limit + 1;
      const range = Number.isFinite(band.limit) ? `${lower}–${band.limit}` : `≥${lower}`;
      return { name: band.name, range };
    });
    const description = ranges.map(({ name, range }) => `${name}: ${range}`).join('; ');
    const segments = bands
      .map(
        (band, index) =>
          `<rect x="${index * 100}" y="18" width="100" height="12" data-band="${band.className}" />`,
      )
      .join('');
    const rangeLabels = ranges
      .map(({ range }) => `<span role="listitem">${escapeHtml(range)}</span>`)
      .join('');
    return `<figure class="band-scale" id="${id}" aria-label="${escapeHtml(description)}. No current reading.">
      <svg viewBox="0 0 ${bands.length * 100} 36" preserveAspectRatio="none" role="img" aria-label="NEA bands, lower to higher">
        <defs><clipPath id="${id}-track"><rect x="0" y="18" width="${bands.length * 100}" height="12" rx="6" /></clipPath></defs>
        <g class="scale-track" clip-path="url(#${id}-track)">${segments}</g>
        <path class="scale-marker" d="M-6 2H6L0 12Z" hidden />
      </svg>
      <figcaption>
        <div class="scale-labels"><span>${escapeHtml(bands[0].name)}</span><span>${escapeHtml(bands.at(-1).name)}</span></div>
        <div class="scale-ranges" data-band-count="${bands.length}" role="list" aria-label="Band ranges">${rangeLabels}</div>
        <p class="scale-note">Equal-width bands; highest band shows category only.</p>
      </figcaption>
    </figure>`;
  };
  const region = REGIONS.find(({ id }) => id === DEFAULT_REGION);
  const fragments = {
    'regions: options': regionOptions,
    'regions: cards': regionCards,
    'regions: hint': escapeHtml(`${region.name} includes ${region.towns}.`),
    'haze: scale': renderScale(PM25_BANDS, 'pm-scale'),
    'psi: scale': renderScale(PSI_BANDS, 'psi-scale'),
  };
  return html.replace(
    /<!--\s*(regions: (?:options|cards|hint)|(?:haze|psi): scale)\s*-->/g,
    (_, name) => fragments[name],
  );
}
