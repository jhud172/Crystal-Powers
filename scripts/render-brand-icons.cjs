/* Deterministic raster exports of the project's original SVG; no external URLs. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'); const path = require('node:path');
(async () => {
  const svg = await fs.readFile('frontend/public/favicon.svg', 'utf8');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.abort());
    for (const size of [32, 180, 192, 512]) {
      const uri = await page.evaluate(async ({ svg, size }) => {
        const image = new Image(); image.src = 'data:image/svg+xml;base64,' + btoa(svg);
        await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
        canvas.getContext('2d').drawImage(image, 0, 0, size, size);
        return canvas.toDataURL('image/png').split(',')[1];
      }, { svg, size });
      await fs.writeFile(path.join('frontend/public/branding', `liquid-icon-${size}.png`), Buffer.from(uri, 'base64'));
    }
    console.log('BRAND_ICONS_RENDERED: 32/180/192/512px from original SVG; no external request');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
