import { test, expect } from '@playwright/test';
import { snapshotPayload, TEST_TIME, TEST_TIMESTAMP } from '../fixtures/readings.js';

const pageErrors = new WeakMap();

async function expectMarkerPosition(page, scaleId, expectedX) {
  const marker = page.locator(`#${scaleId} .scale-marker`);
  await expect(marker).toBeVisible();
  await expect
    .poll(() => marker.evaluate((element) => element.transform.baseVal.getItem(0).matrix.e))
    .toBeCloseTo(expectedX, 3);
}

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
  await expect(page.locator('#pm-card')).toHaveAttribute('data-band', 'elevated');
  await expect(page.locator('#psi-card')).toHaveAttribute('data-band', 'unhealthy');
  await expect(page.locator('#psi-scale')).toHaveAttribute('data-level', '3');
  await expectMarkerPosition(page, 'psi-scale', 243);
  await expect(page.locator('#psi-scale')).toHaveAttribute('aria-label', 'Now: 143, Unhealthy.');
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
  await expect(page.locator('#exercise-verdict')).toHaveText('Reduce hard outdoor exercise');
  await expect(page.locator('#action-vulnerable')).toBeVisible();
  await expect(page.locator('#activity-reasoning')).not.toHaveAttribute('open');
  await expect(page.locator('#band-position')).toHaveText('11 µg/m³ below High');
  await expect(page.locator('#pm-scale [aria-current="true"]')).toHaveText('56–150');
  await expect(page.locator('#psi-scale [aria-current="true"]')).toHaveText('101–200');
  await expect(page.locator('#pm-scale [aria-current="true"]')).toHaveCSS('font-weight', '700');
  await expect(page.locator('#pm-scale [aria-current="true"]')).toHaveCSS(
    'text-decoration-line',
    'underline',
  );
});

test('dropdown choice is remembered without cookies', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('#region').selectOption('west');
  await expect(page.locator('#pm-value')).toHaveText('80');
  await page.reload();
  await expect(page.locator('#region')).toHaveValue('west');
  await expect(page.locator('#pm-value')).toHaveText('80');
  expect(await context.cookies()).toEqual([]);
});

test('illustrations follow fresh readings independently and turn neutral when stale or missing', async ({
  page,
}) => {
  let payload = snapshotPayload();
  await page.route('**/data/latest.json', (route) => route.fulfill({ json: payload }));
  await page.goto('/');
  const pm = page.locator('#pm-illustration > [data-illustration]:visible');
  const psi = page.locator('#psi-illustration > [data-illustration]:visible');
  for (const [value, key] of [
    [20, 'clear'],
    [100, 'caution'],
    [200, 'mask'],
    [300, 'warning'],
  ]) {
    payload = snapshotPayload(value);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('#pm-value')).toHaveText(String(value));
    await expect(pm).toHaveCount(1);
    await expect(pm).toHaveAttribute('data-illustration', key);
    await expect(pm.locator('svg')).toHaveCount(key === 'warning' ? 2 : 1);
    await expect(psi).toHaveAttribute('data-illustration', 'air');
  }
  payload = snapshotPayload(20);
  payload.readings.psi.timestamp = new Date(TEST_TIME - 3 * 60 * 60 * 1000).toISOString();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(pm).toHaveAttribute('data-illustration', 'clear');
  await expect(psi).toHaveAttribute('data-illustration', 'unknown');
  payload.readings.pm25.timestamp = payload.readings.psi.timestamp;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(pm).toHaveAttribute('data-illustration', 'unknown');
  await expect(page.locator('#pm-card')).toHaveAttribute('data-band', '');
  payload.readings.pm25 = null;
  payload.readings.psi = null;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('#pm-value')).toHaveText('—');
  await expect(pm).toHaveAttribute('data-illustration', 'unknown');
  await expect(psi).toHaveAttribute('data-illustration', 'unknown');
});

