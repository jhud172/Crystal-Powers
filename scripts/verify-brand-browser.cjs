/* Read-only packaged logo acceptance. No private accounts or provider operations. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:8084$/);
const output = path.resolve('.codex-runtime/qa/brand-pc');
const report = { base, checks: [], errors: [], runtime: 'Installed Edge; isolated packaged application; emulated widths/preferences; original procedural Liquid Light and optional authored GLB' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  let page;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await context.newPage();
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    await page.goto(base); await page.locator('main h1').waitFor();
    const header = page.locator('header');
    const trigger = header.locator('.brand-crystal-button');
    const scene = header.locator('.brand-scene');
    check('Initial public navigation loads no logo GLB or canvas', !requests.some(url => url.includes('crystal-powers-logo-3d.glb')) && await page.locator('canvas').count() === 0);
    for (const width of [320, 390, 480, 600, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      check(width + ' header stays within the viewport', await header.evaluate(element => element.getBoundingClientRect().right <= innerWidth && document.documentElement.scrollWidth <= innerWidth + 1));
      check(width + ' crystal is a loaded 44px target', await trigger.evaluate(element => element.getBoundingClientRect().width >= 44 && element.querySelector('img').naturalWidth > 0));
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await trigger.focus(); await page.keyboard.press('Enter');
    await scene.locator('canvas').waitFor(); await page.waitForFunction(() => document.querySelector('header .brand-scene')?.dataset.ready === 'true');
    check('Keyboard opens one ready opt-in logo', await page.locator('canvas').count() === 1 && await trigger.getAttribute('aria-expanded') === 'true');
    const reverse = header.getByRole('button', { name: 'Bring it together', exact: true });
    await reverse.click(); await header.getByRole('button', { name: 'Unfold the crystal', exact: true }).click();
    check('Rapid reversal keeps one canvas', await page.locator('canvas').count() === 1);
    await reverse.focus();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelectorAll('canvas').length === 0);
    check('Changing system motion while focused preserves keyboard focus', await trigger.evaluate(element => element === document.activeElement) || await header.locator('.brand-home-link').evaluate(element => element === document.activeElement));
    await header.getByRole('button', { name: 'Close logo experience', exact: true }).click();
    check('Reduced-motion close focuses the usable home link', await header.locator('.brand-home-link').evaluate(element => element === document.activeElement));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await trigger.click(); await page.waitForFunction(() => document.querySelector('header .brand-scene')?.dataset.ready === 'true');
    await header.getByRole('button', { name: 'Bring it together', exact: true }).focus(); await page.keyboard.press('Escape');
    check('Escape retires the logo and returns trigger focus', await page.locator('canvas').count() === 0 && await trigger.evaluate(element => element === document.activeElement));
    await trigger.click(); await page.waitForFunction(() => document.querySelector('header .brand-scene')?.dataset.ready === 'true');
    await scene.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    await header.getByRole('status').filter({ hasText: 'could not load' }).waitFor();
    check('Context loss retains visible still artwork and real project navigation', await scene.locator('img').isVisible() && await header.locator('.brand-experience-actions a[href="/portfolio"]').isVisible() && await page.locator('canvas').count() === 0);
    await header.getByRole('button', { name: 'Close logo experience', exact: true }).click();
    const footer = page.locator('footer .brand-identity');
    await footer.locator('.brand-crystal-button').click();
    await page.waitForFunction(() => document.querySelector('footer .brand-scene')?.dataset.ready === 'true');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => document.querySelectorAll('canvas').length === 0, undefined, { timeout: 3000 });
    check('Scrolling away from the footer retires its offscreen canvas', await page.locator('canvas').count() === 0);
    await context.close();
    const phoneContext = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    page = await phoneContext.newPage(); const phoneRequests = [];
    page.on('request', request => phoneRequests.push(request.url()));
    await page.goto(base); await page.locator('main h1').waitFor();
    await page.locator('header .brand-crystal-button').click();
    check('Landscape phone illumination never loads WebGL or the GLB', await page.locator('canvas').count() === 0 && !phoneRequests.some(url => /vendor-three|BrandLogoCanvas|crystal-powers-logo-3d.glb/.test(url)));
    await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
    check('Landscape phone appearance omits 3D detail controls', await page.locator('.studio-quality').count() === 0);
    check('Fresh desktop console and page errors are empty', report.errors.length === 0);
    await page.screenshot({ path: path.join(output, 'landscape-phone.png') });
    await phoneContext.close();
    for (const mode of ['unavailable', 'stalled']) {
      const failureContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      let heldRoute;
      await failureContext.route('**/models/crystal-powers-logo-3d.glb*', route => {
        if (mode === 'unavailable') return route.abort();
        heldRoute = route;
      });
      page = await failureContext.newPage();
      await page.goto(base); await page.locator('main h1').waitFor();
      await page.locator('header .brand-crystal-button').click();
      await page.locator('header').getByRole('button', { name: 'Original crystal', exact: true }).click();
      await page.locator('header [role="status"]').filter({ hasText: 'could not load' }).waitFor({ timeout: 16000 });
      check(mode + ' model falls back to still artwork without a canvas', await page.locator('header .brand-scene img').isVisible() && await page.locator('canvas').count() === 0);
      await page.locator('header').getByRole('button', { name: 'Close logo experience', exact: true }).click();
      check(mode + ' fallback closes with keyboard focus returned', await page.locator('header .brand-crystal-button').evaluate(element => element === document.activeElement));
      if (heldRoute) await heldRoute.abort().catch(() => {});
      await failureContext.close();
    }
  } catch (error) {
    report.failure = error.stack;
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
    throw error;
  } finally {
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
    console.log(JSON.stringify({ checks: report.checks.length, errors: report.errors, failure: report.failure || null }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
