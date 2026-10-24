/* Built preview and labelled read-only fixtures; clipboard is intercepted, never the OS clipboard. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/immersive-refinement-20261023');
const report = { checks: [], errors: [], scope: 'Installed Edge, built preview, synthetic read-only public/session/privacy/owner data. Clipboard adapter intercepted. Owner editor panels and entry screens; not live publication, payments, permission enforcement or full release acceptance.' };
function check(name, value) { assert.ok(value, name); report.checks.push(name); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.addInitScript(() => {
    window.__copied = '';
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { if (window.__denyCopy) throw new Error('Local QA denial'); window.__copied = value; } } });
  });
  const project = { id: 'local-qa-refinement', slug: 'local-qa-refinement', featured: false, sortOrder: 0, content: { title: 'Local QA project fixture', category: 'WEBSITE', summary: 'Read-only local fixture, never published.', overview: 'A synthetic story for local browser checks.', approach: 'Keep the existing public route contracts.', outcome: 'Verify navigation and selection without live publication.', liveUrl: '', technologies: ['Local QA'], displayDevice: 'laptop', coverMediaId: null, coverAlt: '', gallery: [], screens: {} } };
  await page.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET', 'No business writes');
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/projects') return route.fulfill({ json: [project] });
    if (endpoint === '/api/projects/local-qa-refinement') return route.fulfill({ json: project });
    if (endpoint === '/api/site/privacy/status') return route.fulfill({ json: { ready: true } });
    if (endpoint === '/api/site/privacy') return route.fulfill({ json: { operator: 'LOCAL QA ONLY', contactEmail: 'qa@example.invalid', updated: '2026-10-23', sections: Array.from({ length: 8 }, (_, i) => ({ id: `qa-${i}`, title: `Local QA section ${i + 1}`, body: 'Synthetic fixture to verify reading and navigation. This is not a published policy.' })) } });
    if (endpoint.endsWith('/auth/session')) return route.fulfill({ json: { authenticated: false, setupRequired: false } });
    return route.fulfill({ status: 404, json: { message: 'Local QA: unavailable.' } });
  });
  try {
    for (const route of ['/', '/about', '/services', '/portfolio', '/portfolio/local-qa-refinement', '/contact', '/support', '/accessibility', '/privacy', '/missing-refinement', '/admin', '/team', '/client']) {
      await page.goto(base + route); await page.locator('main h1').waitFor();
      check(route + ': one main heading', await page.locator('main h1').count() === 1);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        check(route + ': fits ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      check(route + ': content remains selectable', await page.locator('main h1').evaluate(node => getComputedStyle(node).userSelect === 'text'));
      if (['/admin', '/team', '/client'].includes(route)) check(route + ': protected text fields use rounded controls', await page.locator('main input[type="email"]').first().evaluate(node => parseFloat(getComputedStyle(node).borderTopLeftRadius) > 0));
      for (const href of await page.locator('.chapter-links a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))) {
        check(route + ': chapter exists ' + href, await page.locator(href).count() === 1);
      }
    }
    await page.goto(base + '/support'); await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Copy support checklist', exact: true }).click();
    check('Copy action sends a multi-line checklist to the adapter', await page.evaluate(() => window.__copied.includes('Website address:\nWhat happened:')));
    check('Copy success is announced', await page.getByText('Copied.', { exact: true }).isVisible());
    await page.evaluate(() => { window.__denyCopy = true; });
    await page.getByRole('button', { name: 'Copy support checklist', exact: true }).click();
    const fallback = page.getByRole('textbox', { name: 'Copy support checklist manually', exact: true });
    await fallback.focus();
    check('Denied clipboard leaves readable selected manual text', await fallback.evaluate(node => node.readOnly && node.selectionEnd === node.value.length));
    await page.getByRole('navigation', { name: 'On this page', exact: true }).getByRole('link', { name: /Prepare your request/ }).click();
    check('Chapter link navigates to the real section', new URL(page.url()).hash === '#support-preparation');
    await page.getByText('Is support included in my plan?', { exact: true }).focus(); await page.keyboard.press('Enter');
    check('Native disclosure still opens by keyboard', await page.getByText('Is support included in my plan?', { exact: true }).evaluate(node => node.parentElement.open));
    await page.goto(base + '/portfolio/local-qa-refinement?category=WEBSITE');
    await page.getByRole('button', { name: 'Copy project link', exact: true }).click();
    check('Copied public project URL excludes filters', await page.evaluate(() => window.__copied === location.origin + '/portfolio/local-qa-refinement'));
    await page.goto(base + '/privacy'); await page.getByRole('button', { name: 'Copy privacy contact', exact: true }).click();
    check('Privacy copy uses only published fixture email', await page.evaluate(() => window.__copied === 'qa@example.invalid'));
    await page.goto(base + '/services');
    await page.locator('#packageSelection').selectOption('Discuss scope');
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    await page.locator('#maintenanceSelection').selectOption('Basic Maintenance');
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    await page.getByRole('button', { name: 'Copy your starting brief', exact: true }).click();
    check('Builder native selections reach review and copy the chosen brief', await page.evaluate(() => window.__copied.includes('Starting point: Discuss scope\n') && window.__copied.includes('Aftercare: Basic Maintenance')));
    await page.goto(base + '/about'); await page.emulateMedia({ reducedMotion: 'no-preference' });
    const card = page.locator('.founder-note'); await card.hover();
    await page.waitForFunction(() => document.querySelector('.founder-note').style.getPropertyValue('--spotlight-x') !== '');
    check('Pointer lighting follows the card without React state', true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.founder-note').style.getPropertyValue('--spotlight-x') === '');
    check('Reduced motion retires pointer lighting', true);
    check('Decorative light artwork does not drag', await page.locator('.founder-art img').evaluate(node => !node.draggable));
    for (const [label, theme] of [['Dark','futuristic'],['Light','clean'],['Warm dark','classic'],['Fresh light','fresh'],['Warm light','summer-vibes']]) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.locator('#appearance-panel').getByRole('button', { name: label, exact: true }).click(); await page.keyboard.press('Escape');
      check(theme + ': motif and copy controls preserve semantic themes', await page.locator('.page-motif').count() === 1 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, 'about-' + theme + '.png') });
    }
    for (const route of ['/services', '/support', '/contact', '/portfolio', '/accessibility', '/privacy', '/admin', '/team', '/client']) {
      await page.goto(base + route); await page.locator('main h1').waitFor();
      await page.screenshot({ path: path.join(output, route.slice(1) + '-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(output, route.slice(1) + '-phone.png'), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    const draft = { ...project, version: 1, publishedVersion: null, archived: false, updatedAt: '2026-10-23T10:00:00Z' };
    await page.route('**/api/admin/**', route => {
      assert.equal(route.request().method(), 'GET');
      const endpoint = new URL(route.request().url()).pathname;
      if (endpoint === '/api/admin/auth/session') return route.fulfill({ json: { authenticated: true, email: 'local-qa@example.invalid', mfaRequired: false, enrolmentRequired: false } });
      if (endpoint === '/api/admin/projects') return route.fulfill({ json: [draft] });
      if (endpoint.endsWith('/media')) return route.fulfill({ json: [] });
      if (endpoint.endsWith('/revisions/page')) return route.fulfill({ json: { items: [], nextCursor: null, total: 0 } });
      return route.fulfill({ status: 404, json: { message: 'Local owner QA: unavailable.' } });
    });
    await page.goto(base + '/admin');
    const find = page.getByRole('searchbox', { name: 'Find a project', exact: true }); await find.waitFor();
    check('A small owner library still offers project search', await find.isVisible());
    await find.fill('no such project');
    check('Owner filtering updates the result summary without a server write', await page.locator('.admin-project-row').count() === 0 && (await page.locator('.admin-list-summary').textContent()).includes('0 projects'));
    await find.fill(''); await page.locator('#dashboard-sort').selectOption('title');
    check('Restyled owner dropdown retains native value selection', await page.locator('#dashboard-sort').inputValue() === 'title');
    await page.locator('.admin-title-button').click();
    const editor = page.getByRole('group', { name: 'Editor sections', exact: true }); await editor.waitFor();
    for (const panel of ['Details', 'Images', 'Story', 'History']) {
      await editor.getByRole('button', { name: panel, exact: true }).click();
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        check('Owner ' + panel + ' fits ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      await page.screenshot({ path: path.join(output, 'owner-editor-' + panel + '.png'), fullPage: true });
    }
    check('Read-only editor review cannot save an unchanged draft', await page.locator('#project-save').isDisabled());
    check('No uncaught runtime errors', report.errors.length === 0); report.passed = true;
  } catch (error) { report.failure = error.message; await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  console.log('IMMERSIVE_REFINEMENT_PASS: ' + report.checks.length + ' checks');
})().catch(error => { console.error(error); process.exitCode = 1; });
