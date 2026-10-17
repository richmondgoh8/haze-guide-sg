const paths = {
  walk: '<circle cx="13" cy="4" r="2"/><path d="m8 21 3-7-1-5m5 12-1-6-3-3m-5 0 4-4 5 4h4"/>',
  run: '<circle cx="16" cy="4" r="2"/><path d="m3 19 6-1 3-5m-4-4 4-2 4 5h5m-9-5-2 7 6 3-1 5"/>',
  home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>',
  window:
    '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16m-1-5h2m-2 10h2"/>',
  airflow: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3"/>',
  heat: '<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M12 9v9m6-13h3m-3 5h3"/>',
  mask: '<path d="m5 7 7-3 7 3v7c-2 3-4 5-7 6-3-1-5-3-7-6V7Zm0 1C0 5 0 16 5 15m14-7c5-3 5 8 0 7M9 10h6m-6 4h6"/>',
  fan: '<circle cx="12" cy="10" r="2"/><path d="M10 8C4 2 12 0 13 7m1 3c8-1 5 7 0 3m-4-1c-3 8-9 2-3-1m5 4v6m-5 0h10"/>',
  aircon: '<rect x="2" y="3" width="20" height="9" rx="2"/><path d="M5 9h14M7 15v5m5-5v7m5-7v5"/>',
  purifier:
    '<rect x="6" y="8" width="12" height="14" rx="3"/><path d="M9 12h6m-6 4h6M8 5V2m4 3V1m4 4V2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  cross: '<path d="m6 6 12 12M6 18 18 6"/>',
};

export function renderIcon(name) {
  if (!Object.hasOwn(paths, name)) throw new Error(`Unknown guide icon: ${name}`);
  return `<svg class="visual-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}

export function renderIcons(html) {
  return html.replace(/<!--\s*icon:\s*([a-z]+)\s*-->/g, (_, name) => renderIcon(name));
}
