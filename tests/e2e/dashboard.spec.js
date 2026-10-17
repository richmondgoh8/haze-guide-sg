import { test, expect } from '@playwright/test';
import { snapshotPayload, TEST_TIME, TEST_TIMESTAMP } from '../fixtures/readings.js';

const pageErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((now) => {
    Date.now = () => now;
  }, TEST_TIME);
  await page.route('**/data/latest.json', (route) => route.fulfill({ json: snapshotPayload() }));
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
  await expect(page.locator('#window-guide')).toHaveAttribute('data-state', 'reduce');
  await expect(page.locator('#region-towns')).toContainText('Bedok');
  const sourceUrl = new URL(await page.locator('.status-source a').getAttribute('href'));
  expect(sourceUrl.origin).toBe('https://data.gov.sg');
  await expect(page.locator('#mask-comparison-details')).not.toHaveAttribute('open');
  await expect(page.locator('.next-hour-plan, .plan-check')).toHaveCount(0);
  await expect(page.locator('#activity-walk-short')).toHaveText(
    'Gentle pace. Watch for irritation.',
  );
  await expect(page.locator('#activity-exercise-short')).toHaveText('Reduce hard outdoor exercise');
  await expect(page.locator('#action-vulnerable')).toBeVisible();
  await expect(page.locator('#activity-reasoning')).not.toHaveAttribute('open');
  await expect(page.locator('#band-position-title')).toHaveText('Closer to High');
  await expect(page.locator('#band-distance-up')).toHaveText('11 µg/m³ below High (151)');
  await expect(page.locator('#band-distance-down')).toHaveText('85 µg/m³ above Normal (≤55)');
});

test('one shared snapshot request serves all regions; no government API requests', async ({
  page,
}) => {
  const urls = [];
  page.on('request', (request) => urls.push(new URL(request.url())));
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await page.locator('[data-region="north"]').click();
  await expect(page.locator('#pm-value')).toHaveText('20');
  expect(urls.filter((url) => url.pathname.endsWith('/data/latest.json'))).toHaveLength(1);
  expect(urls.some((url) => url.hostname === 'api-open.data.gov.sg')).toBe(false);
});

test('compact decision cards keep heat advice visible and exercise reasoning expandable', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#window-guide .decision-reminder')).toBeVisible();
  await expect(page.locator('#window-guide')).toContainText('Close once comfortable');
  const summary = page.locator('.decision-details > summary');
  await expect(page.locator('#exercise-detail')).not.toBeVisible();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#exercise-detail')).toBeVisible();
});

test('visual summaries keep safety caveats visible and explanations keyboard accessible', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.mask-lab-ratings dl > div')).toHaveCount(4);
  await expect(page.locator('.mask-snapshot .visual-caveat')).toBeVisible();
  await expect(page.locator('#window-guide .decision-reminder')).toBeVisible();
  await expect(page.locator('#purifier-guide .visual-caveat')).toBeVisible();
  const summary = page.locator('#activity-reasoning > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#activity-reasoning')).toHaveAttribute('open');
  await expect(page.locator('#activity-exercise')).toContainText('No need to chiong');
  await page.locator('#window-guide > a').click();
  await expect(page).toHaveURL(/\/guides\/windows-during-haze\/$/u);
  const windowSummary = page.locator('#window-guide > .shell > .visual-details > summary');
  await windowSummary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#window-guide .ventilation-note')).toBeVisible();
});

