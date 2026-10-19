/* Native browser zoom through tabs.setZoom, only in a fresh disposable local Edge profile.
   No user profile, real account, provider, OS UI or physical-device claim. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/browser-zoom-d5');
const report = { checks: [], measurements: [], errors: [], scope: 'Installed headless Edge with its native tabs.setZoom API; same1440×1000 outer window, fresh isolated profile and loopback-only synthetic GETs. Browser zoom200/400%, not CSS zoom or device emulation. No real physical-device/assistive certification.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const profile = await fs.mkdtemp(path.join(output, 'profile-'));
  const extension = path.resolve('scripts/fixtures/zoom-extension');
  const context = await chromium.launchPersistentContext(profile, { headless: true, viewport: null, reducedMotion: 'reduce', executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE, ignoreDefaultArgs: ['--disable-extensions'], args: ['--window-size=1440,1000', '--disable-extensions-except=' + extension, '--load-extension=' + extension] });
  let worker;
  async function zoom(scale) {
    return worker.evaluate(async ({ base, scale }) => {
      const tabs = (await chrome.tabs.query({})).filter(tab => tab.url?.startsWith(base + '/'));
      if (tabs.length !== 1) throw new Error('Expected exactly one isolated loopback QA tab.');
      await chrome.tabs.setZoom(tabs[0].id, scale);
      return chrome.tabs.getZoom(tabs[0].id);
    }, { base, scale });
  }
  const page = context.pages()[0];
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET');
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/site/privacy/status') return route.fulfill({ json: { ready: false } });
    if (endpoint === '/api/projects') return route.fulfill({ json: [] });
    if (endpoint.endsWith('/auth/session')) return route.fulfill({ json: { authenticated: false, mfaRequired: false, enrolmentRequired: false, setupAvailable: false } });
    return route.fulfill({ status: 404, json: { message: 'Not available in this read-only zoom fixture.' } });
  });
  try {
    worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 10000 });
    await page.goto(base + '/accessibility'); await page.locator('main h1').waitFor();
    const baseline = await page.evaluate(() => ({ width: innerWidth, outer: outerWidth, dpr: devicePixelRatio }));
    report.baseline = baseline;
    for (const scale of [2, 4]) {
      const acknowledged = await zoom(scale);
      check('Native browser acknowledges ' + scale * 100 + '% zoom (' + acknowledged + ')', Math.abs(acknowledged - scale) < .001);
      await page.waitForFunction(({ scale, dpr }) => Math.abs(devicePixelRatio - scale * dpr) < .05, { scale, dpr: baseline.dpr });
      for (const route of ['/', '/about', '/services', '/portfolio', '/portfolio/missing', '/contact', '/support', '/accessibility', '/privacy', '/missing-page', '/admin', '/team', '/client', '/team/activate', '/client/activate']) {
        await page.goto(base + route); await page.locator('main h1').waitFor();
        const geometry = await page.evaluate(() => ({ width: innerWidth, outer: outerWidth, dpr: devicePixelRatio, document: document.documentElement.scrollWidth, pinchScale: visualViewport.scale, headingVisible: !!document.querySelector('main h1')?.checkVisibility(), clipped: [...document.querySelectorAll('main button')].filter(el => el.clientWidth && el.scrollWidth > el.clientWidth + 3).map(el => el.textContent.trim().slice(0, 80)) }));
        report.measurements.push({ route, scale, ...geometry });
        check(route + '/' + scale + ' real browser scaling', geometry.outer === baseline.outer && Math.abs(geometry.width * scale - baseline.width) <= scale && Math.abs(geometry.dpr - baseline.dpr * scale) < .05 && geometry.pinchScale === 1);
        check(route + '/' + scale + ' document and controls reflow: ' + JSON.stringify(geometry.clipped), geometry.headingVisible && geometry.document <= geometry.width + 1 && geometry.clipped.length === 0);
      }
      await page.goto(base + '/contact'); await page.locator('#firstName').waitFor();
      await page.locator('#firstName').focus(); await page.keyboard.type('Synthetic zoom check');
      await page.keyboard.press('Tab');
      check(scale + ' zoom retains native input and keyboard sequence', await page.locator('#firstName').inputValue() === 'Synthetic zoom check' && await page.locator('#lastName').evaluate(el => el === document.activeElement));
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      await page.getByRole('button', { name: 'Dark', exact: true }).click();
      check(scale + ' zoom appearance remains operable', await page.evaluate(() => document.body.dataset.theme === 'futuristic'));
      await page.screenshot({ path: path.join(output, 'contact-' + scale * 100 + '.png'), fullPage: true });
    }
    check('No uncaught zoom browser errors', report.errors.length === 0);
    console.log('BROWSER_ZOOM_PASS:', report.checks.length, 'checks');
  } catch (error) { report.failure = String(error); await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }); throw error; }
  finally { if (worker) await zoom(1).catch(() => {}); await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
