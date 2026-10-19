/* Labelled moderation UI fixtures; real upload/lease boundaries are integration-tested separately. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'); const path = require('node:path'); const assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/upload-review-pc');
const report = { checks: [], errors: [], runtime: 'Packaged app in installed Edge; explicit synthetic staff/queue/conflict API fixtures; no scanner/provider call' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  const permissions = ['READ_CHANNELS', 'REVIEW_UPLOADS', 'EDIT_UPLOADS'];
  const id = '10000000-0000-4000-8000-000000000001';
  let mode = 'SCANNING', saves = 0, lastSave;
  const file = () => ({ requestId: id, createdAt: '2026-10-16T10:00:00Z', attachment: { id, filename: 'synthetic-reference.png', contentType: 'image/png', sizeBytes: 100, reviewState: 'PENDING', reviewNote: '', version: mode === 'SCANNING' ? 1 : 2, scanState: mode === 'SCANNING' ? 'SCANNING' : 'CLEAN', scannedAt: null, removedAt: null } });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), endpoint = url.pathname;
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (endpoint === '/api/team/auth/session') return reply({ authenticated: true, member: { displayName: 'Synthetic reviewer', role: 'MODERATOR' }, permissions });
    if (endpoint === '/api/team/workspace') return reply({ displayName: 'Synthetic reviewer', memberId: id, ownerId: null, permissions, channels: [], settings: { branding: { name: 'Synthetic QA workspace', tagline: '', version: 0 }, preferences: { compact: false, unreadBadges: false, mentionAlerts: false, version: 0 }, displayName: 'Synthetic reviewer', editableName: true, channelPreferences: [] } });
    if (endpoint === '/api/team/unread') return reply([]);
    if (endpoint === '/api/team/mentions') return reply({ mentions: [], nextCursor: null });
    if (endpoint === '/api/admin/auth/csrf') return reply({ token: 'synthetic-browser-csrf', headerName: 'X-CSRF-TOKEN' });
    if (endpoint === '/api/team/uploads/queue') return reply({ files: [file()], nextCursor: null, totals: { PENDING: 1 } });
    if (endpoint === '/api/team/uploads/' + id && route.request().method() === 'PATCH') {
      saves++; lastSave = route.request().postDataJSON();
      return reply({ message: 'Synthetic optimistic conflict: reload before saving again.' }, 409);
    }
    report.errors.push('Unexpected fixture endpoint: ' + endpoint); return reply({ message: 'Unexpected synthetic endpoint' }, 400);
  });
  try {
    await page.goto(base + '/team');
    await page.getByRole('button', { name: 'Upload review', exact: true }).click();
    const row = page.locator('.team-member-list > li').filter({ hasText: 'synthetic-reference.png' });
    await row.waitFor();
    const decision = row.getByLabel('Decision', { exact: true });
    const save = row.getByRole('button', { name: 'Save review', exact: true });
    check('Active scan disables the decision and save controls', await decision.isDisabled() && await save.isDisabled());
    check('Active scan explains when review becomes available', (await row.innerText()).includes('Review is available once it finishes'));
    check('Quarantine offers no private download', await row.getByRole('link').count() === 0);
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: theme, exact: true }).click();
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        check(theme + ' ' + width + ' moderation has no overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await row.getByLabel('Internal review note', { exact: true }).fill('A draft note while waiting.');
    await row.getByText('Remove stored content', { exact: true }).click();
    await row.getByLabel('Internal reason for removal', { exact: true }).fill('Synthetic withdrawal reason');
    check('Authorised removal remains available during a scan', await row.getByRole('button', { name: 'Remove stored bytes', exact: true }).isEnabled());
    check('No review was submitted while scanning', saves === 0);
    mode = 'CLEAN'; page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reload', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('select[name="decision"]')?.disabled);
    check('Completed clean scan re-enables human review', await decision.isEnabled() && await save.isEnabled());
    check('Completed scan exposes a private review download', await row.getByRole('link', { name: 'Download privately for review', exact: true }).isVisible());
    await decision.selectOption('APPROVED'); await row.getByLabel('Internal review note', { exact: true }).fill('Keep this note after a conflict.');
    await save.click(); await page.getByText('Synthetic optimistic conflict: reload before saving again.', { exact: true }).waitFor();
    check('Conflict retains the chosen decision and note', await decision.inputValue() === 'APPROVED' && await row.getByLabel('Internal review note', { exact: true }).inputValue() === 'Keep this note after a conflict.');
    check('Review submits the originally displayed version', saves === 1 && lastSave.expectedVersion === 2 && lastSave.state === 'APPROVED');
    check('No browser errors or unexpected API calls', report.errors.length === 0);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      report.skipLinks ??= {}; report.skipLinks[width] = await page.locator('.studio-skip').evaluate(element => ({ focused: element === document.activeElement, top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom, position: getComputedStyle(element).position, transform: getComputedStyle(element).transform, text: element.textContent }));
      check(width + ' unfocused skip link stays outside the content', !report.skipLinks[width].focused && report.skipLinks[width].bottom <= 0);
      await page.screenshot({ path: path.join(output, 'review-' + width + '.png'), fullPage: true });
    }
    const skip = page.locator('.studio-skip'); await skip.focus();
    check('Keyboard focus exposes the skip link', await skip.evaluate(element => element.getBoundingClientRect().top >= 0));
    await page.keyboard.press('Enter');
    check('Skip link moves focus to the private page main content', await page.locator('#main-content').evaluate(element => element === document.activeElement));
  } catch (error) { report.failure = error.stack; throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  console.log('UPLOAD_REVIEW_BROWSER_PASS: ' + report.checks.length + ' checks');
})().catch(error => { console.error(error); process.exitCode = 1; });
