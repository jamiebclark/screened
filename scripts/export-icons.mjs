import { chromium } from '../node_modules/playwright/index.mjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const svg = readFileSync(resolve('src/app/icon.svg'), 'utf8');
const sizes = [64, 128, 256, 512, 1024];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const size of sizes) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`
    <html>
      <head><style>* { margin: 0; padding: 0; } body { background: transparent; }</style></head>
      <body>${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>
    </html>
  `);
  await page.screenshot({
    path: `public/icons/icon-${size}.png`,
    clip: { x: 0, y: 0, width: size, height: size },
    omitBackground: true,
  });
  console.log(`Generated icon-${size}.png`);
}

await browser.close();
