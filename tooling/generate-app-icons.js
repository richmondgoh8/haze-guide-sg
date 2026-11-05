import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = `${root}public/icons`;

const icons = [
  { source: 'app-icon.svg', file: 'app-icon-192.png', size: 192 },
  { source: 'app-icon.svg', file: 'app-icon-512.png', size: 512 },
  { source: 'app-icon-maskable.svg', file: 'app-icon-maskable-512.png', size: 512 },
  { source: 'app-icon.svg', file: 'apple-touch-icon.png', size: 180 },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const icon of icons) {
    const svg = await readFile(`${output}/${icon.source}`, 'utf8');
    const page = await browser.newPage({
      viewport: { width: icon.size, height: icon.size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>${svg}`,
    );
    await page.screenshot({ path: `${output}/${icon.file}`, omitBackground: true });
    await page.close();
    console.log(`Generated ${icon.file} (${icon.size}×${icon.size})`);
  }
} finally {
  await browser.close();
}
