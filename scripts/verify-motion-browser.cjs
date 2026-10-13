/* Local read-only browser QA. Visibility signals are deterministic emulation, explicitly labelled. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'); const path = require('node:path'); const assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/motion-pc');
const report = { base, checks: [], errors: [], samples: [], scope: 'Actual packaged native routes/preferences/canvas; read-only labelled project fixture. Headless emulated viewports. Hidden-state dispatch is deterministic document visibility emulation, not native tab acceptance.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const project = { id: 'qa-motion', slug: 'qa-motion', featured: true, sortOrder: 0, content: { title: 'LOCAL QA — motion lifecycle fixture', category: 'WEBSITE', summary: 'Synthetic acceptance fixture, never published client work.', overview: '', approach: '', outcome: '', liveUrl: '', technologies: [], displayDevice: 'laptop', coverMediaId: 'qa-motion-screen', coverAlt: 'Own studio artwork for local QA', gallery: [], screens: { desktop: { mediaId: 'qa-motion-screen', alt: 'Own desktop screen' }, mobile: { mediaId: 'qa-motion-screen', alt: 'Own screen for lifecycle testing' } } } };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const screen = await fs.readFile('frontend/public/renders/studio-screen.png');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    await context.addInitScript(() => {
      const targets = new WeakMap(); const counts = {};
      const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
      function key(target, type) { return target === document && type === 'visibilitychange' ? 'visibility' : typeof target.media === 'string' && type === 'change' ? target.media : null; }
      EventTarget.prototype.addEventListener = function (type, listener, options) {
        const name = key(this, type);
        if (name) { let listeners = targets.get(this); if (!listeners) targets.set(this, listeners = new Set()); if (!listeners.has(listener)) { listeners.add(listener); counts[name] = (counts[name] || 0) + 1; } }
        return add.call(this, type, listener, options);
      };
      EventTarget.prototype.removeEventListener = function (type, listener, options) {
        const name = key(this, type); if (name && targets.get(this)?.delete(listener)) counts[name]--;
        return remove.call(this, type, listener, options);
      };
      window.__motionCounts = counts; window.__motionDraws = 0;
      for (const Constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) for (const method of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const original = Constructor?.prototype[method]; if (original) Constructor.prototype[method] = function (...args) { window.__motionDraws++; return original.apply(this, args); };
      }
    });
    await context.route('**/api/projects**', route => route.fulfill({ json: route.request().url().includes('/qa-motion') ? project : [project] }));
    await context.route('**/api/media/qa-motion-screen', route => route.fulfill({ contentType: 'image/png', body: screen }));
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    const writes = []; page.on('request', request => { if (request.url().includes('/api/') && request.method() !== 'GET') writes.push(request.url()); });
    const shell = page.locator('.studio-shell'); const opening = page.locator('.crystal-opening');
    async function detail(value) { await page.getByRole('button', { name: 'Choose appearance' }).click(); await page.getByLabel('3D detail').selectOption(value); await page.keyboard.press('Escape'); }
    async function reduced(value) { await page.getByRole('button', { name: 'Choose appearance' }).click(); await page.getByLabel('Reduce effects').setChecked(value); await page.keyboard.press('Escape'); }
    async function visible(value) {
      await page.evaluate(value => { if (value) delete document.visibilityState; else Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); }, value);
    }
    async function policy(mode) { await page.waitForFunction(mode => document.querySelector('.studio-shell')?.dataset.motion === mode, mode); }
    async function listeners(label, expectedVisibility = 2) {
      const counts = await page.evaluate(() => window.__motionCounts); report.samples.push({ label, counts });
      // Home also owns one live-project refresh; a case owns collection + detail.
      check(`${label} bounded shared visibility and portfolio refresh subscribers`, counts.visibility === expectedVisibility);
      check(`${label} one shared system motion subscriber`, counts['(prefers-reduced-motion: reduce)'] === 1);
      check(`${label} one shared compact motion subscriber`, counts['(max-width: 480px)'] === 1);
    }
    await page.goto(base + '/'); await opening.locator('canvas').waitFor(); await listeners('initial Home');
    check('Offscreen section text is readable before its introduction cue', await page.locator('[data-reveal]').evaluate(node => Number(getComputedStyle(node).opacity) >= .95 && getComputedStyle(node).transform === 'none'));
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 }); await detail('automatic'); await policy(width <= 480 ? 'light' : 'full');
      check(`${width}px Automatic leaves text visible`, await page.locator('main h1').evaluate(node => Number(getComputedStyle(node).opacity) >= .95));
      check(`${width}px no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await detail('low'); await policy('light'); check(`${width}px Lighter cancels decorative animations`, await shell.evaluate(node => node.getAnimations({ subtree: true }).length === 0));
      await detail('standard'); await policy('full');
      await page.emulateMedia({ reducedMotion: 'reduce' }); await policy('reduced'); await opening.locator('canvas').waitFor({ state: 'detached' });
      await opening.getByRole('button', { name: /Open the experience/ }).click(); check(`${width}px reduced opening is immediate`, await opening.getAttribute('data-phase') === 'open');
      await opening.getByRole('button', { name: /Close crystal/ }).click(); await page.emulateMedia({ reducedMotion: 'no-preference' }); await policy('full');
      await reduced(true); await policy('reduced'); check(`${width}px Reduce effects keeps still artwork`, await page.locator('canvas').count() === 0 && await opening.locator('img').isVisible()); await reduced(false); await policy('full');
      await listeners(`${width}px policy changes`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 }); await opening.scrollIntoViewIfNeeded();
    // The preceding explicit Close is preserved; preferences must not undo user dismissal.
    await opening.getByRole('button', { name: /Open the experience/ }).click(); await page.locator('.crystal-opening[data-ready="true"]').waitFor();
    await visible(false); await policy('paused'); await page.locator('canvas').waitFor({ state: 'detached' });
    const hiddenDraws = await page.evaluate(() => window.__motionDraws); await page.waitForTimeout(300);
    check('Emulated hidden document makes no GPU draw submissions', await page.evaluate(() => window.__motionDraws) === hiddenDraws);
    check('Hidden opening settles content without waiting for animation', await opening.getAttribute('data-phase') === 'open');
    await visible(true); await policy('full'); await opening.locator('canvas').waitFor(); check('Visible resume owns only one canvas', await page.locator('canvas').count() === 1);
    for (let index = 0; index < 4; index++) {
      await page.locator('.opening-project a').click(); const stage = page.locator('.studio-device-stage'); await stage.getByRole('button', { name: /Explore this project in 3D/ }).click(); await page.locator('.model-stage[data-ready="true"]').waitFor();
      for (const device of ['Mobile', 'Desktop', 'Laptop']) { await page.getByRole('button', { name: device, exact: true }).click(); await stage.getByRole('button', { name: 'Rotate left' }).waitFor(); await page.locator('.model-stage[data-ready="true"]').waitFor(); check(`cycle${index} ${device} owns only one canvas`, await page.locator('canvas').count() === 1); }
      await visible(false); await policy('paused'); await stage.locator('canvas').waitFor({ state: 'detached' }); await visible(true); await page.locator('.model-stage[data-ready="true"]').waitFor();
      await page.locator('.studio-header').getByRole('link', { name: 'Crystal Powers home' }).click(); await opening.scrollIntoViewIfNeeded(); await page.locator('.crystal-opening[data-ready="true"]').waitFor();
      check(`cycle${index} departing case releases its stage and Home resumes`, await opening.locator('canvas').count() === 1 && await page.locator('canvas').count() === 1);
      await listeners(`cycle${index} route/device changes`); await opening.getByRole('button', { name: /Open the experience/ }).click(); await page.waitForFunction(() => document.querySelector('.crystal-opening')?.dataset.phase === 'open');
    }
    await page.locator('.studio-header').getByRole('link', { name: 'Services', exact: true }).click(); await page.locator('main h1').waitFor();
    check('Route navigation keeps main focus', await page.locator('main').evaluate(node => node === document.activeElement));
    await page.waitForTimeout(300); check('Completed route cue leaves no running animation', await shell.evaluate(node => node.getAnimations({ subtree: true }).length === 0));
    await listeners('final plain route', 1); check('Plain route keeps zero canvases', await page.locator('canvas').count() === 0);
    const fallbackContext = await browser.newContext();
    await fallbackContext.addInitScript(() => { window.IntersectionObserver = undefined; });
    const fallbackPage = await fallbackContext.newPage(); fallbackPage.on('pageerror', error => report.errors.push(error.message)); fallbackPage.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    await fallbackPage.goto(base + '/'); await fallbackPage.locator('main h1').waitFor();
    check('Missing section observer preserves readable content', await fallbackPage.locator('[data-reveal]').evaluate(node => Number(getComputedStyle(node).opacity) >= .95));
    await fallbackPage.waitForTimeout(300); check('Missing observer still lets route cue complete', await fallbackPage.locator('main').evaluate(node => node.getAnimations().length === 0));
    await fallbackContext.close();
    check('No API write', writes.length === 0); check('No uncaught browser errors', report.errors.length === 0);
    console.log('MOTION_BROWSER_PASS:', report.checks.length, 'checks; deterministic visibility, actual route/stage lifecycle'); await context.close();
  } catch (error) { report.failure = String(error); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