test('dashboard icons are inline decoration with no icon-font or vendor requests', async ({
  page,
}) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await expect(page.locator('.reading-status .uicon')).toHaveCount(8);
  await expect(page.locator('.decision-heading .uicon')).toHaveCount(2);
  const icons = await page.locator('.uicon').evaluateAll((nodes) =>
    nodes.map((node) => ({
      hidden: node.getAttribute('aria-hidden'),
      focusable: node.getAttribute('focusable'),
      fill: getComputedStyle(node).fill,
      stroke: getComputedStyle(node).stroke,
      paths: node.querySelectorAll('path[d]').length,
    })),
  );
  for (const icon of icons) {
    expect(icon.hidden).toBe('true');
    expect(icon.focusable).toBe('false');
    expect(icon.fill).not.toBe('none');
    expect(icon.stroke).toBe('none');
    expect(icon.paths).toBe(1);
  }
  expect(requests.filter((url) => /flaticon|uicons|opentype/i.test(url))).toEqual([]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    if (width >= 768) {
      const pmMeter = await page.locator('#pm-scale').boundingBox();
      const psiMeter = await page.locator('#psi-scale').boundingBox();
      expect(pmMeter.y).toBeCloseTo(psiMeter.y, 0);
    }
    for (const selector of ['#pm-scale', '#psi-scale']) {
      const colours = await page.locator(selector).evaluate((scale) => ({
        status: getComputedStyle(scale.closest('.reading-card').querySelector('.reading-status'))
          .backgroundColor,
        context: getComputedStyle(scale.closest('.reading-context')).backgroundColor,
      }));
      expect(colours.status).not.toBe('rgba(0, 0, 0, 0)');
      expect(colours.status).not.toBe(colours.context);
      const illustration = await page.locator('#pm-illustration').boundingBox();
      const value = await page.locator('#pm-value').boundingBox();
      expect(
        illustration.x >= value.x + value.width || illustration.y >= value.y + value.height,
      ).toBe(true);
    }
  }
});

test('region hint supports hover, keyboard and dismissal without a text row', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Remembering your region' });
  const tooltip = page.getByRole('tooltip', { includeHidden: true });
  await expect(tooltip).toBeHidden();
  await expect(page.locator('p.region-memory')).toHaveCount(0);
  await trigger.hover();
  await expect(tooltip).toBeVisible();
  await tooltip.hover();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await page.locator('#region').focus();
  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await page.setViewportSize({ width: 320, height: 800 });
  await page.mouse.move(0, 0);
  await page.locator('#region').focus();
  await trigger.dispatchEvent('click');
  await expect(tooltip).toBeVisible();
  const box = await tooltip.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await page.locator('#readings-title').click();
  await expect(tooltip).toBeHidden();
});

test.describe('touch region hint', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 800 } });

  test('taps open and dismiss the hint, including with enlarged text', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Remembering your region' });
    const tooltip = page.getByRole('tooltip', { includeHidden: true });
    for (const size of ['100%', '200%']) {
      await page.evaluate((value) => {
        document.documentElement.style.fontSize = value;
      }, size);
      await trigger.tap();
      await expect(tooltip).toBeVisible();
      const box = await tooltip.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
      await page.locator('#readings-title').tap();
      await expect(tooltip).toBeHidden();
    }
  });
});

test('reading header shows source time in Singapore, not the browser clock', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#pm-time')).toHaveAttribute('datetime', TEST_TIMESTAMP);
  await expect(page.locator('#pm-time')).toContainText('17 Oct');
  await expect(page.locator('#pm-time')).toContainText('10:00 am SGT');
  await expect(page.getByText('AIR OUTSIDE · PAST HOUR', { exact: true })).toHaveCount(0);
  await page.route('**/data/latest.json', (route) => {
    const payload = snapshotPayload();
    payload.readings.pm25 = null;
    return route.fulfill({ json: payload });
  });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('#pm-time')).toHaveText('Time unavailable');
  await expect(page.locator('#pm-time')).not.toHaveAttribute('datetime');
});

