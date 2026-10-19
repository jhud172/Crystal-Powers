/* Approved captures in an intercepted local fixture; never publishes a project. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8080|8084)$/);
const output = path.resolve('.codex-runtime/qa/case-gallery-d2');
const report = { checks: [], errors: [], scope: 'Built frontend, intercepted read-only project/media, approved stored Clare captures. No upload, publication, external live-site request or enquiry submission.' };
function check(name, value) { assert.ok(value, name); report.checks.push(name); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const folder = 'assets/portfolio/clares-life-celebrations';
  const content = JSON.parse(await fs.readFile(folder + '/project-content.json', 'utf8'));
  const desktop = await fs.readFile(folder + '/desktop.jpg'), mobile = await fs.readFile(folder + '/mobile.jpg');
  content.coverMediaId = 'qa-clare-desktop';
  content.screens = { desktop: { mediaId: 'qa-clare-desktop', alt: 'Approved Clare desktop capture' }, mobile: { mediaId: 'qa-clare-mobile', alt: 'Approved Clare mobile capture' } };
  content.gallery = [content.screens.desktop, content.screens.mobile];
  const project = { id: 'qa-clare', slug: 'qa-clare', featured: true, sortOrder: 0, content };
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  let failMobile = false;
  let mobileGate = null;
  let releaseMobile = () => {};
  await page.route('**/api/**', async route => {
    assert.equal(route.request().method(), 'GET', 'No application writes');
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/site/privacy/status') return route.fulfill({ json: { ready: false } });
    if (pathname === '/api/projects') return route.fulfill({ json: [project] });
    if (pathname === '/api/projects/qa-clare') return route.fulfill({ json: project });
    if (pathname === '/api/media/qa-clare-desktop') return route.fulfill({ contentType: 'image/jpeg', body: desktop });
    if (pathname === '/api/media/qa-clare-mobile') { if (mobileGate) await mobileGate; return failMobile ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ contentType: 'image/jpeg', body: mobile }); }
    return route.fulfill({ status: 404, json: { message: 'Missing fixture' } });
  });
  try {
    await page.goto(base + '/portfolio/qa-clare'); await page.locator('main h1').waitFor();
    for (const width of [320, 390, 768, 1440, 2560]) {
      await page.setViewportSize({ width, height: 1000 });
      check(width + ' populated approved case reflows', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const open = page.getByRole('button', { name: 'Open image 1: Approved Clare desktop capture', exact: true });
    await open.focus(); await page.keyboard.press('Enter');
    const modal = page.getByRole('dialog', { name: 'Project images' }); await modal.waitFor();
    const viewport = modal.getByRole('region', { name: 'Project image viewing area' });
    await viewport.locator('img').waitFor(); await page.waitForFunction(() => document.querySelector('.case-image-viewport')?.getAttribute('aria-busy') === 'false');
    check('Gallery opens a native modal with inert background', await modal.evaluate(el => el.matches(':modal')));
    check('First image disables Previous', await modal.getByRole('button', { name: 'Previous image' }).isDisabled());
    check('Native scroll lock applies only while modal is open', await page.evaluate(() => getComputedStyle(document.documentElement).overflow === 'hidden'));
    await modal.getByRole('button', { name: 'Actual size', exact: true }).click();
    check('Actual size confines overflow to image area', await viewport.evaluate(el => el.scrollWidth > el.clientWidth) && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await viewport.focus(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.case-image-viewport').scrollLeft > 0);
    check('Arrow key pans actual-size image instead of changing image', (await modal.locator('footer').innerText()).includes('Image 1 of 2'));
    await modal.getByRole('button', { name: 'Fit image', exact: true }).click();
    await modal.getByRole('button', { name: 'Close image gallery' }).focus(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.case-image-viewport')?.getAttribute('aria-busy') === 'false');
    check('Gallery arrow key selects next image and updates thumbnail', await modal.getByRole('button', { name: 'View image 2: Approved Clare mobile capture' }).getAttribute('aria-current') === 'true');
    check('Last image disables Next', await modal.getByRole('button', { name: 'Next image' }).isDisabled());
    await modal.getByRole('button', { name: 'View image 1: Approved Clare desktop capture' }).click();
    check('Thumbnail navigates back with fit mode reset', await modal.getByRole('button', { name: 'Actual size', exact: true }).getAttribute('aria-pressed') === 'false');
    mobileGate = new Promise(resolve => { releaseMobile = resolve; });
    await modal.getByRole('button', { name: 'Next image' }).click();
    await modal.getByRole('button', { name: 'Reload image', exact: true }).click();
    await viewport.getByRole('status').filter({ hasText: 'Loading image' }).waitFor();
    check('Slow image leaves navigation and close usable', await modal.getByRole('button', { name: 'Close image gallery' }).isEnabled());
    await modal.getByRole('button', { name: 'View image 1: Approved Clare desktop capture' }).click();
    mobileGate = null; releaseMobile();
    await page.waitForFunction(() => document.querySelector('.case-image-viewport img')?.naturalWidth > 0 && document.querySelector('.case-image-viewport')?.getAttribute('aria-busy') === 'false');
    check('Late image completion cannot replace newly selected image', await viewport.locator('img').getAttribute('alt') === 'Approved Clare desktop capture');
    failMobile = true; await modal.getByRole('button', { name: 'Next image' }).click();
    await modal.getByRole('button', { name: 'Reload image', exact: true }).click();
    await modal.getByRole('status').filter({ hasText: 'couldn’t load' }).waitFor();
    check('Failed image retains navigation and close controls', await modal.getByRole('button', { name: 'Previous image' }).isEnabled() && await modal.getByRole('button', { name: 'Close image gallery' }).isEnabled());
    failMobile = false; await modal.getByRole('button', { name: 'Reload image', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.case-image-viewport img')?.naturalWidth > 0 && document.querySelector('.case-image-viewport')?.getAttribute('aria-busy') === 'false');
    check('Retry replaces failed image with loaded content', await viewport.locator('img').isVisible());
    await page.screenshot({ path: path.join(output, 'gallery-desktop.png') });
    for (const [width, height] of [[320, 568], [390, 844], [768, 600], [844, 390]]) {
      await page.setViewportSize({ width, height });
      check(width + 'x' + height + ' modal fits viewport', await modal.evaluate(el => { const rect = el.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth + 1 && rect.height <= innerHeight; }));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'gallery-compact.png') });
    await page.keyboard.press('Escape');
    check('Escape closes and restores exact opening control', !await modal.isVisible() && await open.evaluate(el => el === document.activeElement));
    check('Modal close restores page scrolling', await page.evaluate(() => getComputedStyle(document.documentElement).overflow !== 'hidden'));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('link', { name: 'Discuss a project like this', exact: false }).click();
    await page.waitForURL(base + '/contact?intent=website');
    check('Project conversation preserves approved reference', (await page.locator('.enquiry-project-interest').innerText()).includes(content.title));
    check('No uncaught case/gallery errors', report.errors.length === 0);
    console.log('CASE_GALLERY_PASS:', report.checks.length, 'checks;', output);
  } catch (error) { report.failure = String(error); await page.screenshot({ path: path.join(output, 'failure.png') }); throw error; }
  finally { releaseMobile(); await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
