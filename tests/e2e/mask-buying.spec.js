import { test, expect } from '@playwright/test';

test.use({ javaScriptEnabled: false, hasTouch: true });

const sources = {
  'Check NIOSH list ↗': 'https://wwwn.cdc.gov/niosh-cel/',
  'Official KN95 standard ↗':
    'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=16D8935B45AD7AE40228801B7FADFC6C',
  'Check MFDS list ↗': 'https://nedrug.mfds.go.kr/pbp/CCBCC01/getList',
  'Price Kaki ↗':
    'https://www.case.org.sg/media_centre/case-launches-price-kaki-nationwide-to-empower-consumers-to-make-informed-purchasing-decisions/',
  'AsiaOne report · October 2026 ↗':
    'https://www.asiaone.com/singapore/haze-n95-masks-air-purifiers-advisory-case',
};

for (const path of ['/', '/guides/haze-masks/']) {
  test(`buying checks work without JavaScript on ${path}`, async ({ page }) => {
    await page.goto(path);
    const buying = page.locator('.mask-buying');
    const details = buying.locator('details');
    const summary = details.locator('summary');
    await expect(buying.getByRole('heading', { name: 'Buy with confidence' })).toBeVisible();
    await expect(buying).toContainText('Use a trusted seller and check the exact model.');
    await expect(details).not.toHaveAttribute('open');
    await expect(buying.getByRole('heading', { name: 'KN95', exact: true })).toBeHidden();
    await summary.tap();
    await expect(details).toHaveAttribute('open');
    await summary.tap();
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open');
    await expect(buying.locator('.mask-buying-grid h3')).toHaveText(['N95', 'KN95', 'KF94']);
    await expect(buying).toContainText('A listed model can still be copied.');
    await expect(buying).toContainText('not an authenticity code');
    await expect(buying).toContainText('Korean product name');
    await expect(buying).toContainText('marketplace badge isn’t a guarantee');
    await expect(buying).toContainText('prices and coverage can vary');
    await expect(buying.getByRole('link', { name: 'ScamShield 1799' })).toHaveAttribute(
      'href',
      'tel:1799',
    );
    await expect(buying.locator('time')).toHaveAttribute('datetime', '2026-10-18');
    for (const [name, href] of Object.entries(sources)) {
      await expect(buying.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
    for (const zoom of ['100%', '200%']) {
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
      }, zoom);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `Buying guide overflow at ${width}px, ${zoom} text`,
        ).toBe(true);
      }
    }
  });
}

for (const path of ['/', '/guides/air-purifier-placement/']) {
  test(`purifier buying link reaches the shared checklist from ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.locator('#purifier-setup-details > summary').tap();
    const link = page.getByRole('link', { name: 'Use the haze-shopping checklist ↗' });
    await expect(link).toHaveAttribute(
      'href',
      path === '/' ? '#mask-buying-details' : '../../guides/haze-masks/#mask-buying-details',
    );
    await link.tap();
    await expect(page.locator('#mask-buying-details')).toBeInViewport();
    await expect(page.locator('#mask-buying-details > summary')).toHaveText(
      'Genuine mask? Check your type.',
    );
  });
}
