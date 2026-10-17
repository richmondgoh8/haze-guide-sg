# Contributing

## Local setup

Use Node.js 24 and npm. `.node-version` records the expected major version.

```sh
npm ci
npm run dev
```

The development server prints its local URL. HTML partials, styles and scripts reload when edited. `npm run preview` serves the most recent production build; run `npm run build` first.

The [architecture guide](docs/ARCHITECTURE.md) explains the data flow and module boundaries.

## Where to make common changes

| Change                                           | Start here                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| Activity wording or indoor alternatives          | `src/scripts/content/advice.js`                                       |
| Window-card wording                              | `src/scripts/content/window-advice.js`                                |
| Band titles, short labels or official thresholds | `src/scripts/domain/air-quality.js`                                   |
| Window/PSI/PM2.5 interpretation                  | Domain rules, model tests, and the cited sources                      |
| Default region or town examples                  | `src/scripts/config.js`; static controls rebuild automatically        |
| API URL, response shape or timeout handling      | `src/scripts/services/nea-client.js`                                  |
| Refresh interval or stale-reading policy         | `src/scripts/config.js`                                               |
| Mask guide or source links                       | `src/sections/masks/` or `src/sections/sources.html`                  |
| Purifier placement and sizing guide              | `src/sections/purifier.html` and `src/styles/components/purifier.css` |
| Typography, shared colours or font scale         | `src/styles/theme.css`                                                |
| Dashboard layout, scale or window card           | `src/styles/dashboard.css`                                            |
| Canonical URL or social metadata                 | `src/partials/head.html`                                              |
| Favicon, sharing image or sitemap                | `public/`                                                             |

Keep the conversational tone in explanatory copy. Keep measurements, official categories, warnings and source attribution precise. For health-content changes, verify the official guidance, update the linked source/review date, and check the static guides as well as the dynamic advice. A threshold update can affect both.

## Adding a section

1. Create an HTML file under `src/sections/` and include it in `src/index.html`.
2. Use semantic headings, visible labels and native controls. Keep essential information in HTML so it is readable without JavaScript.
3. Add a stylesheet to `src/styles/` and import it from `main.css` in the appropriate order.
4. For dynamic content, add the data to the dashboard model and update a view under `src/scripts/ui/`. Reuse the controller's snapshot rather than starting another request from the component.
5. Add a test for the new behaviour at the layer where it belongs.

## Tests

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Unit tests use Node's built-in test runner. They cover thresholds, stale/invalid data, partial API failure, timeouts, storage failure and the controller lifecycle. Prefer testing decisions and failure cases over asserting function internals.

Browser tests build the real site and use fixture API responses from `tests/fixtures/readings.js`. They cover region selection, keyboard focus, partial feed failures, missing/stale data, mobile layouts, text enlargement and guides without JavaScript. They do not depend on live NEA readings or use API credentials.

If you already have a supported Chromium executable, set `CHROMIUM_PATH` when running browser tests. Playwright's normal browser installation is the default. Test reports and traces are ignored by Git.

Run `npm run format` to apply the repository's formatting rules. The dependency lockfile is committed; use `npm ci` for a clean, reproducible installation.

## Deployment and secrets

The Pages workflow installs dependencies, tests, builds and uploads `dist/`. The generated HTML uses relative asset URLs so the site works at a GitHub project path. Keep the canonical URL and `public/sitemap.xml` aligned with the real public URL when forking or moving the site.

The production app is static and uses keyless public NEA endpoints. A browser bundle cannot keep a secret. If a future provider requires a private credential, use a server-side service; do not add it to source, public assets, HTML, or a `VITE_` environment variable. `.env` files are ignored, but that does not make values injected into browser code private.
