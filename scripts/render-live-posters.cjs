/* Original scene photography through the real renderer; read-only loopback Vite fixture. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'); const path = require('node:path'); const crypto = require('node:crypto'); const assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:5175';
assert.equal(base, 'http://127.0.0.1:5175', 'Capture the actual source renderer through isolated loopback Vite');
const output = path.resolve('.codex-runtime/qa/live-posters');
const sourceFiles = ['frontend/src/features/experience/ModelCanvas.tsx', 'frontend/src/features/experience/PreparedScene.tsx', 'frontend/src/features/experience/useEnvironmentPreparation.ts', 'frontend/src/features/experience/waitForScenePrograms.ts', 'frontend/src/features/experience/scenePresentation.ts', 'frontend/src/features/experience/renderQuality.ts', 'frontend/public/renders/studio-screen.png', 'frontend/public/renders/studio-mobile.png'];
const scenePhotographyFixture = require('./scene-photography-fixture.cjs');
(async () => {
  await fs.mkdir(output, { recursive: true });
  const report = { source: 'Original Crystal Powers GLBs photographed with the actual ModelCanvas; no external images/models', captures: [], errors: [], sourceHashes: {}, modelHashes: {} };
  const fixtureDocument = await scenePhotographyFixture(base);
  for (const file of sourceFiles) report.sourceHashes[file] = crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  let debugPage;
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    await context.route(base + '/__qa_scene', route => route.fulfill({ contentType: 'text/html', body: fixtureDocument }));
    const page = await context.newPage(); debugPage = page; page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(base + '/__qa_scene'); await page.waitForFunction(() => window.fixtureReady);
    for (const model of ['crystal', 'laptop', 'monitor', 'phone', 'observatory']) {
      report.modelHashes[model] = crypto.createHash('sha256').update(await fs.readFile(`frontend/public/models/${model}.glb`)).digest('hex');
      const height = ['crystal', 'observatory'].includes(model) ? 1000 : 1120;
      await page.setViewportSize({ width: 1600, height });
      for (const light of [false, true]) for (const pose of model === 'observatory' ? ['closed', 'open'] : ['closed']) {
        await page.evaluate(({ model, light, pose }) => window.renderScene(model, light, pose), { model, light, pose });
        await page.waitForFunction(() => document.documentElement.dataset.ready === 'true'); await page.waitForTimeout(1000);
        assert.equal(await page.locator('canvas').count(), 1); assert.equal(await page.locator('canvas').getAttribute('data-render-tier'), 'standard');
        const filename = `${model}-${light ? 'light' : 'dark'}${pose === 'open' ? '-open' : ''}.png`;
        await page.locator('canvas').screenshot({ path: path.join(output, filename), omitBackground: true });
        const frame = await page.evaluate(() => window.sceneFrame);
        const captured = await fs.readFile(path.join(output, filename));
        report.captures.push({ filename, ...frame, bytes: captured.length, sha256: crypto.createHash('sha256').update(captured).digest('hex') });
        console.log('CAPTURED', filename);
      }
    }
    assert.equal(report.captures.length, 12); assert.deepEqual(report.errors, []);
    await fs.writeFile(path.join(output, 'capture-manifest.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('LIVE_POSTER_CAPTURE_PASS: 12 original poses, actual renderer, no page errors');
  } catch (error) { report.failure = String(error); if (debugPage && !debugPage.isClosed()) report.lastContent = (await debugPage.locator('body').innerText()).slice(0,1000); await fs.writeFile(path.join(output, 'capture-failure.json'), JSON.stringify(report, null, 2)); console.error(JSON.stringify(report)); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
