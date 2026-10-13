/* Same upstream font bytes; real local delivery and labelled delay/failure fixtures. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8084|5175)$/);
const report = { base, checks: [], errors: [], scope: 'Local Edge, original font bytes, emulated viewports; delayed/failed font responses are labelled fixtures. No API writes or physical/field certification.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  const manifest = JSON.parse(await fs.readFile('frontend/public/fonts/manrope/source-manifest.json', 'utf8'));
  const browser = await chromium.launch({ executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE, headless: true });
  try {
    for (const width of [320, 390, 768, 1024, 1440, 1920]) for (const reduced of [false, true]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      const external = [], writes = [];
      page.on('request', request => {
        if (request.url().includes('fonts.googleapis.com') || request.url().includes('fonts.gstatic.com')) external.push(request.url());
        if (request.url().startsWith(base + '/api/') && request.method() !== 'GET') writes.push(request.method());
      });
      page.on('pageerror', error => report.errors.push(error.message));
      try {
        await page.goto(base + '/services', { waitUntil: 'domcontentloaded' });
        const fonts = await page.evaluate(async () => {
          await document.fonts.ready;
          const weights = await Promise.all([400, 500, 600, 700].map(async weight => ({ weight, loaded: (await document.fonts.load(`${weight} 16px Manrope`, 'Crystal Powers')).length > 0 })));
          return { weights, family: getComputedStyle(document.querySelector('main h1')).fontFamily, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        const label = `${width} ${reduced ? 'reduced' : 'standard'}`;
        check(`${label}: all four requested weights actually load`, fonts.weights.every(weight => weight.loaded));
        check(`${label}: public heading retains Manrope`, fonts.family.includes('Manrope'));
        check(`${label}: loaded typography fits viewport`, !fonts.overflow);
        check(`${label}: no remote font request`, external.length === 0);
        check(`${label}: no API mutation`, writes.length === 0);
        if (width === 1440 && !reduced) {
          const coverage = await page.evaluate(async () => (await document.fonts.load('400 16px Manrope', 'A Ł Я Ѧ α ế')).map(face => face.status));
          check('Original six language subsets load on demand', coverage.length === 6 && coverage.every(status => status === 'loaded'));
          for (const file of manifest.files) {
            const response = await page.request.get(base + '/fonts/manrope/' + file.file);
            const body = await response.body();
            check(`${file.subset}: delivered bytes match upstream hash`, response.status() === 200 && crypto.createHash('sha256').update(body).digest('hex') === file.sha256);
            check(`${file.subset}: font is served with WOFF2 media type`, response.headers()['content-type'].startsWith('font/woff2'));
          }
          check('Delivered font licence contains original copyright and OFL', (await (await page.request.get(base + '/fonts/manrope/OFL.txt')).text()).includes('Copyright 2018 The Manrope Project Authors'));
        }
      } finally { await context.close(); }
    }
    for (const mode of ['delayed', 'failed']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await context.route('**/fonts/manrope/*.woff2', async route => {
        if (mode === 'failed') return route.abort('failed');
        await gate;
        await route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      try {
        await page.goto(base + '/services', { waitUntil: 'domcontentloaded' });
        await page.locator('main h1').waitFor();
        check(`${mode}: readable heading remains available without font`, (await page.locator('main h1').innerText()).trim().length > 0);
        check(`${mode}: native project action remains available`, await page.getByRole('link', { name: /Start a project/i }).first().isVisible());
        if (mode === 'delayed') {
          check('Delayed font has not falsely reported loaded', await page.evaluate(() => !document.fonts.check('400 16px Manrope', 'Crystal Powers')));
          release();
          check('Delayed font recovers through actual loading', await page.evaluate(async () => (await document.fonts.load('400 16px Manrope', 'Crystal Powers')).length > 0));
        } else {
          await page.evaluate(() => document.fonts.ready);
          check('Failed font retains readable fallback without overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        }
      } finally { release(); await context.close(); }
    }
    check('No uncaught browser errors', report.errors.length === 0);
    console.log(`FONT_BROWSER_PASS: ${report.checks.length} checks`);
  } finally {
    await browser.close();
    const folder = path.resolve('.codex-runtime/qa/fonts-pc');
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, 'report.json'), JSON.stringify(report, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
