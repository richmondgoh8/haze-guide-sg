# Air, Actually

A Singapore-focused haze guide with official regional air-quality readings and practical next steps.

Live site: https://richmondgoh8.github.io/haze-guide-sg/

## What it shows

- NEA's **1-hour PM2.5 concentration** (µg/m³) for North, South, East, West and Central, with NEA's four official bands. This is the measure to use for immediate outdoor activities.
- NEA's **24-hour PSI** for the selected region. This is a different measure and is useful for the broader picture; the site does not invent or convert it into a one-hour “AQI.”
- Plain-language activity advice following the [NEA personal guide](https://www.haze.gov.sg/resources/1-hr-pm2.5-readings), including guidance for vulnerable people.
- A short mask guide based on the [Ministry of Health haze guidance](https://www.moh.gov.sg/others/haze/).

## Sources and accuracy

The app fetches the public [PM2.5 API](https://api-open.data.gov.sg/v2/real-time/api/pm25) and [PSI API](https://api-open.data.gov.sg/v2/real-time/api/psi) directly from data.gov.sg. Both datasets are supplied by NEA: [PM2.5 dataset](https://data.gov.sg/datasets/d_e1058d6974c877257e32048ab128ad83/view), [PSI dataset](https://data.gov.sg/datasets/d_fe37906a0182569d891506e815e819b7/view). The page displays the source timestamp in Singapore time. If data is missing or more than two hours old, it withholds reading-specific activity advice and links visitors to the official haze site.

This is an independent project and is not an official government website. Readings cover five broad regions, not individual streets or indoor air.

## Run locally

Serve `dist/` with any static HTTP server, for example:

```sh
python3 -m http.server 8000 --directory dist
```

Then open http://localhost:8000. No build, account, API key, server-side code, or dependencies are required.

## Deployment

GitHub Pages serves the `dist/` directory through the included Actions workflow. Every push to `main` redeploys the site. The free URL is `https://richmondgoh8.github.io/haze-guide-sg/`; a custom domain can be added later in the repository's Pages settings.

## Privacy and security

There are no API credentials to expose. The browser requests public government data directly. The only locally stored value is the selected region. The site has no analytics, account system, or user data collection.

## Licence

Site code: MIT. Government data remains subject to the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).
