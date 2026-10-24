/* Labelled group UI fixtures; real membership, lifecycle and tenant scope use integration tests. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/team-groups-pc');
const report = { checks: [], errors: [], runtime: 'Packaged app in installed Edge; explicit synthetic group/member/conflict/access fixtures; no real account or provider' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  const groupId = '20000000-0000-4000-8000-000000000001', activeId = '20000000-0000-4000-8000-000000000002', inactiveId = '20000000-0000-4000-8000-000000000003';
  const permissions = ['READ_CHANNELS', 'MANAGE_GROUPS'];
  let group = { id: groupId, name: 'Private delivery', description: 'Synthetic private description', archived: false, version: 7, members: [activeId, inactiveId] };
  let mode = 'CONFLICT', writes = [], created = null;
  await page.route('**/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname, method = route.request().method();
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (endpoint === '/api/team/auth/session') return reply({ authenticated: true, member: { displayName: 'Synthetic group manager', role: 'ADMIN' }, permissions });
    if (endpoint === '/api/team/workspace') return reply({ displayName: 'Synthetic group manager', memberId: activeId, ownerId: null, permissions, channels: [], settings: { branding: { name: 'Synthetic QA workspace', tagline: '', version: 0 }, preferences: { compact: false, unreadBadges: false, mentionAlerts: false, version: 0 }, displayName: 'Synthetic group manager', editableName: true, channelPreferences: [] } });
    if (endpoint === '/api/team/unread') return reply([]);
    if (endpoint === '/api/team/mentions') return reply({ mentions: [], nextCursor: null });
    if (endpoint === '/api/admin/auth/csrf') return reply({ token: 'synthetic-browser-csrf', headerName: 'X-CSRF-TOKEN' });
    if (endpoint === '/api/team/groups/eligible-members') return reply([{ id: activeId, displayName: 'Synthetic active member', role: 'MEMBER' }]);
    if (endpoint === '/api/team/groups' && method === 'GET') return mode === 'LIST_DENIED' ? reply({ message: 'Synthetic group list access removed.' }, 403) : reply([group, ...(created ? [created] : [])].map(value => ({ ...value, members: [] })));
    if (endpoint === '/api/team/groups/' + groupId && method === 'GET') return mode === 'MISSING' ? reply({ message: 'Synthetic group is no longer available.' }, 404) : reply(group);
    if ((endpoint === '/api/team/groups/' + groupId && method === 'PATCH') || (endpoint === '/api/team/groups' && method === 'POST')) {
      const input = route.request().postDataJSON(); writes.push({ method, input });
      if (mode === 'CONFLICT') return reply({ message: 'Synthetic group conflict: reload before saving.' }, 409);
      if (mode === 'DENIED') return reply({ message: 'Synthetic group management access removed.' }, 403);
      if (method === 'POST') { created = { ...input, id: '20000000-0000-4000-8000-000000000004', version: 0 }; return reply(created); }
      group = { ...group, ...input, version: group.version + 1 }; return reply(group);
    }
    report.errors.push('Unexpected fixture endpoint: ' + method + ' ' + endpoint); return reply({ message: 'Unexpected synthetic endpoint' }, 400);
  });
  const name = () => page.getByLabel('Group name', { exact: true });
  const save = () => page.getByRole('button', { name: 'Save group and membership', exact: true });
  const open = async () => { await page.getByRole('button', { name: /^Private delivery / }).click(); await name().waitFor(); };
  try {
    await page.goto(base + '/team'); await page.getByRole('button', { name: 'Private groups', exact: true }).click(); await open();
    check('Opening an editor focuses its heading', await page.getByRole('heading', { name: 'Group settings and membership', exact: true }).evaluate(element => element === document.activeElement));
    check('Unchanged membership cannot be needlessly saved', await save().isDisabled());
    check('Inactive member is retained with an access warning', (await page.locator('.team-group-members').innerText()).includes('Inactive member — retained without access'));
    check('Active membership is visibly selected', await page.getByLabel('Synthetic active member · member', { exact: true }).isChecked());
    check('Name and description have usable control targets', await name().evaluate(element => element.getBoundingClientRect().height >= 44) && await page.getByLabel('Description', { exact: true }).evaluate(element => element.getBoundingClientRect().height >= 44));
    await page.getByLabel('Description', { exact: true }).fill('Synthetic private description for visual review');
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: theme, exact: true }).click(); await page.keyboard.press('Escape');
      check(theme + ' primary action is visible, full-size and has readable contrast', await save().evaluate(element => {
        const style = getComputedStyle(element);
        const luminance = colour => { const rgb = colour.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
        const foreground = luminance(style.color), background = luminance(style.backgroundColor);
        return element.getBoundingClientRect().height >= 44 && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) >= 4.5;
      }));
      for (const width of [320, 390, 768, 1024, 1440, 1920]) { await page.setViewportSize({ width, height: 900 }); check(theme + ' ' + width + ' group editor has no overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    }
    for (const width of [390, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.screenshot({ path: path.join(output, 'groups-' + width + '.png'), fullPage: true }); }
    await name().fill('Preserved private draft'); await page.getByLabel('Description', { exact: true }).fill('Keep this membership draft.');
    await page.getByLabel('Synthetic active member · member', { exact: true }).uncheck(); await save().click();
    await page.getByText('Synthetic group conflict: reload before saving.', { exact: true }).waitFor();
    check('Conflict retains names and description', await name().inputValue() === 'Preserved private draft' && await page.getByLabel('Description', { exact: true }).inputValue() === 'Keep this membership draft.');
    check('Conflict retains membership choices and the original revision', !await page.getByLabel('Synthetic active member · member', { exact: true }).isChecked() && writes[0].input.expectedVersion === 7 && writes[0].input.members.length === 1 && writes[0].input.members[0] === inactiveId);
    page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: 'Create a group', exact: true }).click();
    check('Declining discard preserves the editing draft', await name().inputValue() === 'Preserved private draft');
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Create a group', exact: true }).click();
    await page.getByRole('heading', { name: 'Create a private group', exact: true }).waitFor(); await name().waitFor();
    check('New group begins without stale private fields', await name().inputValue() === '' && await page.getByLabel('Description', { exact: true }).inputValue() === '');
    check('Creation does not offer an ignored archive option', await page.getByLabel('Archive group and hide its channels', { exact: true }).count() === 0);
    mode = 'SUCCESS'; await name().fill('New delivery group'); await save().click();
    await page.getByRole('button', { name: 'New delivery group Active', exact: true }).waitFor();
    check('Creation uses the create contract and an empty deliberate membership', writes.at(-1).method === 'POST' && writes.at(-1).input.expectedVersion === 0 && writes.at(-1).input.members.length === 0);
    await open(); await page.getByLabel('Archive group and hide its channels', { exact: true }).check();
    const count = writes.length; page.once('dialog', dialog => dialog.dismiss()); await save().click();
    check('Archive cancellation makes no write', writes.length === count && await page.getByLabel('Archive group and hide its channels', { exact: true }).isChecked());
    page.once('dialog', dialog => dialog.accept()); await save().click(); await page.getByRole('button', { name: 'Private delivery Archived', exact: true }).waitFor();
    check('Archive preserves both active and retained memberships', group.archived && group.members.includes(activeId) && group.members.includes(inactiveId));
    await open(); await page.getByLabel('Archive group and hide its channels', { exact: true }).uncheck(); await save().click();
    await page.getByRole('button', { name: 'Private delivery Active', exact: true }).waitFor();
    check('Restore uses the current archive revision', !group.archived && writes.at(-1).input.expectedVersion === 8);
    await open(); await name().fill('Remove this denied private draft'); mode = 'DENIED'; await save().click();
    await page.getByText('Synthetic group management access removed.', { exact: true }).waitFor();
    check('Denied save clears private editor fields and group metadata', await name().count() === 0 && await page.locator('.team-group-list > li').count() === 0 && !(await page.locator('.team-groups').innerText()).includes('Synthetic private description'));
    check('Denied management disables creation until a successful refresh', await page.getByRole('button', { name: 'Create a group', exact: true }).isDisabled());
    report.deniedFocus = await page.evaluate(() => document.activeElement?.outerHTML.slice(0,500));
    check('Access denial focuses the surviving error alert', await page.getByRole('alert').filter({ hasText: 'Synthetic group management access removed.' }).evaluate(element => element === document.activeElement));
    mode = 'LIST_DENIED'; await page.getByRole('button', { name: 'Refresh groups', exact: true }).click(); await page.getByText('Synthetic group list access removed.', { exact: true }).waitFor();
    check('Denied list refresh cannot restore stale private rows', await page.locator('.team-group-list > li').count() === 0);
    mode = 'MISSING'; await page.getByRole('button', { name: 'Refresh groups', exact: true }).click(); await page.getByRole('button', { name: 'Private delivery Active', exact: true }).click();
    await page.getByText('Synthetic group is no longer available.', { exact: true }).waitFor();
    check('Missing group detail clears stale editor and list metadata', await name().count() === 0 && await page.locator('.team-group-list > li').count() === 0);
    check('No unexpected requests or browser errors', report.errors.length === 0);
  } catch (error) { report.failure = error.stack; throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  console.log('TEAM_GROUPS_BROWSER_PASS: ' + report.checks.length + ' checks');
})().catch(error => { console.error(error); process.exitCode = 1; });
