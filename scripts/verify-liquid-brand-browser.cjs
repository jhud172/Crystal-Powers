/* Original procedural Liquid Light logo; read-only local visual/interaction check. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8080';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8080|8084)$/);
const output = path.resolve('.codex-runtime/qa/liquid-brand-d1');
const report = { base, checks: [], errors: [], scope: 'Installed Edge on local built frontend, synthetic privacy publication GET, no business writes; emulated device dimensions only.' };
function check(name, value) { assert.ok(value, name); report.checks.push(name); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => {
    window.__brandDraws = 0;
    window.__brandBufferDeletes = 0;
    if (typeof WebGL2RenderingContext === 'undefined') return;
    for (const method of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const draw = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function (...args) { window.__brandDraws++; return draw.apply(this, args); };
    }
    const remove = WebGL2RenderingContext.prototype.deleteBuffer;
    WebGL2RenderingContext.prototype.deleteBuffer = function (...args) { window.__brandBufferDeletes++; return remove.apply(this, args); };
  });
  page.on('pageerror', error => report.errors.push(error.message));
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.route('**/api/site/privacy/status', route => route.fulfill({ json: { ready: false } }));
  try {
    await page.goto(base + '/about'); await page.locator('main h1').waitFor();
    const header = page.locator('header.studio-header');
    const trigger = header.locator('.brand-crystal-button');
    check('New SVG loads without initial WebGL', await trigger.locator('img').evaluate(el => el.naturalWidth > 0 && el.src.endsWith('liquid-mark.svg')) && await page.locator('canvas').count() === 0);
    await trigger.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('header .brand-scene')?.dataset.ready === 'true');
    check('Default loads the Blender signature without the heritage GLB', requests.some(url => url.includes('liquid-brand-crystal.glb')) && !requests.some(url => url.includes('crystal-powers-logo-3d.glb')));
    check('One opt-in canvas and selected Liquid Light treatment', await page.locator('canvas').count() === 1 && await header.getByRole('button', { name: 'Liquid Light', exact: true }).getAttribute('aria-pressed') === 'true');
    const rotation = header.getByRole('slider', { name: 'Rotate the crystal' });
    const beforeRotation = await page.evaluate(() => window.__brandDraws);
    await rotation.focus(); await page.keyboard.press('ArrowRight');
    check('Keyboard rotates in labelled degrees', await rotation.inputValue() === '5' && await rotation.getAttribute('aria-valuetext') === '5 degrees');
    await page.waitForFunction(before => window.__brandDraws > before, beforeRotation);
    check('Rotation redraws actual WebGL geometry', true);
    // Demand rendering should settle instead of maintaining an idle GPU loop.
    await page.waitForFunction(() => {
      const now = performance.now(), draws = window.__brandDraws;
      const prior = window.__brandQuiet || { draws: -1, at: now };
      if (prior.draws !== draws) { window.__brandQuiet = { draws, at: now }; return false; }
      return now - prior.at > 180;
    });
    check('Logo settles to demand rendering after interaction', true);
    const deletes = await page.evaluate(() => window.__brandBufferDeletes);
    const canvasHandle = await header.locator('canvas').elementHandle();
    let previousPixels = await header.locator('canvas').screenshot();
    for (const name of ['Rose', 'Pearl']) {
      const draws = await page.evaluate(() => window.__brandDraws);
      await header.getByRole('button', { name, exact: true }).click();
      await page.waitForFunction(before => window.__brandDraws > before, draws);
      const pixels = await header.locator('canvas').screenshot();
      check(name + ' finish changes rendered pixels', !pixels.equals(previousPixels));
      previousPixels = pixels;
      await header.locator('.brand-experience').screenshot({ path: path.join(output, 'finish-' + name.toLowerCase() + '.png') });
    }
    check('Finish controls reuse geometry buffers', await page.evaluate(() => window.__brandBufferDeletes) === deletes);
    await header.getByRole('button', { name: 'Reset view', exact: true }).click();
    check('Reset restores default finish and rotation', await rotation.inputValue() === '0' && await header.getByRole('button', { name: 'Glacier', exact: true }).getAttribute('aria-pressed') === 'true');
    check('Material/reset controls retain the same canvas', await header.locator('canvas').evaluate((canvas, old) => canvas === old, canvasHandle));
    await canvasHandle.dispose();
    for (const [label, tier] of [['Lighter', 'low'], ['Balanced', 'standard'], ['Detailed', 'high']]) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      await page.locator('.studio-quality-trigger').click();
      await page.getByRole('radio', { name: label, exact: true }).check();
      await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
      // Appearance's outside click closes the brand; reopen without changing its variant.
      if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
      await page.waitForFunction(expected => document.querySelector('header canvas')?.dataset.renderTier === expected, tier);
      check(label + ' explicitly controls logo render tier', await page.locator('canvas').count() === 1);
    }
    await page.screenshot({ path: path.join(output, 'liquid-open.png') });
    await header.getByRole('button', { name: 'Unfold the crystal', exact: true }).click();
    await header.getByRole('button', { name: 'Bring it together', exact: true }).click();
    check('Unfold can reverse', await header.getByRole('button', { name: 'Unfold the crystal', exact: true }).isVisible());
    await header.getByRole('button', { name: 'Original crystal', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('header .brand-scene')?.dataset.ready === 'true');
    check('Original model remains an explicit alternative', requests.some(url => url.includes('crystal-powers-logo-3d.glb')) && await page.locator('canvas').count() === 1 && await rotation.count() === 0);
    await page.screenshot({ path: path.join(output, 'original-option.png') });
    await header.getByRole('button', { name: 'Liquid Light', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('header .brand-scene')?.dataset.ready === 'true');
    await rotation.focus(); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelectorAll('canvas').length === 0);
    check('Motion preference retires model and retains the usable rotation control focus', await rotation.evaluate(el => el === document.activeElement));
    await page.keyboard.press('Escape');
    check('Still-mode close remains usable', await header.locator('.brand-experience').count() === 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await trigger.click(); await page.waitForFunction(() => document.querySelector('header .brand-scene')?.dataset.ready === 'true');
    await header.locator('canvas').evaluate(el => el.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    await header.getByRole('status').filter({ hasText: 'could not load' }).waitFor();
    check('Context loss keeps matching static artwork and no canvas', await header.locator('.brand-scene img').isVisible() && await page.locator('canvas').count() === 0);
    await page.keyboard.press('Escape');
    check('Escape restores trigger focus', await trigger.evaluate(el => el === document.activeElement));
    for (const width of [320, 390, 480, 768, 1024, 1440, 1920, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      check(width + ' brand/header reflows', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await trigger.click();
    check('Compact rendered studio avoids WebGL', await page.locator('canvas').count() === 0 && await trigger.getAttribute('aria-expanded') === 'true');
    await page.screenshot({ path: path.join(output, 'compact.png') });
    for (const size of [32, 180, 192, 512]) {
      const icon = await page.request.get(base + '/branding/liquid-icon-' + size + '.png'); const bytes = await icon.body();
      check(size + 'px original brand icon is a real PNG at its declared size', icon.ok() && bytes.subarray(1, 4).toString() === 'PNG' && bytes.readUInt32BE(16) === size && bytes.readUInt32BE(20) === size);
    }
    const mask = await page.request.get(base + '/branding/crystal-powers-liquid-monochrome.svg');
    check('Monochrome mask is available without gradient dependencies', mask.ok() && !(await mask.text()).includes('url('));
    const manifest = await (await page.request.get(base + '/site.webmanifest')).json();
    check('Manifest references the new app icons', manifest.icons.some(icon => icon.src === '/branding/liquid-icon-192.png') && manifest.icons.some(icon => icon.src === '/branding/liquid-icon-512.png'));
    check('No uncaught browser errors', report.errors.length === 0);
    console.log('LIQUID_BRAND_PASS:', report.checks.length, 'checks;', output);
  } catch (error) {
    report.failure = String(error);
    await page.screenshot({ path: path.join(output, 'failure.png') });
    throw error;
  } finally {
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
