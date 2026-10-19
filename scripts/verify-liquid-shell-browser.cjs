/* Public compositions and shell interactions; built frontend, read-only fixtures. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8080|8084)$/);
const output = path.resolve('.codex-runtime/qa/liquid-shell-d2');
const report = { checks: [], errors: [], scope: 'Installed Edge, built frontend, read-only synthetic privacy/project GETs. Public layouts and shared interaction subset, not full release or authenticated workspace acceptance.' };
function check(name, value) { assert.ok(value, name); report.checks.push(name); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET', 'No business writes');
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/site/privacy/status') return route.fulfill({ json: { ready: false } });
    if (pathname === '/api/projects') return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: { message: 'Not available in this read-only local fixture.' } });
  });
  try {
    for (const route of ['/', '/about', '/services', '/portfolio', '/portfolio/missing', '/contact', '/support', '/accessibility', '/privacy', '/missing-page']) {
      await page.goto(base + route); await page.locator('main h1').waitFor();
      for (const width of [320, 390, 768, 1440, 2560]) {
        await page.setViewportSize({ width, height: 1000 });
        check(route + ' reflows at ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      check(route + ' has one main heading', await page.locator('main h1').count() === 1);
    }
    await page.goto(base + '/support'); await page.setViewportSize({ width: 1440, height: 1000 });
    for (const [label, theme] of [['Dark', 'futuristic'], ['Light', 'clean'], ['Warm dark', 'classic'], ['Fresh light', 'fresh'], ['Warm light', 'summer-vibes']]) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      await page.getByRole('button', { name: label, exact: true }).click();
      check(theme + ' support surfaces use theme colour roles', await page.locator('.support-pathways > a').first().evaluate(el => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'));
      await page.screenshot({ path: path.join(output, 'support-' + theme + '.png') });
    }
    const disclosure = page.getByText('Is support included in my plan?', { exact: true });
    await disclosure.focus(); await page.keyboard.press('Enter');
    check('Styled support disclosure keeps native keyboard operation', await disclosure.evaluate(el => el.parentElement.open));
    await page.goto(base + '/contact');
    const name = page.locator('#firstName'); await name.waitFor();
    const appearance = page.getByRole('button', { name: 'Choose appearance', exact: true });
    await appearance.click(); await name.click();
    check('Outside click dismisses appearance and leaves chosen field focused', await page.locator('#appearance-panel').count() === 0 && await name.evaluate(el => el === document.activeElement));
    await appearance.click(); await page.keyboard.press('Escape');
    check('Escape still returns focus to appearance trigger', await appearance.evaluate(el => el === document.activeElement));
    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.getByRole('button', { name: 'Menu', exact: true });
    await menu.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
    check('Mobile keyboard menu enters navigation', await page.evaluate(() => !!document.activeElement.closest('#studio-mobile-menu')));
    await page.keyboard.press('Escape');
    check('Mobile Escape restores menu focus', await menu.evaluate(el => el === document.activeElement));
    await menu.click(); await page.mouse.click(2, 400);
    check('Outside pointer closes mobile menu', await page.locator('#studio-mobile-menu').count() === 0);
    await page.screenshot({ path: path.join(output, 'contact-compact.png') });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.querySelector('.studio-shell')?.dataset.motion === 'full');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const cueSupported = await page.evaluate(() => CSS.supports('animation-timeline', 'scroll()'));
    const cueStart = await page.locator('.studio-header').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el, '::after').transform).a);
    await page.evaluate(() => window.scrollTo(0, 450));
    await page.waitForFunction(() => scrollY >= 400);
    check('Reading cue preserves native scrolling', await page.evaluate(() => scrollY >= 400));
    if (cueSupported) {
      await page.waitForFunction(start => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.studio-header'), '::after').transform).a > start, cueStart);
      check('Supported reading cue follows actual scroll progress', true);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    check('Reduced motion removes decorative reading animation', await page.locator('.studio-header').evaluate(el => getComputedStyle(el, '::after').animationName === 'none'));
    check('No uncaught public page errors', report.errors.length === 0);
    console.log('LIQUID_SHELL_PASS:', report.checks.length, 'checks;', output);
  } catch (error) { report.failure = String(error); await page.screenshot({ path: path.join(output, 'failure.png') }); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