test('mask buying checks are compact, source-linked and available on the standalone guide', async ({
  page,
}) => {
  await page.goto('/guides/haze-masks/');
  const details = page.locator('#mask-buying-details');
  await expect(details).not.toHaveAttribute('open');
  await details.locator('summary').click();
  await expect(details.locator('.mask-buying-grid article')).toHaveCount(3);
  await expect(details).toContainText('don’t verify KN95, KF94 or FFP2 claims');
  await expect(details.getByRole('link', { name: 'ScamShield 1799' })).toHaveAttribute(
    'href',
    'tel:1799',
  );
  await expect(details.getByRole('link', { name: 'HSA buying advice ↗' })).toHaveAttribute(
    'href',
    'https://www.hsa.gov.sg/announcements/guide-to-masks-and-respirators/',
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('band-specific phrases appear in the main card and stay stable during use', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.999999;
  });
  await page.goto('/');
  await expect(page.locator('#pm-band')).toHaveText('Ease off the hard outdoor exercise');
  await expect(page.locator('#exercise-alternative')).toHaveText(
    'Light indoor stretch, then catch up on your watchlist.',
  );
  await expect(page.locator('#exercise-verdict')).toHaveText('Reduce hard outdoor exercise');
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('#pm-band')).toHaveText('Ease off the hard outdoor exercise');
  await page.locator('#region').selectOption('north');
  await expect(page.locator('#pm-band')).toHaveText('Your usual outdoor plans are okay');
  await page.locator('#region').selectOption('east');
  await expect(page.locator('#exercise-alternative')).toHaveText(
    'Light indoor stretch, then catch up on your watchlist.',
  );
});

test('readings use joined colour bars and the oversized activity section is gone', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.locator('.action-section, .action-intro, .reading-scale, #band-position-meter'),
  ).toHaveCount(0);
  await expect(page.getByText('Still going out?', { exact: false })).toHaveCount(0);
  await expect(page.locator('#pm-scale .scale-track > rect')).toHaveCount(4);
  await expect(page.locator('#psi-scale .scale-track > rect')).toHaveCount(5);
  await expect(page.locator('#action-vulnerable')).toBeVisible();
  await expect(page.locator('#activity-walk-short')).toBeVisible();
  await expect(page.locator('#activity-mask-short')).toBeVisible();
  await expect(page.locator('#pm-scale .scale-ranges')).toHaveText('0–5556–150151–250≥251');
  await expect(page.locator('#psi-scale .scale-ranges')).toHaveText('0–5051–100101–200201–300≥301');
  await expect(page.locator('.scale-note')).toHaveCount(2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .getByRole('navigation', { name: 'Page sections' })
    .getByRole('link', { name: 'Outdoors', exact: true })
    .click();
  await expect(page).toHaveURL(/#what-to-do$/u);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const id of ['pm-scale', 'psi-scale']) {
      const dimensions = await page.locator(`#${id} svg`).boundingBox();
      expect(dimensions.height).toBeLessThan(60);
    }
  }
});

