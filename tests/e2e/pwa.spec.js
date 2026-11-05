import { test, expect } from '@playwright/test';

function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('the site exposes an installable manifest with valid app icons', async ({ page, request }) => {
  await page.goto('/');
  const link = page.locator('link[rel="manifest"]');
  await expect(link).toHaveCount(1);
  const manifestUrl = new URL(await link.getAttribute('href'), page.url());
  const response = await request.get(manifestUrl.href);
  expect(response.status()).toBe(200);

  const manifest = await response.json();
  expect(manifest.name).toContain('Singapore Haze');
  expect(manifest.short_name).toBe('Air, Actually');
  expect(manifest.display).toBe('standalone');
  expect(new URL(manifest.start_url, manifestUrl).href).toBe(new URL('./', manifestUrl).href);
  expect(new URL(manifest.scope, manifestUrl).href).toBe(new URL('./', manifestUrl).href);

  const purposes = manifest.icons.map((icon) => icon.purpose);
  expect(purposes).toContain('any');
  expect(purposes).toContain('maskable');
  for (const icon of manifest.icons) {
    const iconUrl = new URL(icon.src, manifestUrl);
    const iconResponse = await request.get(iconUrl.href);
    expect(iconResponse.status(), icon.src).toBe(200);
    expect(iconResponse.headers()['content-type']).toContain('image/png');
    const buffer = await iconResponse.body();
    expect(buffer.subarray(1, 4).toString()).toBe('PNG');
    expect(pngSize(buffer), icon.src).toEqual({
      width: Number(icon.sizes.split('x')[0]),
      height: Number(icon.sizes.split('x')[1]),
    });
  }
});

test('nested guides link to a root manifest and Apple touch icon', async ({ page, request }) => {
  await page.goto('/guides/haze-masks/');
  const manifestUrl = new URL(
    await page.locator('link[rel="manifest"]').getAttribute('href'),
    page.url(),
  );
  expect(manifestUrl.pathname).toBe('/manifest.webmanifest');

  const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const appleUrl = new URL(appleIcon, page.url());
  const response = await request.get(appleUrl.href);
  expect(response.status()).toBe(200);
  expect(pngSize(await response.body())).toEqual({ width: 180, height: 180 });
});
