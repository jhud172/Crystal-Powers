/* Photograph the actual renderer and native responsive poster at equal dimensions. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'); const path = require('node:path'); const assert = require('node:assert/strict');
const scenePhotographyFixture = require('./scene-photography-fixture.cjs');
const base = 'http://127.0.0.1:5175'; const output = path.resolve('.codex-runtime/qa/poster-pc');
const report = { base, checks: [], pairs: [], errors: [], scope: 'Actual source renderer and ScenePoster, read-only loopback fixture; native page checks separately packaged. Emulated widths, not physical devices.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const fixtureDocument = await scenePhotographyFixture(base);
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  try {
    const context = await browser.newContext({ viewport: { width: 800, height: 500 } });
    await context.route(base + '/__qa_scene', route => route.fulfill({ contentType: 'text/html', body: fixtureDocument }));
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base + '/__qa_scene'); await page.waitForFunction(() => window.fixtureReady);
    for (const model of ['crystal', 'laptop', 'monitor', 'phone', 'observatory']) {
      for (const light of [false, true]) for (const pose of model === 'observatory' ? ['closed', 'open'] : ['closed']) {
        for (const [width, height] of [[390, 520], [800, 500], [1440, 700]]) {
          await page.setViewportSize({ width, height });
          const backdrop = light ? '#f2f0eb' : '#0b1018'; const key = `${model}-${light ? 'light' : 'dark'}-${pose}-${width}`;
          await page.evaluate(args => window.renderScene(...args), [model, light, pose, 'live', backdrop]);
          await page.waitForFunction(() => document.documentElement.dataset.ready === 'true'); await page.waitForTimeout(400);
          check(`${key} actual live view has one ready canvas`, await page.locator('canvas').count() === 1 && await page.locator('canvas').getAttribute('data-render-tier') === 'standard');
          await page.locator('canvas').screenshot({ path: path.join(output, key + '-live.png'), omitBackground: true, style: 'html,body,#root{background:transparent!important}' });
          await page.evaluate(args => window.renderScene(...args), [model, light, pose, 'poster', backdrop]);
          await page.locator('img').waitFor(); await page.waitForFunction(() => { const image = document.querySelector('img'); return image?.complete && image.naturalWidth > 0; });
          const currentSrc = await page.locator('img').evaluate(image => image.currentSrc);
          check(`${key} actual responsive WebP is selected without a canvas`, currentSrc.includes('/renders/live/') && currentSrc.endsWith('.webp') && await page.locator('canvas').count() === 0);
          check(`${key} explicit dimensions reserve the expected frame`, await page.locator('img').getAttribute('width') === '1600' && await page.locator('img').getAttribute('height') === (['crystal', 'observatory'].includes(model) ? '1000' : '1120'));
          await page.locator('img').screenshot({ path: path.join(output, key + '-poster.png'), omitBackground: true, style: 'html,body,#root{background:transparent!important}' });
          report.pairs.push({ key, model, light, pose, width, height, backdrop, currentSrc });
        }
      }
    }
    await context.route('**/renders/live/**', route => route.abort('failed'));
    await page.evaluate(() => window.renderScene('observatory', false, 'closed', 'poster', '#0b1018'));
    await page.locator('picture[data-poster-source="retained"]').waitFor();
    await page.waitForFunction(() => { const image = document.querySelector('img'); return image?.complete && image.naturalWidth > 0; });
    check('Delivery-image outage retains original photography rather than losing all artwork', (await page.locator('img').evaluate(image => image.currentSrc)).includes('/renders/observatory-dark'));
    check('No uncaught browser errors', report.errors.length === 0);
    console.log('POSTER_BROWSER_PASS:', report.checks.length, 'checks;', report.pairs.length, 'pixel-comparison pairs');
    await context.close();
  } catch (error) { report.failure = String(error); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