test('range labels stay aligned and readable at phone widths and enlarged text', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await page.evaluate(() => document.fonts.ready);
  const baseFontSize = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).fontSize),
  );
  for (const zoom of [1, 2]) {
    await page.evaluate((size) => {
      document.documentElement.style.fontSize = `${size}px`;
    }, baseFontSize * zoom);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ['pm-scale', 'psi-scale']) {
        const layout = await page.locator(`#${id}`).evaluate((figure) => {
          const chart = figure.querySelector('svg').getBoundingClientRect();
          const labels = [...figure.querySelectorAll('.scale-range')];
          return {
            chart: { x: chart.x, width: chart.width },
            fontSize: parseFloat(getComputedStyle(labels[0]).fontSize),
            labels: labels.map((label) => {
              const box = label.getBoundingClientRect();
              return {
                x: box.x,
                width: box.width,
                numbers: [...label.querySelectorAll('span')].map((number) => {
                  const rect = number.getBoundingClientRect();
                  return { x: rect.x, right: rect.right };
                }),
              };
            }),
          };
        });
        expect(layout.fontSize).toBeGreaterThanOrEqual(14 * zoom);
        for (const [index, label] of layout.labels.entries()) {
          const expectedX = layout.chart.x + (index * layout.chart.width) / layout.labels.length;
          expect(Math.abs(label.x - expectedX)).toBeLessThan(1);
          expect(Math.abs(label.width - layout.chart.width / layout.labels.length)).toBeLessThan(1);
          for (const number of label.numbers) {
            expect(number.x, `${id}, ${width}px, ${zoom}× text`).toBeGreaterThanOrEqual(
              label.x - 1,
            );
            expect(number.right, `${id}, ${width}px, ${zoom}× text`).toBeLessThanOrEqual(
              label.x + label.width + 1,
            );
          }
        }
      }
    }
  }
});

test('section navigation stays available and anchors clear it, including enlarged text', async ({
  page,
}) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Page sections' });
  await expect(navigation.getByRole('link')).toHaveCount(8);
  await expect(page.getByText('01 / THE AIR RIGHT NOW', { exact: true })).toHaveCount(0);
  await expect(page.getByText('02 / YOUR NEXT MOVE', { exact: true })).toHaveCount(0);
  await expect(page.getByText('03 / THE SHORT GUIDE', { exact: true })).toHaveCount(0);
  await expect(page.locator('.hero-art')).toHaveCount(0);
  await expect(page.locator('.official-advisory')).toBeVisible();
  const font = await page
    .locator('.reading-value')
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(font).toContain('DM Sans');
  expect(font).not.toContain('Fraunces');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await navigation.getByRole('link', { name: 'Masks', exact: true }).click();
    await expect(page).toHaveURL(/#masks$/u);
    await expect
      .poll(async () => {
        const navBox = await navigation.boundingBox();
        const sectionBox = await page.locator('#masks').boundingBox();
        return sectionBox.y >= navBox.y + navBox.height - 2;
      })
      .toBe(true);
    expect((await navigation.boundingBox()).y).toBeLessThanOrEqual(1);
    await navigation.getByRole('link', { name: 'Back to top' }).click();
    await expect(page).toHaveURL(/#top$/u);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await navigation.getByRole('link', { name: 'Purifier', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const navBox = await navigation.boundingBox();
  const sectionBox = await page.locator('#purifier-guide').boundingBox();
  expect(sectionBox.y).toBeGreaterThanOrEqual(navBox.y + navBox.height - 2);
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
  await expect(page.locator('.mask-snapshot .mask-rating-note')).toBeVisible();
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
  expect(
    await page
      .locator('.regional-block')
      .evaluate((element) => element.nextElementSibling?.classList.contains('readings-grid')),
  ).toBe(true);
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
  await expect(page.locator('#pm-scale .scale-marker')).toBeVisible();
  await expect(page.locator('#pm-scale')).toHaveAttribute('data-freshness', 'reported');
  await expect(page.locator('#pm-scale')).toHaveAttribute(
    'aria-label',
    'Last reported: 140 µg/m³, Elevated.',
  );
  await expect(page.locator('#pm-card')).toHaveAttribute('data-band', '');
  await expect(page.locator('#window-guide')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('[data-region="east"] .region-band')).toHaveText('Old reading');
  await expect(page.locator('#band-position')).not.toBeVisible();
  await expect(page.locator('.scale-range[aria-current]')).toHaveCount(0);
});

test('arrows track readings within each band across viewport sizes, regions and refreshes', async ({
  page,
}) => {
  const payload = snapshotPayload(71);
  payload.readings.psi.values.east = 175;
  await page.route('**/data/latest.json', (route) => route.fulfill({ json: payload }));
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('71');
  await expect(page.locator('#psi-value')).toHaveText('175');
  await expect(page.locator('#band-position')).toHaveText('16 µg/m³ above Normal');

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [id, fraction] of [
      ['pm-scale', 0.2921052632],
      ['psi-scale', 0.55],
    ]) {
      const chart = await page.locator(`#${id} svg`).boundingBox();
      const marker = await page.locator(`#${id} .scale-marker`).boundingBox();
      expect(
        Math.abs(marker.x + marker.width / 2 - (chart.x + chart.width * fraction)),
      ).toBeLessThan(1);
    }
  }

  await page.locator('#region').selectOption('north');
  await expectMarkerPosition(page, 'pm-scale', 36.363636);
  await expect(page.locator('#pm-scale [aria-current="true"]')).toHaveText('0–55');
  await expect(page.locator('#band-position')).toHaveText('36 µg/m³ below Elevated');
  await page.locator('#region').selectOption('east');
  payload.readings.pm25.values.east = 149;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('#pm-value')).toHaveText('149');
  await expectMarkerPosition(page, 'pm-scale', 198.947368);
  await expect(page.locator('#pm-scale [aria-current="true"]')).toHaveText('56–150');
  await expect(page.locator('#pm-scale .scale-note')).toHaveText('Equal-width bands.');

  payload.readings.pm25.values.east = 0;
  payload.readings.psi.values.east = 0;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of ['pm-scale', 'psi-scale']) {
      await expectMarkerPosition(page, id, 0);
      await expect(page.locator(`#${id} svg`)).toHaveCSS('overflow', 'visible');
      const marker = await page.locator(`#${id} .scale-marker`).boundingBox();
      const card = await page.locator(`#${id}`).locator('..').boundingBox();
      expect(marker.x).toBeGreaterThan(card.x);
      expect(marker.x + marker.width).toBeLessThan(card.x + card.width);
    }
  }
});

