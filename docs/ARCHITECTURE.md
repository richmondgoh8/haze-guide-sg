# Architecture

This is a static website with a small browser dashboard. It uses native JavaScript modules. Vite assembles the HTML and bundles the assets; it does not run a production server.

## The data flow

```mermaid
flowchart LR
  NEA[NEA public feeds] --> Client[NEA client]
  Client --> Controller[Dashboard controller]
  Preference[Saved region] --> Controller
  Controller --> Model[Pure dashboard model]
  Rules[Air-quality rules and copy] --> Model
  Model --> Readings[Readings view]
  Model --> Advice[Advice view]
  Readings --> HTML[Existing HTML elements]
  Advice --> HTML
```

`src/scripts/main.js` connects the pieces. Start there when explaining the code to someone new.

1. The controller reads the saved region and asks the client for readings.
2. The client requests PM2.5 and PSI independently, checks the responses and normalizes their shape.
3. The controller passes the current snapshot, region and time to `createDashboardModel`.
4. The model selects the readings, freshness state, advice and regional labels. It does not access the DOM, browser storage or network.
5. The views put those values into existing elements. User interactions go back to the controller.

No component fetches its own data or calculates its own haze thresholds.

## Source map

| Location                                    | Responsibility                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| `src/scripts/main.js`                       | Application wiring and tab visibility events                                |
| `src/scripts/config.js`                     | Regions, East default, refresh interval and freshness policy                |
| `src/scripts/services/nea-client.js`        | HTTP requests, cancellation, timeouts and NEA response normalization        |
| `src/scripts/services/region-preference.js` | Read/write the selected region; handle blocked browser storage              |
| `src/scripts/domain/air-quality.js`         | Official band boundaries, PSI labels, freshness and window-advice selection |
| `src/scripts/domain/dashboard-model.js`     | Convert state into the data each view needs                                 |
| `src/scripts/content/`                      | Activity and household advice copy                                          |
| `src/scripts/ui/`                           | DOM references, rendering and event binding                                 |
| `src/sections/`                             | Static page content, grouped by visible section                             |
| `src/sections/masks/`                       | Mask introduction, comparison, band guide and care notes                    |
| `src/partials/`                             | Document head, navigation and footer                                        |
| `src/styles/`                               | Theme, shared styles, component styles and dashboard composition            |
| `public/`                                   | Assets copied unchanged, including favicon, sharing image and sitemap       |
| `tooling/`                                  | HTML assembly used by the development server and production build           |
| `tests/unit/`                               | Fast tests without a browser or external network                            |
| `tests/e2e/`                                | Browser tests against the production build                                  |

## The measurement contract

Only the client knows NEA's raw property names such as `pm25_one_hourly`. The rest of the app receives:

```js
{
  pm25: {
    timestamp: '2026-10-17T10:00:00+08:00',
    values: { north: 20, south: 30, east: 140, west: 80, central: 100 }
  },
  psi: null,
  errors: [{ resource: 'psi', message: 'psi: HTTP 503' }]
}
```

Each measurement can be `null` independently. Individual missing or invalid regional values become `null`; zero is a valid reading. The client rejects malformed responses and selects the newest timestamp if multiple items arrive out of order.

The model accepts only normalized measurements. A provider change belongs in the client adapter and its tests, rather than being patched into the rendering code.

## State and request lifecycle

The controller owns the selected region, current snapshot and loading state. There is one active refresh at a time; repeated requests share its promise. Changing regions during a request is safe because the response is rendered using the latest selected region.

Polling pauses while the tab is hidden. Returning to the tab reevaluates freshness before requesting another snapshot. `destroy()` clears the timer, unbinds events, aborts the request and ignores late results. These behaviours have tests with an injected clock, client and scheduler.

The views cache their element references. Regional buttons remain in the DOM when readings change, so keyboard focus is preserved. Dynamic provider values are assigned with `textContent`, not HTML strings.

## Safety rules and copy

The one-hour PM2.5 bands and the rolling 24-hour PSI remain separate. Current activity and window advice depend on PM2.5; the app never substitutes PSI when PM2.5 is missing.

The two-hour freshness limit and clock-skew allowance are application policies in `config.js`, not NEA health thresholds. Old measurements remain visible with an old-reading label, but current recommendations are withheld.

Window advice is an editorial interpretation of the cited household guidance. It does not calculate indoor air quality, ventilation adequacy or an opening timer. The practical heat exception and source links remain in the static window guide. Keep those explanations consistent when editing the dynamic copy.

## HTML and CSS

`src/index.html` lists sections in reading order. A comment such as `<!-- include: sections/windows.html -->` is expanded before Vite processes the document. Includes are relative to `src/`; nested includes are supported. Missing, out-of-root or circular includes fail the build with a useful error.

`tooling/static-fragments.js` renders region options, regional buttons and the haze scale from the same configuration used by the browser. Their placeholder comments are specific to those repeated components; this is not a general template language. All guides are present in the built HTML, including when JavaScript is disabled.

`src/styles/main.css` declares the import order. All styles share the `site` cascade layer, retaining the existing specificity and order. `theme.css` contains shared design tokens. `components/` holds shared section styles, `guide-components.css` holds detailed guide components, and `dashboard.css` handles the compact dashboard composition. Responsive rules remain with their relevant defaults or in `responsive.css`. Change a component where its existing rule lives; avoid adding a new override file for each edit.

Vite emits hashed JavaScript and CSS filenames into `dist/`. Treat that directory as disposable build output and never edit or commit it.
