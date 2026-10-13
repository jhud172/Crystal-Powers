/* Compare real optional laptop rendering using a labelled read-only local case fixture. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:5175';
assert.match(base, /^http:\/\/127\.0\.0\.1:(5175|8084)$/);
const output = path.resolve('.codex-runtime/qa/laptop-pc');
const candidatePath = process.env.CRYSTAL_LAPTOP_CANDIDATE || '.codex-runtime/qa/laptop-optimised.glb';
const baselinePath = process.env.CRYSTAL_LAPTOP_BASELINE;
const deliveredCandidate = process.env.CRYSTAL_LAPTOP_DELIVERED === '1';
const report = { base, runtime: 'Installed Edge; labelled read-only case/image fixture, emulated viewports, WebGL call instrumentation; not physical/GPU frame-time certification', checks: [], errors: [], draws: [] };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const project = { id: 'qa-laptop', slug: 'qa-laptop', featured: false, sortOrder: 0, content: { title: 'Local device acceptance fixture', category: 'WEBSITE', summary: 'Synthetic local QA only; not a published client project.', overview: '', approach: '', outcome: '', liveUrl: '', technologies: [], displayDevice: 'laptop', coverMediaId: null, coverAlt: '', gallery: [], screens: { desktop: { mediaId: 'qa-laptop-screen', alt: 'Original studio interface used only for local device acceptance' }, mobile: null } } };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const candidateBuffer = await fs.readFile(candidatePath); const screen = await fs.readFile('frontend/public/renders/studio-screen.png');
  const baselineBuffer = baselinePath ? await fs.readFile(baselinePath) : null;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  try {
    for (const variant of ['baseline', 'candidate']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
      await context.addInitScript(() => {
        window.__modelDraws = [];
        for (const Constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
          for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
            const original = Constructor?.prototype[name]; if (!original) continue;
            Constructor.prototype[name] = function (...args) { window.__modelDraws.push(performance.now()); return original.apply(this, args); };
          }
        }
      });
      await context.route('**/api/projects**', route => route.fulfill({ json: route.request().url().endsWith('/qa-laptop') ? project : [project] }));
      await context.route('**/api/media/qa-laptop-screen', route => route.fulfill({ contentType: 'image/png', body: screen }));
      if (variant === 'candidate' && !deliveredCandidate) await context.route('**/models/laptop.glb*', route => route.fulfill({ contentType: 'application/octet-stream', body: candidateBuffer }));
      else if (variant === 'baseline' && baselineBuffer) await context.route('**/models/laptop.glb*', route => route.fulfill({ contentType: 'application/octet-stream', body: baselineBuffer }));
      const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
      const writes = []; page.on('request', request => { if (request.method() !== 'GET' && request.url().includes('/api/')) writes.push(request.url()); });
      await page.goto(base + '/portfolio/qa-laptop'); const stage = page.locator('.studio-device-stage'); await stage.waitFor();
      await stage.getByRole('button', { name: /Explore this project in 3D/ }).click();
      await stage.getByRole('button', { name: 'Rotate left', exact: true }).waitFor();
      await stage.getByRole('button', { name: 'Rotate left', exact: true }).and(page.locator(':enabled')).waitFor({ timeout: 20_000 });
      check(`${variant} actual scene reaches ready with one canvas and screenshot`, await stage.locator('canvas').count() === 1 && await stage.locator('.stage-error,.stage-status').count() === 0);
      if (variant === 'candidate' && deliveredCandidate) {
        const bytes = await page.evaluate(() => performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/models/laptop.glb')?.decodedBodySize);
        check('Actual browser consumes the exact promoted candidate size from packaged delivery', bytes === candidateBuffer.length);
      }
      await page.waitForTimeout(300);
      await page.evaluate(() => { window.__modelDraws = []; });
      await stage.getByRole('button', { name: 'Rotate right', exact: true }).click(); await page.waitForTimeout(300);
      const draws = await page.evaluate(() => window.__modelDraws.length);
      const renderer = await stage.locator('canvas').evaluate(canvas => { const gl = canvas.getContext('webgl2'); const extension = gl?.getExtension('WEBGL_debug_renderer_info'); return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'Unavailable'; });
      report.draws.push({ variant, width: 1440, deliveredCandidate: variant === 'candidate' && deliveredCandidate, drawCallsForSingleDemandRotation: draws, renderer });
      check(`${variant} rotation causes a bounded nonzero actual WebGL render`, draws > 0 && draws < 1000);
      await stage.getByRole('button', { name: 'Reset', exact: true }).click();
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(200);
        check(`${variant} ${width}px contains optional canvas without overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && await stage.locator('canvas').count() === 1);
        await stage.screenshot({ path: path.join(output, `${variant}-open-${width}.png`), style: '.studio-header { visibility: hidden; }' });
      }
      await stage.getByRole('button', { name: 'Animate', exact: true }).click(); await page.waitForTimeout(1000);
      check(`${variant} authored hinge animates and exposes Pause`, await stage.getByRole('button', { name: 'Pause', exact: true }).getAttribute('aria-pressed') === 'true');
      await stage.screenshot({ path: path.join(output, `${variant}-hinge-in-motion.png`), style: '.studio-header { visibility: hidden; }' });
      await stage.getByRole('button', { name: 'Pause', exact: true }).click(); await stage.getByRole('button', { name: 'Reset', exact: true }).click();
      await stage.locator('.stage-canvas').focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Escape');
      check(`${variant} native Escape closes and restores launch focus`, await stage.locator('canvas').count() === 0 && await stage.locator('.stage-launch').evaluate(node => node === document.activeElement));
      await context.route('**/models/laptop.glb*', route => route.abort('failed'));
      await page.reload(); await stage.getByRole('button', { name: /Explore this project in 3D/ }).click(); await stage.locator('.stage-error').waitFor();
      check(`${variant} model outage retains real screenshot and retry/close`, await stage.getByRole('button', { name: 'Retry 3D view', exact: true }).isVisible() && await stage.locator('.stage-project-device img').evaluate(image => image.complete && image.naturalWidth > 0));
      await stage.getByRole('button', { name: 'Close 3D view', exact: true }).click();
      check(`${variant} fixture performs no API write`, writes.length === 0);
      await context.close();
    }
    const baseline = report.draws.find(item => item.variant === 'baseline').drawCallsForSingleDemandRotation;
    const candidateDraws = report.draws.find(item => item.variant === 'candidate').drawCallsForSingleDemandRotation;
    check('Optimised laptop measurably reduces actual demand-frame draw submissions', candidateDraws < baseline / 2);
    check('No uncaught browser errors', report.errors.length === 0);
    console.log('LAPTOP_BROWSER_PASS:', report.checks.length, 'checks;', JSON.stringify(report.draws));
  } catch (error) { report.failure = String(error); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
