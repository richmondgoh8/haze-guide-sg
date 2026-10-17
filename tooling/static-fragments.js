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
  const renderScale = (bands, stepClass) =>
    bands
      .map((band, index) => {
        const lower = index === 0 ? 0 : bands[index - 1].limit + 1;
        const range = Number.isFinite(band.limit) ? `${lower}–${band.limit}` : `≥${lower}`;
        return `<li class="${stepClass}" data-level="${band.index}" data-band="${band.className}"><strong>${escapeHtml(band.name)}</strong><span>${range}</span><small class="level-marker"></small></li>`;
      })
      .join('\n');
  const region = REGIONS.find(({ id }) => id === DEFAULT_REGION);
  const fragments = {
    'regions: options': regionOptions,
    'regions: cards': regionCards,
    'regions: hint': escapeHtml(`${region.name} includes ${region.towns}.`),
    'haze: scale': renderScale(PM25_BANDS, 'severity-step'),
    'psi: scale': renderScale(PSI_BANDS, 'psi-step'),
  };
  return html.replace(
    /<!--\s*(regions: (?:options|cards|hint)|(?:haze|psi): scale)\s*-->/g,
    (_, name) => fragments[name],
  );
}
