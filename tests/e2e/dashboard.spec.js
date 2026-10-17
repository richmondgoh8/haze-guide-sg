import { test, expect } from '@playwright/test';
import { neaPayload, TEST_TIME, TEST_TIMESTAMP } from '../fixtures/readings.js';

const pageErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((now) => {
    Date.now = () => now;
  }, TEST_TIME);
  await page.route('**/v2/real-time/api/*', (route) => {
    const resource = route.request().url().endsWith('/pm25') ? 'pm25' : 'psi';
    return route.fulfill({ json: neaPayload(resource, resource === 'pm25' ? 140 : 143) });
  });
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('East loads official values, current advice and source links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#region')).toHaveValue('east');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await expect(page.locator('#psi-value')).toHaveText('143');
  await expect(page.locator('#pm-category')).toContainText('Band 2');
  await expect(page.locator('#window-card')).toHaveAttribute('data-state', 'reduce');
  await expect(page.locator('#region-towns')).toContainText('Bedok');
  const sourceUrl = new URL(await page.locator('.status-source a').getAttribute('href'));
  expect(sourceUrl.origin).toBe('https://data.gov.sg');
  await expect(page.locator('#mask-comparison-details')).not.toHaveAttribute('open');
  await expect(page.locator('.next-hour-plan, .plan-check')).toHaveCount(0);
});

test('keyboard region changes update advice, retain focus and survive a reload', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  const north = page.locator('[data-region="north"]');
  await north.focus();
  await page.keyboard.press('Enter');
  await expect(north).toBeFocused();
  await expect(page.locator('#region')).toHaveValue('north');
  await expect(page.locator('#pm-value')).toHaveText('20');
  await expect(page.locator('#window-card')).toHaveAttribute('data-state', 'check');
  await page.reload();
  await expect(page.locator('#region')).toHaveValue('north');
  await expect(page.locator('#pm-value')).toHaveText('20');
});

for (const failedResource of ['pm25', 'psi']) {
  test(`a ${failedResource} failure does not discard the other feed`, async ({ page }) => {
    await page.route(`**/api/${failedResource}`, (route) =>
      route.fulfill({ status: 503, body: 'Unavailable' }),
    );
    await page.goto('/');
    await expect(page.locator(failedResource === 'psi' ? '#pm-value' : '#psi-value')).toHaveText(
      failedResource === 'psi' ? '140' : '143',
    );
    await expect(page.locator('#window-card')).toHaveAttribute(
      'data-state',
      failedResource === 'pm25' ? 'unknown' : 'reduce',
    );
    await expect(page.locator('#refresh')).toBeEnabled();
  });
}

test('stale readings keep reported values but remove current advice', async ({ page }) => {
  const stale = new Date(TEST_TIME - 3 * 60 * 60 * 1000).toISOString();
  await page.route('**/api/pm25', (route) =>
    route.fulfill({ json: neaPayload('pm25', 140, stale) }),
  );
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await expect(page.locator('#pm-category')).toContainText('Last reported');
  await expect(page.locator('.severity-step[aria-current]')).toHaveCount(0);
  await expect(page.locator('#window-card')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('[data-region="east"] .region-band')).toHaveText('Old reading');
});

test('all band boundaries update the scale and window state', async ({ page }) => {
  let pm25 = 0;
  await page.route('**/api/pm25', (route) =>
    route.fulfill({ json: neaPayload('pm25', pm25, TEST_TIMESTAMP) }),
  );
  await page.goto('/');
  for (const [value, level] of [
    [0, 1],
    [55, 1],
    [56, 2],
    [150, 2],
    [151, 3],
    [250, 3],
    [251, 4],
  ]) {
    pm25 = value;
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('#pm-value')).toHaveText(String(value));
    await expect(page.locator('.severity-step[aria-current]')).toHaveAttribute(
      'data-level',
      String(level),
    );
    await expect(page.locator('#window-card')).toHaveAttribute(
      'data-state',
      level === 1 ? 'check' : 'reduce',
    );
  }
});

test('expanded guides fit phone, tablet, desktop and enlarged text', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await page.locator('#mask-comparison-details > summary').click();
  await page.locator('#mask-comparison-details .mask-details > summary').click();
  await page.locator('#mask-band-details > summary').click();
  await page.locator('#purifier-setup-details > summary').click();
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('purifier setup is keyboard accessible and links back to ventilation advice', async ({
  page,
}) => {
  await page.goto('/#purifier-guide');
  const setup = page.locator('#purifier-setup-details');
  await expect(setup).not.toHaveAttribute('open');
  await setup.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(setup).toHaveAttribute('open', '');
  await expect(
    setup.getByRole('heading', { name: 'Check smoke CADR, not just “HEPA”' }),
  ).toBeVisible();
  await page.locator('#purifier-guide a[href="#window-guide"]').click();
  await expect(page).toHaveURL(/#window-guide$/);
});

test('blocked browser storage still allows region selection', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Blocked');
      },
    }),
  );
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await page.locator('#region').selectOption('north');
  await expect(page.locator('#pm-value')).toHaveText('20');
});

test('guides and SEO metadata are present without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#window-guide')).toContainText('CO₂');
  await expect(page.locator('#masks')).toContainText('N95');
  await expect(page.locator('#purifier-guide')).toContainText('intake and outlet');
  await page.locator('#purifier-setup-details > summary').click();
  await expect(page.locator('#purifier-setup-details')).toContainText('94 m³/h');
  await expect(page.locator('#purifier-guide a').filter({ hasText: 'EPA home' })).toHaveAttribute(
    'href',
    'https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://richmondgoh8.github.io/haze-guide-sg/',
  );
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain(
    'WebPage',
  );
  await context.close();
});
