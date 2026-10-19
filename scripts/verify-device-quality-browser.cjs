/* Current retained device views; synthetic project data, real renderer/assets. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8080|8084)$/);
const output = path.resolve('.codex-runtime/qa/device-quality-d1');
const report = { checks: [], errors: [], scope: 'Built preview; synthetic project GETs, actual device GLBs and drawing buffers. Emulation is not physical-device/GPU certification.' };
function check(name, value) { assert.ok(value, name); report.checks.push(name); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  page.on('pageerror', error => report.errors.push(error.message));
  let device = 'laptop';
  const image = await fs.readFile('frontend/public/renders/studio-screen.png');
  await page.route('**/api/site/privacy/status', route => route.fulfill({ json: { ready: false } }));
  await page.route('**/api/projects**', route => route.fulfill({ json: route.request().url().endsWith('/qa-quality') ? {
    id: 'qa-quality', slug: 'qa-quality', featured: false, sortOrder: 0,
    content: { title: 'Local quality fixture', category: 'WEBSITE', summary: 'Synthetic local rendering QA, not published work.', overview: '', approach: '', outcome: '', liveUrl: '', technologies: [], displayDevice: device, coverMediaId: null, coverAlt: '', gallery: [], screens: { desktop: { mediaId: 'qa-quality-screen', alt: 'Synthetic interface' }, mobile: { mediaId: 'qa-quality-screen', alt: 'Synthetic interface' } } }
  } : [] }));
  await page.route('**/api/media/qa-quality-screen', route => route.fulfill({ contentType: 'image/png', body: image }));
  async function quality(value) {
    await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
    await page.locator('.studio-quality-trigger').click();
    await page.getByRole('radio', { name: { low: 'Lighter', standard: 'Balanced', high: 'Detailed', automatic: 'Automatic' }[value], exact: true }).check();
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  }
  try {
    for (device of ['laptop', 'monitor', 'phone']) {
      await page.goto(base + '/portfolio/qa-quality');
      const stage = page.locator('.studio-device-stage');
      await stage.getByRole('button', { name: /Explore this project in 3D/ }).click();
      for (const [tier, dpr] of [['low', 1], ['standard', 1.5], ['high', 2]]) {
        await quality(tier); await stage.scrollIntoViewIfNeeded();
        const canvas = stage.locator(`canvas[data-render-tier="${tier}"][data-preparing="false"]`);
        await canvas.waitFor({ timeout: 30000 });
        check(device + '/' + tier + ' uses bounded actual DPR', await canvas.evaluate((el, expected) => Math.abs(el.width / el.clientWidth - expected) < .02, dpr));
        check(device + '/' + tier + ' has one usable stage', await page.locator('canvas').count() === 1 && await stage.locator('.stage-error').count() === 0);
      }
      await quality('automatic'); await stage.scrollIntoViewIfNeeded();
      await stage.locator('canvas[data-render-tier="standard"][data-preparing="false"]').waitFor();
      check(device + ' automatic starts conservatively', await stage.getAttribute('data-active') === 'true');
      await stage.screenshot({ path: path.join(output, device + '.png') });
    }
    await page.locator('.stage-canvas').focus();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelectorAll('canvas').length === 0);
    check('Automatic never overrides reduced motion', await page.locator('canvas').count() === 0);
    check('Retiring a focused stage preserves keyboard position', await page.locator('.studio-device-stage').evaluate(el => el === document.activeElement));
    check('No uncaught renderer errors', report.errors.length === 0);
    console.log('DEVICE_QUALITY_PASS:', report.checks.length, 'checks;', output);
  } catch (error) {
    report.failure = String(error); await page.screenshot({ path: path.join(output, 'failure.png') }); throw error;
  } finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
