/* Actual packaged Home/Studio, all five appearances and exact shipped poster bytes. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'); const path = require('node:path'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/scene-delivery-pc');
const report = { base, checks: [], pairs: [], errors: [], scope: 'Actual packaged anonymous Home/Studio; native preferences, shipped assets, no API fixtures/writes. Emulated viewports, not physical-device acceptance.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const manifest = JSON.parse(await fs.readFile('frontend/public/renders/live/manifest.json', 'utf8'));
    const capture = JSON.parse(await fs.readFile('frontend/public/renders/live/capture-manifest.json', 'utf8'));
    for (const [name, metadata] of [...Object.entries(manifest.renders), ...capture.captures.map(item => [item.filename, item])]) {
      const response = await context.request.get(base + '/renders/live/' + name); const body = await response.body();
      check(`${name} packaged HTTP bytes match the reviewed capture/delivery`, response.status() === 200 && crypto.createHash('sha256').update(body).digest('hex') === metadata.sha256);
      check(`${name} delivered image type and excluded compression agree`, response.headers()['content-type']?.startsWith(name.endsWith('.webp') ? 'image/webp' : 'image/png') && !response.headers()['content-encoding']);
    }
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
    const writes = []; page.on('request', request => { if (request.url().includes('/api/') && request.method() !== 'GET') writes.push(request.url()); });
    const opening = page.locator('.crystal-opening');
    async function effects(reduced) {
      await page.getByRole('button', { name: 'Choose appearance' }).click(); await page.getByLabel('Reduce effects').setChecked(reduced);
      if (!reduced) await page.getByLabel('3D detail').selectOption('automatic'); await page.keyboard.press('Escape');
      await opening.scrollIntoViewIfNeeded(); await page.mouse.move(2, 2);
      if (!reduced) await page.locator('.crystal-opening[data-ready="true"]').waitFor({ timeout: 20000 });
      else await opening.locator('canvas').waitFor({ state: 'detached' });
      await page.waitForTimeout(400);
    }
    for (const width of [390, 1440]) for (const [theme, light] of [['Dark', false], ['Light', true], ['Warm dark', false], ['Fresh light', true], ['Warm light', true]]) {
      await page.setViewportSize({ width, height: 1100 }); await page.goto(base + '/');
      await page.getByRole('button', { name: 'Choose appearance' }).click(); await page.getByRole('button', { name: theme, exact: true }).click();
      for (const pose of ['closed', 'open']) {
        if (pose === 'open') { await effects(true); await opening.getByRole('button', { name: /Open the experience/ }).click(); }
        await effects(false);
        const key = `${theme.replaceAll(' ', '-')}-${pose}-${width}`;
        const canvasBox = await opening.locator('canvas').boundingBox();
        const liveSurface = await opening.locator('.opening-surface').boundingBox();
        const backdrop = await opening.evaluate(node => getComputedStyle(node).backgroundColor);
        await opening.locator('canvas').screenshot({ path: path.join(output, key + '-live.png') });
        await effects(true); const image = opening.locator('.opening-poster img');
        await page.waitForFunction(() => { const image = document.querySelector('.opening-poster img'); return image?.complete && image.naturalWidth > 0; });
        const posterBox = await image.boundingBox(); const currentSrc = await image.evaluate(node => node.currentSrc);
        const posterSurface = await opening.locator('.opening-surface').boundingBox();
        report.pairs.push({ key, theme, light, pose, width, backdrop, canvasBox, posterBox, liveSurface, posterSurface, currentSrc });
        check(`${key} selects the reviewed responsive appearance/pose`, currentSrc.includes(`/renders/live/observatory-${light ? 'light' : 'dark'}${pose === 'open' ? '-open' : ''}`) && currentSrc.endsWith('.webp'));
        check(`${key} native live/poster boxes stay aligned within their surface`, ['width', 'height'].every(axis => Math.abs(canvasBox[axis] - posterBox[axis]) < 1) && ['x','y'].every(axis => Math.abs((canvasBox[axis] - liveSurface[axis]) - (posterBox[axis] - posterSurface[axis])) < 1));
        check(`${key} remains in the intended phase without page overflow`, await opening.getAttribute('data-phase') === pose && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await image.screenshot({ path: path.join(output, key + '-poster.png') });
      }
      await page.goto(base + '/about'); await page.locator('.founder-art').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => { const image = document.querySelector('.founder-art img'); return image?.complete && image.naturalWidth > 0; });
      check(`${theme} ${width}px actual Studio inherits the same artwork family`, (await page.locator('.founder-art img').evaluate(node => node.currentSrc)).includes(`/renders/live/observatory-${light ? 'light' : 'dark'}`) && await page.locator('canvas').count() === 0);
    }
    check('Actual page checks create no API write', writes.length === 0); check('No uncaught browser errors', report.errors.length === 0);
    console.log('SCENE_DELIVERY_BROWSER_PASS:', report.checks.length, 'checks;', report.pairs.length, 'actual five-theme pose pairs'); await context.close();
  } catch (error) { report.failure = String(error); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
