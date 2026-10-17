import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { PAGES } from '../../tooling/site-pages.js';
import { snapshotPayload, TEST_TIME } from '../fixtures/readings.js';
import { REGION_STORAGE_KEY } from '../../src/scripts/config.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((now) => {
    Date.now = () => now;
    window.securityViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.securityViolations.push(event.effectiveDirective);
    });
  }, TEST_TIME);
  await page.route('**/data/latest.json', (route) => route.fulfill({ json: snapshotPayload() }));
});

test('every built page enforces CSP before resources and loads without policy violations', async ({
  page,
}) => {
  for (const entry of PAGES) {
    const response = await page.goto(`/${entry.path}`);
    const html = await response.text();
    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(html.indexOf('http-equiv="Content-Security-Policy"')).toBeLessThan(
      html.indexOf('<script'),
    );
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    for (const content of await page.locator('script:not([src])').allTextContents()) {
      expect(policy).toContain(`'sha256-${createHash('sha256').update(content).digest('base64')}'`);
    }
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => window.securityViolations)).toEqual([]);
    const externalResources = await page
      .locator('script[src], link[rel="stylesheet"]')
      .evaluateAll((nodes) =>
        nodes
          .map((node) => node.src || node.href)
          .filter((url) => new URL(url).origin !== location.origin),
      );
    expect(externalResources).toEqual([]);
    const unsafeLinks = await page
      .locator('a[target="_blank"]')
      .evaluateAll((nodes) =>
        nodes
          .filter(
            (node) => !node.relList.contains('noopener') || !node.relList.contains('noreferrer'),
          )
          .map((node) => node.href),
      );
    expect(unsafeLinks).toEqual([]);
  }
});

test('hostile stored region and URL text cannot become markup or code', async ({ page }) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, '<img src=x onerror=alert(1)>'),
    REGION_STORAGE_KEY,
  );
  await page.goto('/?region=%3Cscript%3Ealert(1)%3C/script%3E#%3Cimg%20src=x%3E');
  await expect(page.locator('#region')).toHaveValue('east');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await expect(
    page.locator('img[onerror], script:not([src]):not([type="application/ld+json"])'),
  ).toHaveCount(0);
});

test('malicious API fields are rejected and do not generate advice or DOM elements', async ({
  page,
}) => {
  const payload = snapshotPayload();
  payload.readings.pm25.values.east = '<img src=x onerror=alert(1)>';
  await page.route('**/data/latest.json', (route) => route.fulfill({ json: payload }));
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('—');
  await expect(page.locator('#window-card')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('img[onerror]')).toHaveCount(0);
  expect(await page.evaluate(() => window.securityViolations)).toEqual([]);
});

test('Trusted Types blocks unsafe HTML sinks without breaking normal refreshes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  const blocked = await page.evaluate(() => {
    try {
      document.createElement('div').innerHTML = '<img src=x onerror=alert(1)>';
      return false;
    } catch (error) {
      return error instanceof TypeError;
    }
  });
  expect(blocked).toBe(true);
  await page.locator('#refresh').click();
  await expect(page.locator('#refresh')).toBeEnabled();
  await expect(page.locator('#pm-value')).toHaveText('140');
});

test('CSP blocks unapproved connections before a network request', async ({ page }) => {
  let attempted = false;
  page.on('request', (request) => {
    if (request.url().includes('security-test.invalid')) attempted = true;
  });
  await page.goto('/');
  const denied = await page.evaluate(async () => {
    try {
      await fetch('https://security-test.invalid/probe');
      return false;
    } catch {
      return true;
    }
  });
  expect(denied).toBe(true);
  await expect.poll(() => page.evaluate(() => window.securityViolations)).toContain('connect-src');
  expect(attempted).toBe(false);
});

test('private and development files are not part of the served build', async ({ request }) => {
  for (const path of [
    '.env',
    '.env.local',
    '.git/config',
    'package.json',
    'package-lock.json',
    'src/scripts/main.js',
    'vite.config.js',
  ]) {
    expect((await request.get(`/${path}`)).status(), path).toBe(404);
  }
});
