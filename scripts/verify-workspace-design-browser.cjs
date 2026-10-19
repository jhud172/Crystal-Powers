/* Conversation design with read-only synthetic identities/channels/messages. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/workspace-design-d3');
const report = { checks: [], errors: [], scope: 'Built frontend; read-only intercepted team data and local drafts. No real account/provider or server-authority proof.' };
function check(name, value) { assert.ok(value, name); report.checks.push(name); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  const member = 'd3000000-0000-4000-8000-000000000001';
  const permissions = ['READ_CHANNELS', 'SEND_MESSAGES'];
  const channels = ['general', 'delivery'].map((name, index) => ({ id: `d3000000-0000-4000-8000-00000000000${index + 2}`, name, category: 'Team', description: 'Synthetic project coordination channel.', audience: 'TEAM', archived: false, version: 0, groupId: null }));
  const message = (id, author, body, own) => ({ id, author, authorTeamId: own ? member : 'd3000000-0000-4000-8000-000000000009', authorOwnerId: null, body, version: 0, createdAt: '2026-10-19T10:00:00Z', editedAt: null, pinned: false, replyToId: null, replyAuthor: null, replyBody: null });
  await page.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET', 'No server writes');
    const endpoint = new URL(route.request().url()).pathname;
    const reply = body => route.fulfill({ json: body });
    if (endpoint === '/api/team/auth/session') return reply({ authenticated: true, member: { displayName: 'Alex Morgan', role: 'MEMBER' }, permissions });
    if (endpoint === '/api/team/workspace') return reply({ displayName: 'Alex Morgan', memberId: member, ownerId: null, permissions, channels, settings: { branding: { name: 'Synthetic team studio', tagline: 'A local design review, not a live workspace.', version: 0 }, preferences: { compact: false, unreadBadges: true, mentionAlerts: true, version: 0 }, displayName: 'Alex Morgan', editableName: true, channelPreferences: [] } });
    if (endpoint === '/api/team/unread') return reply(channels.map(item => ({ channelId: item.id, count: 0, lastReadId: 0, latestId: 2 })));
    if (endpoint === '/api/team/mentions') return reply({ mentions: [], nextCursor: null });
    if (endpoint.endsWith('/conversation')) return reply({ version: 0, unchanged: false, hasEarlier: false, hasLater: false, messages: [message(1, 'Alex Morgan', 'The next website revision is ready for review.', true), message(2, 'Riley Quinn', 'I will check the mobile journey and share the details here.', false)] });
    if (endpoint.endsWith('/mention-recipients') || endpoint.endsWith('/pins')) return reply([]);
    report.errors.push('Unexpected fixture endpoint: ' + endpoint); return route.fulfill({ status: 404, json: { message: 'Missing fixture' } });
  });
  try {
    await page.goto(base + '/team');
    const composer = page.locator('#team-message'); await composer.waitFor();
    check('Local initials accompany visible author names', (await page.locator('.team-message-meta .workspace-person-avatar').allTextContents()).join(',') === 'AM,RQ');
    check('Own message has a distinct visual boundary', await page.locator('.team-message[data-own="true"]').count() === 1);
    check('Message actions remain visible without hover', await page.locator('.team-message-actions').first().isVisible());
    check('Member view retains permission-limited navigation', await page.getByRole('button', { name: 'Team members', exact: true }).count() === 0 && await page.getByRole('button', { name: 'Client requests', exact: true }).count() === 0);
    await composer.fill('Unsent design-review draft');
    await page.getByRole('navigation', { name: 'Team channels' }).getByRole('button', { name: '# delivery', exact: true }).click();
    await composer.fill('Separate delivery draft');
    await page.getByRole('navigation', { name: 'Team channels' }).getByRole('button', { name: '# general', exact: true }).click();
    check('Restyled channel navigation retains per-channel drafts', await composer.inputValue() === 'Unsent design-review draft');
    await page.locator('.team-message').first().getByRole('button', { name: 'Reply', exact: true }).click();
    check('Reply still focuses composer and preserves its draft', await composer.evaluate(el => el === document.activeElement) && await composer.inputValue() === 'Unsent design-review draft');
    await page.getByRole('button', { name: 'Remove reply selection', exact: true }).click();
    for (const width of [320, 390, 768, 1024, 1440, 1920, 2560]) {
      await page.setViewportSize({ width, height: 1000 });
      check(width + ' conversation reflows', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const [label, theme] of [['Dark', 'futuristic'], ['Light', 'clean'], ['Warm dark', 'classic'], ['Fresh light', 'fresh'], ['Warm light', 'summer-vibes']]) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: label, exact: true }).click();
      await page.waitForFunction(theme => document.body.dataset.theme === theme, theme);
      check(theme + ' author/actions remain available', await page.locator('.team-message-meta strong').first().isVisible() && await composer.isVisible());
      await page.screenshot({ path: path.join(output, 'team-' + theme + '.png'), fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: /^Open workspace navigation/ }).click();
    check('Compact workspace exposes deliberate navigation panel', await page.locator('#team-workspace-navigation').isVisible());
    await page.getByRole('navigation', { name: 'Team channels' }).getByRole('button', { name: '# delivery', exact: true }).click();
    check('Compact selection closes navigation and preserves draft', !await page.locator('#team-workspace-navigation').isVisible() && await composer.inputValue() === 'Separate delivery draft');
    check('Compact selection moves focus into conversation', await page.locator('#team-conversation h2').first().evaluate(el => el === document.activeElement));
    await page.screenshot({ path: path.join(output, 'team-compact.png'), fullPage: true });
    check('No unrequested renderer or uncaught errors', await page.locator('canvas').count() === 0 && report.errors.length === 0);
    console.log('WORKSPACE_DESIGN_PASS:', report.checks.length, 'checks;', output);
  } catch (error) { report.failure = String(error); await page.screenshot({ path: path.join(output, 'failure.png') }); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
