/* Explicit UI fixtures; real authorisation and byte deletion are integration-tested separately. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/archived-group-pc');
const report = { checks: [], errors: [], runtime: 'Packaged app in installed Edge; synthetic archived-group queue fixtures; no provider or scanner' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  const id = '10000000-0000-4000-8000-000000000001', channel = '10000000-0000-4000-8000-000000000002';
  const permissions = ['READ_CHANNELS', 'REVIEW_UPLOADS', 'EDIT_UPLOADS', 'MANAGE_GROUPS'];
  let removed = false, removal;
  const attachment = () => ({ id, channelId: channel, messageId: 1, filename: 'retained-reference.png', contentType: 'image/png', sizeBytes: 100, scanState: 'CLEAN', reviewState: 'APPROVED', reviewNote: '', version: removed ? 4 : 3, removedAt: removed ? '2026-10-16T12:00:00Z' : null, authorOwnerId: null, authorTeamId: null });
  const cleanup = '/api/team/channel-uploads/' + channel + '/messages/1';
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), endpoint = url.pathname;
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (endpoint === '/api/team/auth/session') return reply({ authenticated: true, member: { displayName: 'Synthetic group manager', role: 'ADMIN' }, permissions });
    if (endpoint === '/api/team/workspace') return reply({ displayName: 'Synthetic group manager', memberId: id, ownerId: null, permissions, channels: [], settings: { branding: { name: 'Synthetic QA workspace', tagline: '', version: 0 }, preferences: { compact: false, unreadBadges: false, mentionAlerts: false, version: 0 }, displayName: 'Synthetic group manager', editableName: true, channelPreferences: [] } });
    if (endpoint === '/api/team/unread') return reply([]);
    if (endpoint === '/api/team/mentions') return reply({ mentions: [], nextCursor: null });
    if (endpoint === '/api/admin/auth/csrf') return reply({ token: 'synthetic-browser-csrf', headerName: 'X-CSRF-TOKEN' });
    if (endpoint === '/api/team/uploads/queue') return reply({ files: [], nextCursor: null, totals: {} });
    if (endpoint === '/api/team/channel-uploads') return reply({ files: url.searchParams.get('inactive') === 'true' ? [{ attachment: attachment(), channelName: 'retained-private', channelArchived: false, groupArchived: true, messageRemoved: false, createdAt: '2026-10-16T10:00:00Z' }] : [], nextCursor: null });
    if (endpoint === cleanup) return reply({ channelId: channel, messageId: 1, files: [attachment()], scannerConfigured: false });
    if (endpoint === cleanup + '/' + id + '/remove' && route.request().method() === 'POST') { removal = route.request().postDataJSON(); removed = true; return reply(attachment()); }
    report.errors.push('Unexpected fixture endpoint: ' + endpoint); return reply({ message: 'Unexpected synthetic endpoint' }, 400);
  });
  try {
    await page.goto(base + '/team');
    await page.getByRole('button', { name: 'Upload review', exact: true }).click();
    await page.getByRole('button', { name: 'Conversation files', exact: true }).click();
    await page.getByRole('heading', { name: 'Conversation file queue', exact: true }).waitFor();
    check('Ordinary queue does not expose archived-group files', await page.getByRole('button', { name: 'Review message files', exact: true }).count() === 0);
    await page.getByLabel('Only archived channels, archived groups or removed messages', { exact: true }).check();
    const open = page.getByRole('button', { name: 'Review message files', exact: true }); await open.waitFor();
    report.queueText = await page.locator('.team-member-list').innerText();
    check('Retained queue identifies the archived group', report.queueText.includes('Archived group'));
    check('Review filter has a full-size labelled control', await page.getByRole('combobox', { name: /^Review state/ }).evaluate(element => element.getBoundingClientRect().height >= 44));
    check('Archived filter has a full-size touch label', await page.getByLabel('Only archived channels, archived groups or removed messages', { exact: true }).evaluate(element => element.closest('label').getBoundingClientRect().height >= 44));
    await open.click();
    const detail = page.locator('#queue-attachment-detail');
    await detail.getByRole('button', { name: 'Remove attachment', exact: true }).waitFor();
    check('Archived group explains blocked conversation actions', (await detail.innerText()).includes('channel or group is archived'));
    check('Clean approved fixture still has no download', await detail.getByRole('link').count() === 0);
    check('Cleanup has no scan, review, rename or upload controls', await detail.locator('form, input, select').count() === 0);
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      await page.getByRole('button', { name: theme, exact: true }).click();
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        check(theme + ' ' + width + ' cleanup has no overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
    }
    for (const width of [390, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.screenshot({ path: path.join(output, 'cleanup-' + width + '.png'), fullPage: true }); }
    page.once('dialog', dialog => dialog.accept()); await detail.getByRole('button', { name: 'Remove attachment', exact: true }).click();
    await detail.getByText('Current attachment bytes removed. Audit metadata remains.', { exact: true }).waitFor();
    check('Cleanup submits displayed version through retention endpoint', removed && removal.version === 3);
    check('Removed fixture no longer offers removal', await detail.getByRole('button', { name: 'Remove attachment', exact: true }).count() === 0);
    await detail.getByRole('button', { name: 'Close attachments', exact: true }).click();
    check('Closing returns keyboard focus to the queue trigger', await open.evaluate(element => element === document.activeElement));
    check('No browser errors or unexpected API requests', report.errors.length === 0);
  } catch (error) { report.failure = error.stack; throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  console.log('ARCHIVED_GROUP_BROWSER_PASS: ' + report.checks.length + ' checks');
})().catch(error => { console.error(error); process.exitCode = 1; });
