/* Uses an existing Playwright installation. Does not create accounts or send enquiries. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8080';
const output = path.resolve('.codex-runtime/qa/recovery-pc');
const report = { base, checks: [], errors: [], runtime: 'installed Edge; local server responses and explicit API-failure fixtures; emulated viewports' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CRYSTAL_BROWSER_EXECUTABLE ? { executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE } : { channel: 'msedge' }) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(error.message));
    const requests = []; page.on('request', request => requests.push(request.url()));
    for (const address of ['/missing-recovery-route', '/portfolio/missing-recovery-case']) {
      const response = await page.goto(base + address);
      await page.getByRole('heading', { name: 'A little off course.', exact: true }).waitFor();
      check(`${address} serves HTML with actual 404 and noindex header`, response.status() === 404 && response.headers()['content-type'].includes('text/html') && response.headers()['x-robots-tag'] === 'noindex, nofollow');
      check(`${address} has matching client noindex and recovery title`, await page.locator('meta[name="robots"]').getAttribute('content') === 'noindex, nofollow' && await page.title() === 'Page not found | Crystal Powers');
      check(`${address} exposes Home, Work and Contact recovery`, await page.getByRole('link', { name: 'Back to the studio ↗', exact: true }).isVisible() && await page.getByRole('link', { name: 'Explore the work ↗', exact: true }).isVisible() && await page.getByRole('link', { name: 'Contact James ↗', exact: true }).isVisible());
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 844 });
        check(`${address} ${width} fits without horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
    }
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: theme, exact: true }).click(); await page.keyboard.press('Escape');
      check(`${theme} recovery retains readable paths and contained artwork`, await page.locator('.recovery-signal').isVisible() && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: path.join(output, 'missing-mobile.png'), fullPage: true });
    const contact = page.getByRole('link', { name: 'Contact James ↗', exact: true }); await contact.focus(); await contact.press('Enter');
    await page.getByRole('button', { name: 'General question', exact: true }).and(page.locator('[aria-pressed="true"]')).waitFor();
    check('Recovery contact is keyboard usable and opens general intent', true);
    await page.goBack(); await page.getByRole('heading', { name: 'A little off course.', exact: true }).waitFor();
    check('Browser Back restores missing-case recovery', await page.locator('meta[name="robots"]').getAttribute('content') === 'noindex, nofollow');
    check('Recovery routes do not fetch heavy scenes', !requests.some(url => /vendor-three|ModelCanvas/.test(url)));
    await page.route('**/api/projects/missing-recovery-case', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic temporary outage' }) }));
    await page.reload(); await page.getByRole('heading', { name: 'The project couldn’t load.', exact: true }).waitFor();
    check('Fixture 503 shows temporary failure rather than missing-page copy', await page.locator('.recovery-page').count() === 0 && await page.getByRole('button', { name: 'Try again', exact: true }).isVisible());
    await page.unroute('**/api/projects/missing-recovery-case'); await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.getByRole('heading', { name: 'A little off course.', exact: true }).waitFor();
    check('Retry distinguishes the real server 404 after the fixture outage', true);
    for (const address of ['/home', '/about/', '/admin/', '/birthday/mission-vi/']) {
      const response = await page.request.get(base + address);
      check(`Known alias ${address} remains HTTP 200`, response.status() === 200);
    }
    await page.goto(base + '/about/'); await page.locator('.studio-about h1, .founder-heading h1').waitFor();
    check('Valid trailing-slash page retains canonical metadata and indexing after hydration', await page.title() === 'Meet James | Crystal Powers' && await page.locator('meta[name="robots"]').getAttribute('content') === 'index, follow' && (await page.locator('link[rel="canonical"]').getAttribute('href')).endsWith('/about'));
    check('No uncaught browser errors', report.errors.length === 0);
    console.log('RECOVERY_BROWSER_PASS:', report.checks.length, 'checks; evidence:', output);
  } catch (error) { report.failure = String(error); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
