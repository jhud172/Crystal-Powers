/* Explicit UI fixtures for private-state navigation; no credentials, publication or real account changes. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.ok(/^http:\/\/127\.0\.0\.1:(8080|8083|8084|5175)$/.test(base));
const output = path.resolve('.codex-runtime/qa/navigation-pc');
const report = { base, checks: [], errors: [], warnings: [], runtime: 'installed Edge; labelled private-state UI fixtures, native history and unload' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const reply = (route, data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'warning') report.warnings.push(message.text()); });
  const button = name => page.getByRole('button', { name, exact: true });
  const project = { id: '11111111-1111-4111-8111-111111111111', slug: 'clare-navigation-fixture', version: 1, publishedVersion: null, archived: false, featured: false, sortOrder: 0, updatedAt: '2026-10-10T10:00:00Z', content: { title: 'Clare navigation UI fixture', category: 'WEBSITE', summary: 'Private UI fixture', overview: '', approach: '', outcome: '', liveUrl: '', technologies: [], displayDevice: 'laptop', coverMediaId: null, coverAlt: '', gallery: [] } };
  async function confirmNavigation(action, accept = false) {
    const waiting = page.waitForEvent('dialog'); const navigation = action(); const dialog = await waiting;
    check('History or link exit presents the private-state confirmation', dialog.type() === 'confirm');
    if (accept) await dialog.accept(); else await dialog.dismiss();
    await navigation;
    await page.waitForFunction(() => location.pathname === '/admin');
  }
  try {
    await page.route('**/api/admin/auth/session', route => reply(route, { authenticated: true, email: 'navigation-fixture@example.invalid', mfaRequired: false, enrolmentRequired: false, setupAvailable: false }));
    await page.route('**/api/admin/projects', route => reply(route, [project]));
    await page.route('**/api/admin/projects/*/media', route => reply(route, []));
    await page.route('**/api/admin/account/recovery-codes', route => reply(route, { recoveryCodes: ['synthetic-navigation-code-one', 'synthetic-navigation-code-two'] }));
    await page.goto(base + '/admin?from=navigation-fixture'); await button('Account security').waitFor();
    await page.getByRole('link', { name: 'Crystal Powers owner studio', exact: true }).click(); await page.waitForURL(base + '/admin');
    await button('Account security').click(); await button('Recovery codes').click(); await page.getByLabel('Current password', { exact: true }).fill('synthetic-ui-password'); await page.getByLabel('Authenticator or recovery code', { exact: true }).fill('synthetic-ui-code'); await button('Replace recovery codes ↗').click(); await page.getByRole('heading', { name: 'Recovery codes replaced.', exact: true }).waitFor();
    await confirmNavigation(() => page.goBack());
    check('Declining Back preserves the current URL and one-time code display', new URL(page.url()).search === '' && await page.locator('.admin-recovery-codes code').count() === 2);
    await confirmNavigation(() => page.getByRole('link', { name: 'Public site', exact: true }).click());
    check('Declining a public link preserves unsaved one-time codes', await page.locator('.admin-recovery-codes code').count() === 2);
    let refreshType = ''; page.once('dialog', dialog => { refreshType = dialog.type(); dialog.dismiss(); }); await page.reload().catch(() => {});
    check('Declining refresh uses native unload protection and keeps one-time codes', refreshType === 'beforeunload' && await page.locator('.admin-recovery-codes code').count() === 2);
    await page.getByRole('checkbox', { name: 'I’ve saved my new recovery codes privately.', exact: true }).check();
    let unexpected = 0; page.on('dialog', async dialog => { unexpected++; await dialog.dismiss(); });
    await page.getByRole('link', { name: 'Public site', exact: true }).click(); await page.waitForURL(base + '/');
    check('Acknowledged codes allow a public exit without another prompt', unexpected === 0 && await page.locator('.admin-recovery-codes').count() === 0);
    page.removeAllListeners('dialog');
    await page.goBack(); await button(project.content.title).waitFor(); await button(project.content.title).click(); await page.locator('#project-summary').fill('Retained private edits for history acceptance.');
    await confirmNavigation(() => page.goForward());
    check('Declining Forward retains the editor and all unsaved content', await page.locator('#project-summary').inputValue() === 'Retained private edits for history acceptance.');
    await confirmNavigation(() => page.goBack());
    check('Declining repeated Back does not duplicate prompts or lose edits', await page.locator('#project-summary').inputValue() === 'Retained private edits for history acceptance.' && new URL(page.url()).search === '');
    const waiting = page.waitForEvent('dialog'); const forward = page.goForward(); const discard = await waiting; await discard.accept(); await forward; await page.waitForURL(base + '/');
    check('Confirmed Forward discards private state and leaves for the public route', await page.locator('.admin-editor').count() === 0);
    await page.goBack(); await button(project.content.title).click(); await page.locator('#project-summary').waitFor();
    check('Returning after confirmed discard reloads only the saved server draft', await page.locator('#project-summary').inputValue() === project.content.summary);
    await button('← All projects').click(); await page.goBack(); await page.waitForURL(base + '/admin?from=navigation-fixture'); await page.goForward(); await page.waitForURL(base + '/admin');
    check('Saved workspace Back and Forward remain unblocked', await button(project.content.title).isVisible());
    await page.goto(base + '/admin/reset#synthetic-link-fixture'); await page.getByLabel('New password', { exact: true }).waitFor();
    check('Reset-token stripping preserves the router history index', await page.evaluate(() => typeof history.state?.idx === 'number') && new URL(page.url()).hash === '');
    check('One shared blocker avoids router warning and browser errors', report.errors.length === 0 && !report.warnings.some(message => /blocker|POP navigation|data router/i.test(message)));
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log('NAVIGATION_BROWSER_PASS:', report.checks.length, 'checks; evidence:', output);
  } catch (error) { report.failure = String(error); await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
