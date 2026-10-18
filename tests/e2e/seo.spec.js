import { test, expect } from '@playwright/test';
import { PAGES, SITE } from '../../tooling/site-pages.js';

for (const entry of PAGES) {
  test(`search metadata, links and no-JS content: /${entry.path}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const response = await page.goto(`/${entry.path}`);
    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(entry.title);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      entry.description,
    );
    await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new URL(entry.path, SITE.url).href,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', entry.title);
    await expect(page.locator('#about')).toContainText('not affiliated');
    await expect(page.locator('.icon-credit a')).toHaveText('Uicons by Flaticon');
    await expect(page.locator('.icon-credit a')).toHaveAttribute(
      'href',
      'https://www.flaticon.com/uicons',
    );
    expect(await page.locator('body').textContent()).not.toMatch(/\{\{|<!-- (include|page):/);
    const schema = JSON.parse(
      await page.locator('script[type="application/ld+json"]').textContent(),
    );
    expect(schema['@graph'][0].url).toBe(new URL(entry.path, SITE.url).href);
    if (entry.path) {
      expect(schema['@graph'][1]['@type']).toBe('BreadcrumbList');
      await expect(page.locator('script[src]')).toHaveCount(0);
    }
    await page.locator('details').evaluateAll((nodes) =>
      nodes.forEach((node) => {
        node.open = true;
      }),
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Overflow at ${width}px`,
      ).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const links = await page
      .locator('a[href]')
      .evaluateAll((nodes) => nodes.map((node) => node.href));
    for (const href of new Set(links)) {
      const url = new URL(href);
      if (url.origin !== new URL(baseURL).origin) continue;
      const target = await context.request.get(url.href);
      expect(target.status(), href).toBe(200);
      if (url.hash) {
        const html = await target.text();
        expect(html, href).toContain(`id="${decodeURIComponent(url.hash.slice(1))}"`);
      }
    }
    const css = await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.href).filter((href) => new URL(href).origin === location.origin),
      );
    expect(css.length).toBeGreaterThan(0);
    for (const href of css) expect((await context.request.get(href)).status()).toBe(200);
    await context.close();
  });
}

test('sitemap lists every deployed canonical page', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  expect(urls).toEqual(PAGES.map((page) => new URL(page.path, SITE.url).href));
  for (const page of PAGES) expect((await request.get(`/${page.path}`)).status()).toBe(200);
});

test('unknown pages return 404 instead of a duplicate homepage', async ({ request }) => {
  expect((await request.get('/guides/not-a-real-guide/')).status()).toBe(404);
});
