import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import {
  PAGES,
  SITE,
  pageFile,
  homePath,
  renderMetadata,
  renderSitemap,
  renderPageFragments,
} from '../../tooling/site-pages.js';

test('every canonical page has a real entry and unique search metadata', () => {
  assert.equal(new Set(PAGES.map((page) => page.path)).size, PAGES.length);
  assert.equal(new Set(PAGES.map((page) => page.title)).size, PAGES.length);
  assert.equal(new Set(PAGES.map((page) => page.description)).size, PAGES.length);
  for (const page of PAGES) {
    assert.ok(existsSync(new URL(`../../src/${pageFile(page)}`, import.meta.url)));
    const html = renderMetadata(page);
    assert.ok(html.includes(`rel="canonical" href="${new URL(page.path, SITE.url).href}"`));
    const json = JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/s)[1]);
    assert.equal(json['@graph'][0]['@type'], 'WebPage');
    assert.equal(json['@graph'].length, page.path ? 2 : 1);
  }
});

test('metadata escapes markup and never exposes executable JSON-LD text', () => {
  const page = { ...PAGES[0], title: '"</script><script>alert(1)</script>&' };
  const html = renderMetadata(page);
  assert.ok(html.includes('&quot;&lt;/script&gt;'));
  assert.equal((html.match(/<script/g) || []).length, 1);
  const json = JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/s)[1]);
  assert.equal(json['@graph'][0].name, page.title);
});

test('sitemap includes real canonical URLs without fragments or synthetic live-data dates', () => {
  const sitemap = renderSitemap();
  assert.equal((sitemap.match(/<loc>/g) || []).length, PAGES.length);
  assert.ok(!sitemap.includes('#'));
  assert.ok(!sitemap.split('</url>')[0].includes('<lastmod>'));
});

test('guide links resolve from nested directories and preserve homepage anchors', () => {
  const template = '{{site.home}} <!-- page:guide-links --> {{link.windows}}';
  assert.equal(homePath(PAGES[0]), './');
  assert.equal(homePath(PAGES[1]), '../../');
  assert.ok(renderPageFragments(template, PAGES[0]).endsWith('#window-guide'));
  const guide = renderPageFragments(template, PAGES[1]);
  assert.ok(guide.includes('../../guides/windows-during-haze/'));
  assert.ok(!guide.includes('href="../../guides/haze-masks/"'));
  assert.ok(!guide.includes('{{'));
});