test('all band boundaries update the scale and window state', async ({ page }) => {
  let pm25 = 0;
  await page.route('**/data/latest.json', (route) =>
    route.fulfill({ json: snapshotPayload(pm25, TEST_TIMESTAMP) }),
  );
  await page.goto('/');
  for (const [value, level, markerX] of [
    [0, 1, 0],
    [55, 1, 100],
    [56, 2, 101.052632],
    [150, 2, 200],
    [151, 3, 201],
    [250, 3, 300],
    [251, 4, 350],
  ]) {
    pm25 = value;
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('#pm-value')).toHaveText(String(value));
    await expect(page.locator('#pm-scale')).toHaveAttribute('data-level', String(level));
    await expect(page.locator('#window-guide')).toHaveAttribute(
      'data-state',
      level === 1 ? 'check' : 'reduce',
    );
    await expect(page.locator('#band-position')).toBeVisible();
    if (level === 4) {
      await expect(page.locator('#band-position')).toHaveText('1 µg/m³ above High');
      await expect(page.locator('#pm-scale .scale-note')).toHaveText('251+ · Highest band');
      await expect(page.locator('#pm-scale svg')).toHaveAttribute('aria-label', /category only/);
    }
    await expect(page.locator('#pm-scale [aria-current="true"]')).toHaveAttribute(
      'data-level',
      String(level),
    );
    await expectMarkerPosition(page, 'pm-scale', markerX);
  }
});

