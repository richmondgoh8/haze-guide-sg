# Air, Actually

A static Singapore haze dashboard using NEA data. It shows what the current reading means for outdoor activity, exercise, masks and windows.

Live site: https://richmondgoh8.github.io/haze-guide-sg/

## What it shows

- NEA's **1-hour PM2.5 concentration** (µg/m³) for North, South, East, West and Central, with NEA's four official bands. This is the measure to use for immediate outdoor activities.
- NEA's **24-hour PSI** for the selected region. This is a different measure and is useful for the broader picture; the site does not invent or convert it into a one-hour “AQI.”
- Plain-language activity advice following the [NEA personal guide](https://www.haze.gov.sg/resources/1-hr-pm2.5-readings), including guidance for vulnerable people.
- A short mask guide based on the [Ministry of Health haze guidance](https://www.moh.gov.sg/others/haze/).
- East is the default region on a first visit. An explicitly chosen region is remembered on that browser.
- The region selector includes town examples from NEA's published region guide. These are reporting regions, not a street-level air-quality estimate.
- A next-hour outdoor activity recommendation, with separate everyday activity, strenuous exercise, mask and higher-risk guidance. Unavailable, stale and invalid timestamps withhold the recommendation.
- A mobile-friendly comparison of cloth, surgical/KF-AD, N95, KN95, KF94 and FFP2 masks, plus KF80, N99/FFP3/KF99, N100/P100, reusable and valved options. The ratings describe laboratory filtration, not guaranteed personal protection.
- A four-step haze scale, with the current level marked in text and colour. The scale uses NEA's existing bands; it is not a separate risk score.
- A three-item checklist for the selected reading. It resets when the region, timestamp or PM2.5 value changes. Checking a box records a decision; it does not indicate protection.

## Window advice

NEA recommends closing windows when outdoor air worsens and reopening them periodically when it improves. It does not publish a one-hour PM2.5 threshold for opening windows.

The window card is an editorial rule, not an official cutoff: at 56 µg/m³ or above it suggests keeping windows closed for now; in the 0–55 band it asks users to check local conditions before airing the room. It never labels outside air as clean or assumes it is better than the air indoors. The detailed guide covers heat, stuffiness and the need to ventilate when conditions improve.

Sources: [NEA household FAQ](https://www.nea.gov.sg/our-services/pollution-control/air-pollution/faqs), [NEA indoor-air guidance](https://www.haze.gov.sg/docs/default-source/faq/detailed-practical-tips-for-manging-iaq-during-haze.pdf).

## Mask comparison and value guidance

Filtration and fit information comes from [HSA](https://www.hsa.gov.sg/announcements/guide-to-masks-and-respirators/), [NIOSH](https://www.cdc.gov/niosh/ppe/respirators/ffr.html), [3M's standards comparison](https://multimedia.3m.com/mws/media/1791500O/comparison-ffp2-kn95-n95-filtering-facepiece-respirator-classes-tb.pdf), [MFDS](https://www.mfds.go.kr/webzine/202002/sub05.html), and [HSE's FFP3 comparison](https://www.hse.gov.uk/research/assets/docs/personal-protective-equipment-selection-for-healthcare-settings.pdf).

The cost guidance is editorial: compare price per mask after testing fit, buy genuine products, and avoid unnecessary premium features. It does not quote live retail prices or assume that one certification is always cheaper. Activity and mask guidance was reviewed on 17 October 2026.

## Mobile and search

The page has responsive reading cards, navigation and mask comparisons, readable mobile body text, and expandable mask comparisons and band guides. Core guidance is in the HTML so it remains readable without JavaScript; live readings require JavaScript. The observed 24-hour PSI is labelled separately from NEA's forecast for future activities.

SEO includes a descriptive title and description, canonical URL, WebPage structured data, a sitemap, and Open Graph/Twitter metadata with a 1200×630 share image. The sitemap is at `/haze-guide-sg/sitemap.xml`. This prepares the page for indexing; it does not guarantee search rankings or submit the site to Search Console. GitHub project sites do not control the domain-root `robots.txt`; no project-level robots file is used as a substitute.

## Sources and accuracy

The app fetches the public [PM2.5 API](https://api-open.data.gov.sg/v2/real-time/api/pm25) and [PSI API](https://api-open.data.gov.sg/v2/real-time/api/psi) directly from data.gov.sg. Both datasets are supplied by NEA: [PM2.5 dataset](https://data.gov.sg/datasets/d_e1058d6974c877257e32048ab128ad83/view), [PSI dataset](https://data.gov.sg/datasets/d_fe37906a0182569d891506e815e819b7/view). The page displays the source timestamp in Singapore time. If data is missing or more than two hours old, it withholds reading-specific activity advice and links visitors to the official haze site.

This is an independent project and is not an official government website. Readings cover five broad regions, not individual streets or indoor air.

## Run locally

Serve `dist/` with any static HTTP server, for example:

```sh
python3 -m http.server 8000 --directory dist
```

Then open http://localhost:8000. The site has no build step or runtime dependencies. Serve it over HTTP so the browser can load the JavaScript modules.

## Code and tests

- `dist/air-quality.js`: NEA bands, timestamp validation, activity copy and the window-advice rule.
- `dist/app.js`: requests, region selection, DOM updates and checklist state.
- `tests/air-quality.test.js`: boundary and failure cases for the advice rules.

Run `npm test` with Node.js 18 or later. No dependency installation is needed. PM2.5 and PSI requests fail independently; a missing PSI response does not suppress current PM2.5 advice.

## Deployment

GitHub Pages serves the `dist/` directory through the included Actions workflow. Every push to `main` redeploys the site. The free URL is `https://richmondgoh8.github.io/haze-guide-sg/`; a custom domain can be added later in the repository's Pages settings.

## Privacy and security

There are no API credentials to expose. The browser requests public government data directly. The only locally stored value is the selected region. The site has no analytics, account system, or user data collection.

## Licence

Site code: MIT. Government data remains subject to the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).
