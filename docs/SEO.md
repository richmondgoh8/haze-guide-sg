# Search visibility

Technical SEO makes a page eligible to be understood and indexed. It does not guarantee indexing, a particular position or traffic. The starting homepage already passed Lighthouse's basic SEO audit; the useful work here is clearer topic pages, trust, discovery and measurement.

## What is in place

- Four static entry points: the dashboard, haze masks, windows during haze, and air purifier placement.
- Unique titles, descriptions, canonical URLs and sharing metadata from `tooling/site-pages.js`.
- A generated sitemap from that same registry. It lists real pages, not section fragments or imaginary town-level feeds.
- A single main heading on each page, crawlable internal links, visible sources and an editorial/corrections section.
- WebPage metadata and guide breadcrumbs. There are no fabricated credentials, product reviews, medical endorsements or live readings in structured data.
- Guides need no JavaScript or NEA API request. The dashboard still fetches current readings in the browser and labels stale/missing data honestly.
- Tests for built URLs, metadata, sitemap, internal links/fragments, assets, no-JavaScript reading and narrow/enlarged-text layouts.

The full guides also remain on the dashboard to preserve existing links and reading flow. Dedicated pages serve focused searches and sharing; they are not extra regional pages with the same text. Google ultimately chooses which URL to show for a query.

## First: connect Search Console

This needs the owner's Google account. It has not been done by a code deployment.

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add a **URL-prefix** property: `https://hazelah.me/haze-guide-sg/`.
3. Choose HTML-tag verification. Put the exact tag Google supplies in `src/partials/head.html`, deploy, then verify. The token is intentionally public; do not share a Google password, session cookie or OAuth credential. Alternatively, put Google's supplied HTML verification file unchanged under `public/`.
4. Submit `https://hazelah.me/haze-guide-sg/sitemap.xml` in Sitemaps.
5. Inspect the homepage and each guide URL. Test the live URL, check the rendered content and selected canonical, then request indexing if appropriate. Repeated requests are not a ranking technique.
6. Watch Pages indexing and crawl errors. A successful deployment or sitemap submission is not confirmation that Google has indexed a page.

Official references: [property setup](https://support.google.com/webmasters/answer/34592), [ownership verification](https://support.google.com/webmasters/answer/9008080), [sitemap submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Priorities for growing useful search traffic

### 1. Answer specific Singapore questions well

The homepage targets Singapore haze, PSI and one-hour PM2.5. The guides cover separate questions: mask differences/value, opening windows, and purifier placement/CADR. These are topic hypotheses, not measured keyword volumes.

Use Search Console's Singapore query/page data to learn what people actually ask. Improve explanations where visitors are still missing an answer. Keep Singlish in the readable copy, while titles and headings clearly name the topic. Avoid adding repeated keywords, hidden text or cloned pages for Bedok/Tampines/Pasir Ris: our data is regional, not neighbourhood-level.

Only create another page when it has a distinct, sourced answer. For example, an explanation of PSI versus one-hour PM2.5 could merit a guide if readers need it. Don't publish arbitrary daily “haze news” pages from unchanged readings.

### 2. Maintain trust around health advice

Keep the maintainer, independence statement, correction route and original sources visible. Change review dates only after a real content check. API timestamps and editorial dates mean different things. Ask a suitably qualified local professional to review health-sensitive explanations if possible; name a reviewer only with permission and a real review.

The site is not an official government or medical service. Structured data must describe visible content, not claim expertise or endorsements we do not have.

### 3. Earn relevant links

Share the useful guide with Singapore community groups, school/parent resources, outdoor clubs and local writers where relevant and welcome. Ask for corrections and feedback, not bulk backlinks. An accurate explanation or useful room-layout graphic is a reason to link. Do not buy link packages, spam forums or add fabricated testimonials. Outreach is an owner task; no external messages have been sent.

### 4. Measure, then iterate

Once there is enough Search Console data, compare meaningful periods (for example 28 days, with the previous period and eventually the same season last year). Haze demand changes with air quality, so more impressions do not by themselves prove better SEO.

Track indexed URLs, non-brand impressions/clicks, query-to-page fit and click-through rate by query/device. Average position is an aggregate, not a promise of what every person sees. Investigate pages getting relevant impressions but few clicks before rewriting titles. Don't change everything after a few quiet days.

Run [PageSpeed Insights](https://pagespeed.web.dev/) on the public homepage and a guide. Lighthouse is a lab test, not a ranking score. A new low-traffic site may not have enough field data for Core Web Vitals. No analytics script is required for Search Console, and none has been added.

### 5. A domain is a branding choice, not a ranking shortcut

The free GitHub Pages URL is crawlable. A short domain or dedicated free subdomain can be easier to remember/share; it does not automatically rank better. Google does not support its separate site-name feature at a subdirectory such as `/haze-guide-sg/`. That limitation does not prevent individual pages from appearing in search.

If changing domains, make a deliberate migration plan. Update `SITE.url`, verification and any hosting configuration, preserve paths, and arrange redirects where the old host supports them. Do not switch canonical URLs before the new host works.

## Hosting and rich-result limits

- Crawlers look for `robots.txt` at the host root, not inside this project directory. The root returned 404 at the audit; that is not a crawl-blocking directive. Do not add a misleading `/haze-guide-sg/robots.txt` as a substitute. Use Search Console to submit the sitemap.
- GitHub Pages controls cache headers. Do not claim a custom header policy that this repository cannot apply.
- A sitemap's `lastmod` is the last significant content update, not the build time or hourly API refresh. The dashboard omits it; guides use the actual guidance review date.
- Google retired FAQ rich results in 2026. Do not add FAQ schema as a promise of extra search space. Breadcrumb markup may help explain the page hierarchy but is not a guaranteed display or ranking boost.

References: [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), [site-name limitations](https://developers.google.com/search/docs/appearance/site-names), [robots.txt location](https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt), [FAQ feature retirement](https://developers.google.com/search/updates).

## Maintaining the implementation

Add a page's metadata to `PAGES` and create its HTML entry under `src/`. Vite's entry list and sitemap are derived from the registry. Reuse sourced section partials where appropriate, but give a new page a real purpose and useful introduction. Shared navigation resolves relative to each entry so project-path hosting still works.

After changes, run `npm test`, `npm run test:e2e`, and `npm run format:check`. Inspect generated HTML, not only the JavaScript-enabled view. Never place credentials in metadata, schema or verification files.
