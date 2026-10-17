export const SITE = {
  url: 'https://hazelah.me/haze-guide-sg/',
  name: 'Air, Actually',
  reviewed: '2026-10-17',
};

export const PAGES = [
  {
    path: '',
    title: 'Singapore Haze: Live PSI & 1-Hour PM2.5 | Air, Actually',
    description:
      'Check NEA 1-hour PM2.5 and 24-hour PSI for Singapore. Plan outdoor activities, compare haze masks, and get practical window and air purifier advice.',
    name: 'Singapore haze readings and practical advice',
  },
  {
    path: 'guides/haze-masks/',
    title: 'Singapore Haze Masks: N95, KN95, KF94 & FFP2 | Air, Actually',
    description:
      'Compare haze mask filtration, fit and value in Singapore: N95, KN95, KF94, FFP2, surgical and cloth masks, with MOH and HSA source links.',
    name: 'Haze masks in Singapore',
    heading: 'Haze masks in Singapore: which one is worth it?',
    intro:
      'N95, KN95, KF94 or FFP2? Understand the ratings, find a comfortable seal and avoid paying for features you don’t need. This guide compares masks for haze particles—not infection-control requirements.',
    navLabel: 'Masks',
  },
  {
    path: 'guides/windows-during-haze/',
    title: 'Can You Open Windows During Singapore Haze? | Air, Actually',
    description:
      'When to open or close windows during Singapore haze: balance PM2.5, fresh air and heat, and understand what fans, air-con and purifiers can do.',
    name: 'Windows and ventilation during haze',
    heading: 'Singapore haze: can open windows or not?',
    intro:
      'Keeping haze out matters, but so do heat and fresh air. Here’s how to think about ventilation in an HDB flat or other home, without a rigid “close 24/7” rule or a made-up safe opening timer.',
    navLabel: 'Windows & ventilation',
  },
  {
    path: 'guides/air-purifier-placement/',
    title: 'Air Purifier Placement for HDB Homes & Haze | Air, Actually',
    description:
      'Where to put an air purifier in your Singapore home: bedroom or living room, airflow clearance, smoke CADR, room size, fan speed and filter costs.',
    name: 'Air purifier placement for Singapore homes',
    heading: 'Air purifier placement: make it work for your room.',
    intro:
      'A purifier in the wrong spot can struggle even with a good filter. Start with the room you actually use, leave the airflow clear and check that the unit is sized for that space—not the whole flat by default.',
    navLabel: 'Purifier placement',
  },
];

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}

export function pageFile(page) {
  return `${page.path}index.html`;
}

export function homePath(page) {
  return page.path ? '../'.repeat(page.path.split('/').filter(Boolean).length) : './';
}

export function createPageSchema(page) {
  const url = new URL(page.path, SITE.url).href;
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: 'en-SG',
      spatialCoverage: { '@type': 'Country', name: 'Singapore' },
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${SITE.url}#website`,
        name: SITE.name,
        url: SITE.url,
      },
      ...(page.path ? { dateModified: SITE.reviewed } : {}),
    },
  ];
  if (page.path) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.url },
        { '@type': 'ListItem', position: 2, name: page.name, item: url },
      ],
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function renderMetadata(page) {
  const url = new URL(page.path, SITE.url).href;
  const image = new URL('social-card.png', SITE.url).href;
  const meta = (attribute, name, content) =>
    `<meta ${attribute}="${name}" content="${escapeHtml(content)}" />`;
  return [
    `<title>${escapeHtml(page.title)}</title>`,
    meta('name', 'description', page.description),
    meta('name', 'robots', 'index, follow, max-image-preview:large'),
    `<link rel="canonical" href="${url}" />`,
    `<link rel="sitemap" type="application/xml" href="${homePath(page)}sitemap.xml" />`,
    meta('property', 'og:title', page.title),
    meta('property', 'og:description', page.description),
    meta('property', 'og:url', url),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:locale', 'en_SG'),
    meta('property', 'og:site_name', SITE.name),
    meta('property', 'og:image', image),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', 'Air, Actually: Singapore haze readings and practical guides'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', page.title),
    meta('name', 'twitter:description', page.description),
    meta('name', 'twitter:image', image),
    meta('name', 'twitter:image:alt', 'Air, Actually: Singapore haze guide'),
    `<script type="application/ld+json">${JSON.stringify(createPageSchema(page)).replaceAll('<', '\\u003c')}</script>`,
  ].join('\n');
}

export function renderPageFragments(html, page) {
  const home = homePath(page);
  const introduction = page.path
    ? `<section class="hero" id="top"><div class="shell hero-copy">
        <p><a href="${home}">Singapore haze readings</a> / ${escapeHtml(page.name)}</p>
        <h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.intro)}</p>
        <p>Guidance checked <time datetime="${SITE.reviewed}">17 Oct 2026</time> · Independent guide, not medical advice.</p>
      </div></section>`
    : '';
  const links = PAGES.filter((entry) => entry.path && entry.path !== page.path)
    .map(
      (entry) => `<a href="${home}${entry.path}">${escapeHtml(entry.navLabel ?? entry.name)}</a>`,
    )
    .join('');
  return html
    .replace('<!-- page:metadata -->', renderMetadata(page))
    .replace('<!-- page:introduction -->', introduction)
    .replace('<!-- page:guide-links -->', links)
    .replaceAll('{{site.home}}', home)
    .replaceAll(
      '{{link.windows}}',
      page.path ? `${home}guides/windows-during-haze/` : '#window-guide',
    )
    .replaceAll(
      '{{link.purifier}}',
      page.path ? `${home}guides/air-purifier-placement/` : '#purifier-guide',
    );
}

export function renderSitemap() {
  const urls = PAGES.map(
    (page) =>
      `<url><loc>${new URL(page.path, SITE.url).href}</loc>${page.path ? `<lastmod>${SITE.reviewed}</lastmod>` : ''}</url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