test('last-reported arrows become current on refresh and disappear only when values are missing', async ({
  page,
}) => {
  const payload = snapshotPayload(159, new Date(TEST_TIME - 3 * 60 * 60 * 1000).toISOString());
  await page.route('**/data/latest.json', (route) => route.fulfill({ json: payload }));
  await page.goto('/');
  await expectMarkerPosition(page, 'pm-scale', 209);
  await expect(page.locator('#pm-scale')).toHaveAttribute(
    'aria-label',
    'Last reported: 159 µg/m³, High.',
  );
  await expect(page.locator('#pm-band')).toHaveText('Current advice unavailable');
  await expect(page.locator('#window-guide')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('#pm-scale [aria-current]')).toHaveCount(0);
  await expect(page.locator('#band-position')).not.toBeVisible();
  payload.readings.pm25.timestamp = TEST_TIMESTAMP;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('#pm-scale')).toHaveAttribute('data-freshness', 'current');
  await expect(page.locator('#pm-scale [aria-current="true"]')).toHaveText('151–250');
  await expect(page.locator('#band-position')).toHaveText('9 µg/m³ above Elevated');
  await expectMarkerPosition(page, 'pm-scale', 209);
  await expect(page.locator('#pm-scale')).toHaveAttribute('aria-label', 'Now: 159 µg/m³, High.');
  payload.readings.pm25 = null;
  payload.readings.psi = null;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  for (const id of ['pm-scale', 'psi-scale']) {
    await expect(page.locator(`#${id} .scale-marker`)).not.toBeVisible();
    await expect(page.locator(`#${id}`)).toHaveAttribute('data-freshness', 'unavailable');
    await expect(page.locator(`#${id}`)).toHaveAttribute('aria-label', 'No reading available.');
    await expect(page.locator(`#${id} [aria-current]`)).toHaveCount(0);
    await expect(page.locator(`#${id} .scale-note`)).toHaveText('Equal-width bands.');
  }
});

test('PSI meter covers every category and labels its last-reported pointer when stale', async ({
  page,
}) => {
  const payload = snapshotPayload();
  await page.route('**/data/latest.json', (route) => route.fulfill({ json: payload }));
  await page.goto('/');
  for (const [value, level, markerX] of [
    [0, 1, 0],
    [50, 1, 100],
    [51, 2, 102],
    [100, 2, 200],
    [101, 3, 201],
    [200, 3, 300],
    [201, 4, 301],
    [300, 4, 400],
    [301, 5, 450],
    [2000, 5, 450],
  ]) {
    payload.readings.psi.values.east = value;
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('#psi-value')).toHaveText(String(value));
    await expect(page.locator('#psi-scale')).toHaveAttribute('data-level', String(level));
    await expect(page.locator('#psi-scale [aria-current="true"]')).toHaveAttribute(
      'data-level',
      String(level),
    );
    await expect(page.locator('#psi-scale .scale-note')).toHaveText(
      level === 5 ? '301+ · Highest band' : 'Equal-width bands.',
    );
    await expectMarkerPosition(page, 'psi-scale', markerX);
  }
  payload.readings.psi.timestamp = new Date(TEST_TIME - 3 * 60 * 60 * 1000).toISOString();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('#psi-scale .scale-marker')).toBeVisible();
  await expect(page.locator('#psi-scale')).toHaveAttribute('data-freshness', 'reported');
  await expect(page.locator('#psi-scale [aria-current]')).toHaveCount(0);
  await expect(page.locator('#psi-scale')).toHaveAttribute(
    'aria-label',
    'Last reported: 2000, Hazardous.',
  );
  await expect(page.locator('#psi-band')).toContainText('Last reported');
  await expect(page.locator('#psi-card')).toHaveAttribute('data-band', '');
  await expect(page.locator('#pm-scale .scale-marker')).toBeVisible();
});

test('expanded guides fit phone, tablet, desktop and enlarged text', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#pm-value')).toHaveText('140');
  await page.locator('#mask-comparison-details > summary').click();
  await page.locator('#mask-comparison-details .mask-details > summary').click();
  await page.locator('#mask-use-details > summary').click();
  await page.locator('#mask-buying-details > summary').click();
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
    'https://hazelah.me/haze-guide-sg/',
  );
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain(
    'WebPage',
  );
  await context.close();
});
