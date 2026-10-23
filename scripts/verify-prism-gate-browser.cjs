/* Local built frontend only; synthetic GETs, no business or provider writes. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:8084$/);
const output = path.resolve('.codex-runtime/qa/prism-precision-20261023');
const report = { checks: [], errors: [], scope: 'Installed Edge, built preview, synthetic privacy/empty portfolio GETs; viewport emulation, not physical-device performance or deployment acceptance.' };
function check(name, result) { assert.ok(result, name); report.checks.push(name); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET');
    return route.fulfill({ json: new URL(route.request().url()).pathname === '/api/projects' ? [] : { ready: false } });
  });
  const phase = value => page.waitForFunction(value => document.querySelector('.crystal-opening')?.dataset.phase === value, value);
  const gate = page.locator('.crystal-opening');
  const trigger = gate.locator('.opening-actions button').first();
  try {
    await page.goto(base);
    await gate.scrollIntoViewIfNeeded();
    check('Prism is available alongside the retained Liquid Light hero', await page.locator('.liquid-hero').count() === 1);
    check('Still artwork loads before opt-in WebGL', await gate.locator('img').evaluate(el => el.complete && el.naturalWidth > 0) && await page.locator('canvas').count() === 0);
    await trigger.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.crystal-opening')?.dataset.ready === 'true');
    await phase('opening');
    await trigger.click(); await phase('closing');
    await trigger.click(); await phase('opening');
    await phase('open');
    check('Opening can reverse twice without losing its authored pose or readiness', await gate.getAttribute('data-ready') === 'true');
    check('Only one active canvas', await page.locator('canvas').count() === 1);
    await gate.getByRole('button', { name: 'Apps', exact: true }).click();
    check('Projected services remain interactive', await gate.getByRole('heading', { name: 'Ideas, made interactive.' }).isVisible());
    const surface = gate.locator('.opening-surface');
    await surface.focus(); await page.keyboard.press('ArrowRight');
    await gate.getByRole('button', { name: 'Reset view', exact: true }).click();
    await gate.getByRole('button', { name: 'Pulse light', exact: true }).click();
    await page.waitForFunction(() => parseFloat(document.querySelector('.opening-canvas canvas')?.style.getPropertyValue('--prism-pulse') || '0') > .5);
    await page.waitForFunction(() => document.querySelector('.opening-canvas canvas')?.style.getPropertyValue('--prism-pulse') === '0.0000');
    check('Pulse lights rise and fully settle', true);
    await gate.screenshot({ path: path.join(output, 'desktop-open.png') });
    await gate.getByRole('button', { name: 'Systems', exact: true }).focus();
    await page.keyboard.press('Escape'); await phase('closed');
    check('Escape releases WebGL and returns focus', await page.locator('canvas').count() === 0 && await trigger.evaluate(el => el === document.activeElement));
    await page.waitForTimeout(250);
    check('Dismissed stage does not reactivate itself', await page.locator('canvas').count() === 0);
    await trigger.click(); await phase('open');
    const contextLost = await gate.locator('canvas').evaluate(canvas => {
      const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      extension.loseContext(); return true;
    });
    check('Browser exposes real WebGL context-loss simulation', contextLost);
    await gate.getByRole('button', { name: 'Retry 3D', exact: true }).waitFor();
    check('Lost context keeps accessible information and releases its canvas', await page.locator('canvas').count() === 0 && await gate.getByRole('navigation', { name: 'Explore studio services' }).isVisible());
    await gate.getByRole('button', { name: 'Retry 3D', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.crystal-opening')?.dataset.ready === 'true');
    await phase('open');
    check('Explicit retry rebuilds one working canvas', await page.locator('canvas').count() === 1);
    await page.keyboard.press('Escape'); await phase('closed');
    for (const label of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      await page.locator('#appearance-panel').getByRole('button', { name: label, exact: true }).click();
      await gate.scrollIntoViewIfNeeded();
      check(label + ': page has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await gate.screenshot({ path: path.join(output, label.replaceAll(' ', '-') + '.png') });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await trigger.click(); await phase('open');
    check('Reduced motion keeps information without creating a canvas', await page.locator('canvas').count() === 0 && await gate.getByRole('navigation', { name: 'Explore studio services' }).isVisible());
    await page.keyboard.press('Escape'); await phase('closed');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await trigger.click(); await phase('open');
      check(width + 'px: information and controls fit', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (width < 768) check(width + 'px: compact policy uses still artwork', await page.locator('canvas').count() === 0);
      await gate.screenshot({ path: path.join(output, 'width-' + width + '.png') });
      await page.keyboard.press('Escape'); await phase('closed');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await trigger.click(); await phase('open');
    check('Doubled text remains in normal flow without overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    check('No browser runtime errors', report.errors.length === 0);
    report.passed = true;
  } catch (error) {
    report.failure = error.message;
    report.gate = await gate.getAttribute('data-phase').catch(() => null);
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log('PRISM_BROWSER_PASS: ' + report.checks.length + ' checks');
})().catch(error => { console.error(error); process.exitCode = 1; });
