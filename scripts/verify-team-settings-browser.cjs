/* Explicit synthetic settings fixtures. Server authority/persistence use integration tests. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/team-settings-pc');
const report = { checks: [], errors: [], runtime: 'Installed Edge; synthetic settings/conflict/outage fixtures; no real account/provider' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  const id = '30000000-0000-4000-8000-000000000001', memberId = '30000000-0000-4000-8000-000000000002';
  const permissions = ['READ_CHANNELS', 'MANAGE_SETTINGS'];
  let settings = { branding: { name: 'Synthetic QA workspace', tagline: 'Private test identity', version: 3 }, preferences: { compact: false, unreadBadges: true, mentionAlerts: true, version: 2 }, displayName: 'Synthetic teammate', editableName: true, channelPreferences: [] };
  let preference = { channelId: id, favourite: false, unreadBadges: true, mentionAlerts: true, version: 4 };
  let mode = 'OK', writes = [], requests = 0, releaseChannel, releaseSave, channelRequested, saveRequested;
  await page.route('**/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname, method = route.request().method();
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (endpoint === '/api/team/auth/session') return reply({ authenticated: true, member: { displayName: settings.displayName, role: 'ADMIN' }, permissions });
    if (endpoint === '/api/team/workspace') return reply({ displayName: settings.displayName, memberId, ownerId: null, permissions, settings, channels: [{ id, name: 'general', description: 'Synthetic channel', category: 'Team', audience: 'TEAM', groupId: null, version: 0 }] });
    if (endpoint === '/api/team/unread') return reply([{ channelId: id, count: 2, lastReadId: 0, latestId: 2 }]);
    if (endpoint === '/api/team/mentions') return reply({ mentions: [], nextCursor: null });
    if (endpoint.endsWith('/mention-recipients')) return reply([]);
    if (endpoint.includes('/conversation')) return reply({ version: 0, unchanged: false, messages: [], hasEarlier: false, hasLater: false });
    if (endpoint === '/api/admin/auth/csrf') return reply({ token: 'synthetic-settings-csrf', headerName: 'X-CSRF-TOKEN' });
    if (endpoint === '/api/team/settings' && method === 'GET') { requests++; return mode === 'OUTAGE' ? reply({ message: 'Synthetic settings reload unavailable.' }, 503) : reply(settings); }
    if (endpoint === '/api/team/settings/channels/' + id && method === 'GET') {
      const response = mode === 'CHANNEL_DELAY' ? { ...preference, favourite: true } : preference;
      if (mode === 'CHANNEL_DELAY') await new Promise(resolve => { releaseChannel = resolve; channelRequested(); });
      return reply(response);
    }
    if (endpoint.startsWith('/api/team/settings/') && method === 'PATCH') {
      const input = route.request().postDataJSON(); writes.push({ endpoint, input });
      if (mode === 'SAVE_DELAY') await new Promise(resolve => { releaseSave = resolve; saveRequested(); });
      if (mode === 'CONFLICT') return reply({ message: 'Synthetic settings conflict. Reload current values.' }, 409);
      if (endpoint.endsWith('/personal')) settings = { ...settings, displayName: input.displayName, preferences: { compact: input.compact, unreadBadges: input.unreadBadges, mentionAlerts: input.mentionAlerts, version: settings.preferences.version + 1 } };
      else if (endpoint.endsWith('/workspace')) settings = { ...settings, branding: { name: input.name, tagline: input.tagline, version: settings.branding.version + 1 } };
      else { preference = { ...preference, favourite: input.favourite, unreadBadges: input.unreadBadges, mentionAlerts: input.mentionAlerts, version: preference.version + 1 }; settings = { ...settings, channelPreferences: [preference] }; return reply(preference); }
      return reply(settings);
    }
    report.errors.push('Unexpected fixture endpoint: ' + method + ' ' + endpoint); return reply({ message: 'Unexpected synthetic endpoint' }, 400);
  });
  const personal = () => page.getByRole('button', { name: 'Save personal settings', exact: true });
  const workspace = () => page.getByRole('button', { name: 'Save workspace details', exact: true });
  const reload = () => page.getByRole('button', { name: 'Reload current settings', exact: true });
  try {
    await page.goto(base + '/team'); await page.getByRole('button', { name: 'Workspace and account settings', exact: true }).click();
    check('Settings heading receives focus', await page.getByRole('heading', { name: 'Workspace and account settings', exact: true }).evaluate(element => element === document.activeElement));
    check('Saved-state feedback starts independently for each settings form',await page.locator('.workspace-save-state[data-dirty="false"]').count()===2);
    check('Unchanged forms cannot be saved', await personal().isDisabled() && await workspace().isDisabled());
    for (const appearance of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: appearance, exact: true }).click();
      for (const width of [320, 390, 768, 1024, 1440, 1920]) { await page.setViewportSize({ width, height: 900 }); check(appearance + ' ' + width + ' settings do not overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    }
    await page.getByLabel('Workspace name', { exact: true }).fill('Unsent workspace identity');
    check('Workspace edits mark only the workspace form as unsaved',await page.locator('.workspace-save-state[data-dirty="true"]').count()===1 && await page.getByText('Workspace identity: unsaved changes.',{exact:true}).isVisible());
    await page.getByLabel('Display name', { exact: true }).fill('Updated synthetic teammate');
    await page.getByLabel('Compact message spacing', { exact: true }).check();
    await personal().click(); await page.getByText('Personal preferences saved. Mention choices apply to future messages.', { exact: true }).waitFor();
    check('Personal confirmation clears only its own unsaved indicator',await page.getByText('Personal settings: matches saved values.',{exact:true}).isVisible() && await page.getByText('Workspace identity: unsaved changes.',{exact:true}).isVisible());
    check('Personal save preserves the other form draft', await page.getByLabel('Workspace name', { exact: true }).inputValue() === 'Unsent workspace identity' && await workspace().isEnabled());
    check('Personal save uses only its original revision and fields', writes[0].input.expectedVersion === 2 && !('name' in writes[0].input));
    await workspace().click(); await page.getByText('Workspace details saved.', { exact: true }).waitFor();
    check('Workspace save leaves saved personal settings intact', await page.getByLabel('Display name', { exact: true }).inputValue() === 'Updated synthetic teammate' && await page.getByLabel('Compact message spacing', { exact: true }).isChecked() && await personal().isDisabled());
    mode = 'OUTAGE'; await reload().click(); await page.getByText('Synthetic settings reload unavailable.', { exact: true }).waitFor();
    check('Failed reload clears stale saved success status', await page.locator('.team-settings > [role=status]').innerText() === '');
    check('Outage retains the last confirmed settings', await page.getByLabel('Workspace name', { exact: true }).inputValue() === 'Unsent workspace identity');
    mode = 'CONFLICT'; await page.getByLabel('Display name', { exact: true }).fill('Keep my conflicted profile'); await personal().click();
    await page.getByText('Synthetic settings conflict. Reload current values.', { exact: true }).waitFor();
    check('Conflict retains profile draft and original version', await page.getByLabel('Display name', { exact: true }).inputValue() === 'Keep my conflicted profile' && writes.at(-1).input.expectedVersion === 3);
    const before = requests; page.once('dialog', dialog => dialog.dismiss()); await reload().click();
    check('Cancelled reload retains draft and makes no request', requests === before && await page.getByLabel('Display name', { exact: true }).inputValue() === 'Keep my conflicted profile');
    mode = 'OK'; page.once('dialog', dialog => dialog.accept()); await reload().click(); await page.getByText('Current settings loaded.', { exact: true }).waitFor();
    check('Confirmed reload restores current server values', await page.getByLabel('Display name', { exact: true }).inputValue() === settings.displayName && await personal().isDisabled());
    await page.getByRole('button', { name: 'Back to channels', exact: true }).click();
    check('Back returns focus to channel content', await page.getByRole('heading', { name: '# general', exact: true }).evaluate(element => element === document.activeElement));
    await page.getByText('Your channel preferences', { exact: true }).click(); await page.getByLabel('Favourite this channel', { exact: true }).waitFor();
    check('Channel defaults are loaded', !await page.getByLabel('Favourite this channel', { exact: true }).isChecked());
    const channelStarted = new Promise(resolve => { channelRequested = resolve; });
    mode = 'CHANNEL_DELAY'; await page.getByRole('button', { name: 'Reload channel preferences', exact: true }).click(); await channelStarted;
    await page.getByText('Loading preferences…', { exact: true }).waitFor();
    await page.getByText('Your channel preferences', { exact: true }).click();
    await page.getByText('Your channel preferences', { exact: true }).click();
    releaseChannel(); mode = 'OK';
    await page.waitForFunction(() => !document.querySelector('.team-channel-preferences fieldset')?.disabled);
    check('Closing and reopening during reload releases loading state', await page.getByLabel('Favourite this channel', { exact: true }).isEnabled());
    check('Cancelled reload cannot replace the retained channel choices', !await page.getByLabel('Favourite this channel', { exact: true }).isChecked());
    mode = 'CONFLICT'; await page.getByLabel('Favourite this channel', { exact: true }).focus(); await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'Save channel preferences', exact: true }).click(); await page.getByText('Synthetic settings conflict. Reload current values.', { exact: true }).waitFor();
    check('Channel conflict preserves selection and revision', await page.getByLabel('Favourite this channel', { exact: true }).isChecked() && writes.at(-1).input.expectedVersion === 4);
    mode = 'OK'; await page.getByRole('button', { name: 'Save channel preferences', exact: true }).click(); await page.getByText('Channel preferences saved. Mention choices apply to future messages.', { exact: true }).waitFor();
    check('Saved channel choice is reflected in navigation', await page.getByLabel('Favourite channel', { exact: true }).count() === 1);
    check('Private profile/settings are not persisted in browser storage', !await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => /Keep my conflicted profile|Updated synthetic teammate|Unsent workspace identity/.test(value))));
    for (const width of [390, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.screenshot({ path: path.join(output, 'channel-preferences-' + width + '.png'), fullPage: true }); }
    await page.getByRole('button', { name: 'Workspace and account settings', exact: true }).click();
    const saveStarted = new Promise(resolve => { saveRequested = resolve; });
    mode = 'SAVE_DELAY'; await page.getByLabel('Display name', { exact: true }).fill('Single confirmed profile');
    const priorWrites = writes.length;
    await page.locator('.team-settings form').first().evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
    await saveStarted;
    await page.waitForFunction(() => document.querySelector('.team-settings input')?.disabled);
    check('Repeated submit owns one in-flight save and locks inputs', writes.length === priorWrites + 1 && await personal().isDisabled());
    releaseSave(); mode = 'OK'; await page.getByText('Personal preferences saved. Mention choices apply to future messages.', { exact: true }).waitFor();
    check('Confirmed delayed save unlocks inputs without creating a dirty draft', await page.getByLabel('Display name', { exact: true }).isEnabled() && await personal().isDisabled());
    permissions.splice(1); await page.reload(); await page.getByRole('button', { name: 'Workspace and account settings', exact: true }).click();
    check('Ordinary staff retain personal preferences without workspace editing', await page.getByLabel('Display name', { exact: true }).isEnabled() && await page.getByLabel('Workspace name', { exact: true }).count() === 0);
    check('No unexpected endpoints or browser errors', report.errors.length === 0);
    console.log('TEAM_SETTINGS_BROWSER_PASS:' + report.checks.length);
  } catch (failure) { report.failure = failure.stack; report.activeElement = await page.evaluate(() => document.activeElement?.outerHTML); console.error(failure); process.exitCode = 1; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})();