test('mask guide stays concise and removed sections do not return', async ({ page }) => {
  await page.goto('/');
  const masks = page.locator('#masks');
  await expect(page.getByText('THE PRACTICAL GUIDES', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Which mask, at which haze level?', { exact: true })).toHaveCount(0);
  await expect(page.getByText('04 / A PRACTICAL MASK GUIDE', { exact: true })).toHaveCount(0);
  await expect(page.locator('#mask-band-details, #guides-title')).toHaveCount(0);
  await expect(masks.locator('.mask-infographic')).toHaveCount(1);
  await expect(masks.locator('.mask-fit-figure')).toBeVisible();
  await expect(masks.locator('.mask-fit-strip')).toHaveCount(0);
  await expect(masks.locator('.mask-care-summary')).toBeVisible();
  expect((await masks.innerText()).trim().split(/\s+/u).length).toBeLessThan(250);
  await expect(page.locator('.footer-guides a')).toHaveCount(3);
  const summary = page.locator('#mask-use-details > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mask-use-details')).toHaveAttribute('open');
  await expect(masks).toContainText('pregnant people');
});

test('homepage has one window block and no repeated tips section', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('05 / SMALL, USEFUL MOVES', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Mask on? Fit first.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('WINDOWS CAN OPEN?', { exact: true })).toHaveCount(0);
  await expect(page.locator('.tips-section, .window-guide-section')).toHaveCount(0);
  await expect(page.locator('#window-guide')).toHaveCount(1);
  await expect(page.locator('#window-guide')).toContainText('Not a 24/7 closure rule');
  await expect(page.locator('#window-guide > a')).toHaveAttribute(
    'href',
    './guides/windows-during-haze/',
  );
  await expect(page.locator('#mask-title')).toHaveText('Masks');
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
  await expect(page.locator('#window-guide')).toHaveAttribute('data-state', 'check');
  await page.reload();
  await expect(page.locator('#region')).toHaveValue('north');
  await expect(page.locator('#pm-value')).toHaveText('20');
});

for (const failedResource of ['pm25', 'psi']) {
  test(`a ${failedResource} failure does not discard the other feed`, async ({ page }) => {
    const payload = snapshotPayload();
    payload.readings[failedResource] = null;
    await page.route('**/data/latest.json', (route) => route.fulfill({ json: payload }));
    await page.goto('/');
    await expect(page.locator(failedResource === 'psi' ? '#pm-value' : '#psi-value')).toHaveText(
      failedResource === 'psi' ? '140' : '143',
    );
    await expect(page.locator('#window-guide')).toHaveAttribute(
      'data-state',
      failedResource === 'pm25' ? 'unknown' : 'reduce',
    );
    await expect(page.locator('#refresh')).toBeEnabled();
  });
}

test('stale readings keep reported values but remove current advice', async ({ page }) => {
  const stale = new Date(TEST_TIME - 3 * 60 * 60 * 1000).toISOString();
  await page.route('**/data/latest.json', (route) =>
    route.fulfill({ json: snapshotPayload(140, stale) }),
  );
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await expect(page.locator('#pm-category')).toContainText('Last reported');
  await expect(page.locator('.severity-step[aria-current]')).toHaveCount(0);
  await expect(page.locator('#window-guide')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('[data-region="east"] .region-band')).toHaveText('Old reading');
  await expect(page.locator('#band-position')).not.toBeVisible();
});

test('all band boundaries update the scale and window state', async ({ page }) => {
  let pm25 = 0;
  await page.route('**/data/latest.json', (route) =>
    route.fulfill({ json: snapshotPayload(pm25, TEST_TIMESTAMP) }),
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
    await expect(page.locator('#window-guide')).toHaveAttribute(
      'data-state',
      level === 1 ? 'check' : 'reduce',
    );
    await expect(page.locator('#band-position')).toBeVisible();
    if (level === 4) {
      await expect(page.locator('#band-position-meter')).not.toBeVisible();
      await expect(page.locator('#band-position-title')).toHaveText('Already in the highest band');
    } else {
      await expect(page.locator('#band-position-meter')).toBeVisible();
      await expect(page.locator('#band-position-meter')).toHaveJSProperty('value', value);
    }
  }
});

test('expanded guides fit phone, tablet, desktop and enlarged text', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await page.locator('#mask-comparison-details > summary').click();
  await page.locator('#mask-comparison-details .mask-details > summary').click();
  await page.locator('#mask-use-details > summary').click();
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
