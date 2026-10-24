/* Current packaged Liquid Light routes and actual device renderer; read-only approved-content fixtures. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/scene-delivery-pc');
const report = { formatVersion: 2, base, checks: [], deviceViews: [], errors: [], scope: 'Current packaged Home/Studio anonymous routes; explicit read-only Clare project/media response fixtures for optional device views. No real publication/accounts/writes; emulated viewports, not physical devices. Collection pixel comparisons use separate source fixture.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const manifest = JSON.parse(await fs.readFile('frontend/public/renders/live/manifest.json', 'utf8'));
    const capture = JSON.parse(await fs.readFile('frontend/public/renders/live/capture-manifest.json', 'utf8'));
    for (const [name, metadata] of [...Object.entries(manifest.renders), ...capture.captures.map(item => [item.filename, item])]) {
      const response = await context.request.get(base + '/renders/live/' + name), body = await response.body();
      check(name + ' packaged bytes match approved capture/delivery', response.status() === 200 && crypto.createHash('sha256').update(body).digest('hex') === metadata.sha256);
      check(name + ' image type/compression agree', response.headers()['content-type']?.startsWith(name.endsWith('.webp') ? 'image/webp' : 'image/png') && !response.headers()['content-encoding']);
    }
    const page = await context.newPage(), writes = [];
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/api/') && !['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
    async function appearance(label) { await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: label, exact: true }).click(); await page.keyboard.press('Escape'); }
    const themes = [['Dark', false], ['Light', true], ['Warm dark', false], ['Fresh light', true], ['Warm light', true]];
    for (const route of ['/', '/about']) for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1100 }); await page.goto(base + route); await page.locator('main h1').waitFor();
      for (const [label, light] of themes) {
        await appearance(label);
        const artwork = page.locator(route === '/' ? '.liquid-light-art img' : '.founder-artefacts img');
        await page.locator(route === '/' ? '.liquid-hero' : '.founder-artefacts').scrollIntoViewIfNeeded(); await artwork.evaluate(image => image.decode());
        check(route + ' ' + label + ' ' + width + ' selected artwork loads without required WebGL', (await artwork.getAttribute('src')).includes('/renders/liquid-light/') && await page.locator('main canvas').count() === 0);
        if (route === '/') check(label + ' ' + width + ' hero palette matches appearance', await page.locator('.liquid-hero').getAttribute('data-light') === String(light));
        check(route + ' ' + label + ' ' + width + ' has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
    }
    const content = JSON.parse(await fs.readFile('assets/portfolio/clares-life-celebrations/project-content.json', 'utf8'));
    const desktop = '40000000-0000-4000-8000-000000000001', mobile = '40000000-0000-4000-8000-000000000002';
    const project = { id: '40000000-0000-4000-8000-000000000003', slug: 'local-qa-approved-clare', featured: false, sortOrder: 0, content: { ...content, coverMediaId: desktop, screens: { desktop: { mediaId: desktop, alt: content.coverAlt }, mobile: { mediaId: mobile, alt: 'Approved Clare mobile capture — local QA only' } } } };
    await context.route('**/api/projects*', route => route.fulfill({ json: [project] }));
    await context.route('**/api/projects/local-qa-approved-clare', route => route.fulfill({ json: project }));
    for (const [id, file] of [[desktop, 'desktop.jpg'], [mobile, 'mobile.jpg']]) await context.route('**/api/media/' + id, route => route.fulfill({ contentType: 'image/jpeg', path: path.resolve('assets/portfolio/clares-life-celebrations', file) }));
    await page.goto(base + '/portfolio/local-qa-approved-clare'); await page.locator('.project-device-preview').waitFor();
    await page.evaluate(() => { const note = document.createElement('aside'); note.textContent = 'LOCAL QA: approved Clare content/media response fixture. Production publication remains pending.'; note.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#fff;color:#111;z-index:9999;font:12px sans-serif;padding:8px'; document.body.append(note); });
    const stage = page.locator('.model-stage');
    for (const [label] of themes) for (const width of [768, 1440]) {
      await page.setViewportSize({ width, height: 1100 }); await appearance(label);
      for (const [device, model] of [['Laptop', 'laptop'], ['Desktop', 'monitor'], ['Mobile', 'phone']]) {
        await page.getByRole('group', { name: 'Choose project device', exact: true }).getByRole('button', { name: device, exact: true }).click();
        const image = stage.locator('.stage-project-device img'); await image.scrollIntoViewIfNeeded(); await image.evaluate(element => element.decode());
        check(label + ' ' + width + ' ' + model + ' keeps approved screenshot first', (await image.getAttribute('src')).endsWith(model === 'phone' ? mobile : desktop));
        await stage.getByRole('button', { name: 'Explore this project in 3D' }).click();
        await page.waitForFunction(() => document.querySelector('.model-stage')?.dataset.ready === 'true', undefined, { timeout: 20000 });
        check(label + ' ' + width + ' ' + model + ' reaches one ready bounded-quality canvas', await page.locator('canvas').count() === 1 && await stage.locator('canvas').getAttribute('data-render-tier') === 'standard');
        check(label + ' ' + width + ' ' + model + ' canvas covers the reserved surface', await stage.evaluate(element => { const a = element.getBoundingClientRect(), b = element.querySelector('canvas').getBoundingClientRect(); return Math.abs(a.width - b.width) <= 1 && Math.abs(a.height - b.height) <= 1; }));
        report.deviceViews.push({ theme: label, width, model, renderTier: await stage.locator('canvas').getAttribute('data-render-tier'), frame: await stage.locator('canvas').boundingBox() });
        if (width === 1440 && ['Dark', 'Light'].includes(label)) await stage.screenshot({ path: path.join(output, label + '-' + model + '-live.png') });
        await stage.getByRole('button', { name: 'Close 3D view', exact: true }).click(); await stage.locator('canvas').waitFor({ state: 'detached' });
        check(label + ' ' + width + ' ' + model + ' native close restores screenshot/focus', await stage.getByRole('button', { name: 'Explore this project in 3D' }).evaluate(element => element === document.activeElement) && await image.isVisible());
      }
    }
    await page.setViewportSize({ width: 390, height: 844 }); await stage.scrollIntoViewIfNeeded();
    check('Phone viewport retains image with no live control/canvas', await stage.locator('canvas').count() === 0 && await stage.getByRole('button', { name: 'Explore this project in 3D' }).count() === 0 && await stage.locator('.stage-project-device img').isVisible());
    report.apiWrites = writes;
    check('No API mutations or uncaught browser errors', writes.length === 0 && report.errors.length === 0);
    console.log('SCENE_DELIVERY_BROWSER_PASS:' + report.checks.length);
    await context.close();
  } catch (failure) { report.failure = failure.stack; console.error(failure); process.exitCode = 1; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})();
