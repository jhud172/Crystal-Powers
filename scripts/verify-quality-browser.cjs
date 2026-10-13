/* Real optional scenes, native preference controls and measured WebGL work; read-only local fixtures. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:5175';
assert.match(base, /^http:\/\/127\.0\.0\.1:(5175|8084)$/);
const output = path.resolve('.codex-runtime/qa/quality-pc');
const report = { base, checks: [], errors: [], measurements: [], runtime: 'Installed Edge, RTX renderer identification, emulated CSS viewports and DPR. Draw submissions and animation-frame intervals are diagnostics, not GPU/physical-device/thermal certification.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const fixture = device => ({ id: 'qa-quality', slug: 'qa-quality', featured: false, sortOrder: 0, content: { title: 'Local rendering acceptance fixture', category: 'WEBSITE', summary: 'Synthetic local QA only; not published client work.', overview: '', approach: '', outcome: '', liveUrl: '', technologies: [], displayDevice: device, coverMediaId: null, coverAlt: '', gallery: [], screens: { desktop: { mediaId: 'qa-quality-screen', alt: 'Original studio interface for local rendering QA' }, mobile: { mediaId: 'qa-quality-screen', alt: 'Original studio interface for local rendering QA' } } } });
(async () => {
  await fs.mkdir(output, { recursive: true });
  const screen = await fs.readFile('frontend/public/renders/studio-screen.png');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  let debugPage;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
    await context.addInitScript(() => {
      window.__qualityWork = { draws: 0, targets: [] };
      for (const Constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
        for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
          const original = Constructor?.prototype[name]; if (!original) continue;
          Constructor.prototype[name] = function (...args) { window.__qualityWork.draws++; return original.apply(this, args); };
        }
        for (const name of ['texImage2D', 'texStorage2D']) {
          const original = Constructor?.prototype[name]; if (!original) continue;
          Constructor.prototype[name] = function (...args) {
            const width = args[3], height = args[4];
            if (typeof width === 'number' && typeof height === 'number') window.__qualityWork.targets.push({ method: name, width, height });
            return original.apply(this, args);
          };
        }
      }
    });
    let device = 'laptop';
    await context.route('**/api/projects**', route => route.fulfill({ json: route.request().url().endsWith('/qa-quality') ? fixture(device) : [] }));
    await context.route('**/api/media/qa-quality-screen', route => route.fulfill({ contentType: 'image/png', body: screen }));
    const page = await context.newPage(); debugPage = page; page.on('pageerror', error => report.errors.push(error.message));
    const writes = []; page.on('request', request => { if (request.url().includes('/api/') && request.method() !== 'GET') writes.push(request.url()); });
    async function select(quality) {
      await page.getByRole('button', { name: 'Choose appearance' }).click();
      await page.getByLabel('3D detail').selectOption(quality); await page.keyboard.press('Escape');
      check(`${quality} native appearance Escape restores focus`, await page.getByRole('button', { name: 'Choose appearance' }).evaluate(node => node === document.activeElement));
    }
    async function ready(stage, tier) { await stage.scrollIntoViewIfNeeded(); await stage.locator(`canvas[data-render-tier="${tier}"][data-preparing="false"]`).waitFor(); await page.waitForTimeout(400); }
    async function inspect(stage, name, expectedDpr) {
      const sample = await stage.locator('canvas').evaluate(canvas => {
        const gl = canvas.getContext('webgl2'); const extension = gl.getExtension('WEBGL_debug_renderer_info');
        return { tier: canvas.dataset.renderTier, width: canvas.width, cssWidth: canvas.clientWidth, height: canvas.height, cssHeight: canvas.clientHeight, renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'Unavailable' };
      });
      check(`${name} actual drawing-buffer DPR is ${expectedDpr}`, Math.abs(sample.width / sample.cssWidth - expectedDpr) < .01);
      check(`${name} one ready canvas and no scene error`, await stage.locator('canvas').count() === 1 && await stage.locator('.stage-error,.stage-status').count() === 0);
      check(`${name} document contains view without overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await stage.screenshot({ path: path.join(output, name + '.png'), style: '.studio-header { visibility: hidden; }' });
      return sample;
    }
    await page.goto(base + '/portfolio/qa-quality'); const stage = page.locator('.studio-device-stage');
    await stage.getByRole('button', { name: /Explore this project in 3D/ }).click();
    await stage.getByRole('button', { name: 'Rotate left', exact: true }).and(page.locator(':enabled')).waitFor({ timeout: 20000 });
    for (const [tier, dpr] of [['low', 1], ['standard', 1.5], ['high', 2]]) {
      await select(tier); await ready(stage, tier);
      const sample = await inspect(stage, 'laptop-' + tier, dpr);
      await stage.getByRole('button', { name: 'Reset', exact: true }).click();
      await page.evaluate(() => { window.__qualityWork = { draws: 0, targets: [] }; });
      await stage.getByRole('button', { name: 'Animate', exact: true }).click();
      const intervals = await page.evaluate(() => new Promise(resolve => {
        const values = []; let start, previous;
        function sample(now) { if (start === undefined) start = now; if (previous !== undefined) values.push(now - previous); previous = now; if (now - start < 2800) requestAnimationFrame(sample); else resolve(values); }
        requestAnimationFrame(sample);
      }));
      await stage.getByRole('button', { name: 'Pause', exact: true }).click();
      const work = await page.evaluate(() => window.__qualityWork);
      const ordered = [...intervals].sort((a, b) => a - b);
      report.measurements.push({ model: 'laptop', ...sample, frames: intervals.length, intervalMedianMs: ordered[Math.floor(ordered.length / 2)], intervalP95Ms: ordered[Math.floor(ordered.length * .95)], drawSubmissions: work.draws, transmissionTargetAllocations: work.targets });
      check(`${tier} measures nonzero bounded actual animation work`, work.draws > 0 && work.draws < 50000 && intervals.length > 10);
      await stage.getByRole('button', { name: 'Reset', exact: true }).click();
      await select(tier === 'high' ? 'low' : 'high');
      await ready(stage, tier === 'high' ? 'low' : 'high');
      check(`${tier} returning from header resumes one opted-in case canvas`, await stage.locator('canvas').count() === 1 && await stage.getAttribute('data-active') === 'true');
    }
    await select('automatic'); await page.setViewportSize({ width: 390, height: 900 }); await ready(stage, 'low');
    await inspect(stage, 'laptop-automatic-390', 1);
    await page.setViewportSize({ width: 1440, height: 1000 }); await ready(stage, 'standard'); await inspect(stage, 'laptop-automatic-1440', 1.5);
    for (device of ['monitor', 'phone']) {
      await page.reload(); await stage.getByRole('button', { name: /Explore this project in 3D/ }).click();
      await stage.getByRole('button', { name: 'Rotate left', exact: true }).and(page.locator(':enabled')).waitFor();
      for (const [tier, dpr] of [['low', 1], ['standard', 1.5], ['high', 2]]) { await select(tier); await ready(stage, tier); await inspect(stage, device + '-' + tier, dpr); }
    }
    await page.goto(base + '/'); const opening = page.locator('.crystal-opening');
    for (const [tier, dpr] of [['low', 1], ['standard', 1.5], ['high', 2]]) {
      await page.evaluate(() => { window.__qualityWork = { draws: 0, targets: [] }; });
      await select(tier); await ready(opening, tier); const sample = await inspect(opening, 'aurora-' + tier, dpr);
      const work = await page.evaluate(() => window.__qualityWork);
      report.measurements.push({ model: 'observatory', ...sample, drawSubmissionsDuringTierChange: work.draws, targetAllocationsDuringTierChange: work.targets });
      if (tier !== 'low') {
        const scale = tier === 'high' ? 1 : .5;
        check(`${tier} actual Aurora transmission buffer uses bounded resolution`, work.targets.some(target => Math.abs(target.width - Math.floor(sample.width * scale)) < 2 && Math.abs(target.height - Math.floor(sample.height * scale)) < 2));
      }
    }
    await opening.getByRole('button', { name: /Open the experience/ }).click();
    const openingCanvas = await opening.locator('canvas').elementHandle();
    await page.waitForTimeout(500); await select('standard');
    await page.waitForFunction(() => document.querySelector('.crystal-opening')?.dataset.phase === 'open', null, { timeout: 10000 });
    check('Changing tier while visible retains the existing Aurora canvas', await opening.locator('canvas').evaluate((current, previous) => current === previous, openingCanvas));
    await openingCanvas.dispose();
    check('Changing tier during Aurora opening preserves completion', await opening.getAttribute('data-phase') === 'open');
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(300);
    check('Detailed preference never overrides system reduced motion on Aurora', await opening.locator('canvas').count() === 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Choose appearance' }).click(); await page.getByLabel('Reduce effects').check();
    check('Reduce effects disables detail selection and removes canvas', await page.getByLabel('3D detail').isDisabled() && await opening.locator('canvas').count() === 0);
    await page.reload();
    await opening.waitFor();
    check('Both presentation choices persist through refresh', await page.evaluate(() => localStorage.getItem('crystal_render_quality') === 'standard' && localStorage.getItem('crystal_reduce_effects') === 'true'));
    check('Refresh retains the still experience', await opening.locator('canvas').count() === 0);
    for (const label of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance' }).click(); await page.getByRole('button', { name: label, exact: true }).click();
      await page.getByRole('button', { name: 'Choose appearance' }).click();
      check(`${label} detail control stays visible and keyboard focusable`, await page.getByLabel('3D detail').isVisible());
      await page.getByLabel('Reduce effects').uncheck(); await page.getByLabel('3D detail').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      check(`${label} appearance panel retains focus and page bounds`, await page.getByRole('button', { name: 'Choose appearance' }).evaluate(node => node === document.activeElement) && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.goto(base + '/accessibility');
    check('Accessibility guide explains the live choices', await page.getByText(/Automatic uses lighter reflections/).count() === 1);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 700 }); await page.getByRole('button', { name: 'Choose appearance' }).click();
      await page.getByLabel('3D detail').scrollIntoViewIfNeeded();
      check(`${width}px panel exposes the native detail control without horizontal overflow`, await page.getByLabel('3D detail').isVisible() && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.keyboard.press('Escape');
    }
    check('No fixture API mutation', writes.length === 0); check('No uncaught browser errors', report.errors.length === 0);
    for (const storage of ['invalid', 'blocked']) {
      const isolated = await browser.newContext({ viewport: { width: 390, height: 900 } });
      await isolated.addInitScript(mode => {
        if (mode === 'invalid') localStorage.setItem('crystal_render_quality', 'unrecognised');
        else { Storage.prototype.getItem = () => { throw new DOMException('Blocked for local QA', 'SecurityError'); }; Storage.prototype.setItem = () => { throw new DOMException('Blocked for local QA', 'SecurityError'); }; }
      }, storage);
      const visitor = await isolated.newPage(); const visitorErrors = []; visitor.on('pageerror', error => visitorErrors.push(error.message));
      await visitor.goto(base + '/accessibility'); await visitor.getByRole('button', { name: 'Choose appearance' }).click();
      check(`${storage} storage safely defaults to Automatic`, await visitor.getByLabel('3D detail').inputValue() === 'automatic');
      await visitor.getByLabel('3D detail').selectOption('high');
      check(`${storage} storage retains the chosen detail for this visit`, await visitor.getByLabel('3D detail').inputValue() === 'high');
      await visitor.getByLabel('Reduce effects').check();
      check(`${storage} storage preserves the quieter preference's precedence`, await visitor.getByLabel('3D detail').isDisabled());
      check(`${storage} storage causes no uncaught errors`, visitorErrors.length === 0); await isolated.close();
    }
    await context.close(); console.log('QUALITY_BROWSER_PASS:', report.checks.length, 'checks;', JSON.stringify(report.measurements));
  } catch (error) { report.failure = String(error); if (debugPage && !debugPage.isClosed()) { report.lastUrl = debugPage.url(); report.lastContent = (await debugPage.locator('body').innerText()).slice(0,1200); await debugPage.screenshot({ path: path.join(output, 'failure.png') }); } throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
