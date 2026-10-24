/* Explicit synthetic portal/session fixtures; server authority uses integration tests. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/client-recovery-pc');
const report = { checks: [], errors: [], scope: 'Packaged portal; synthetic account/revocation/recovery/outage fixtures, no real account, password, email, publication or payment' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  const account = '50000000-0000-4000-8000-000000000001', workspace = '50000000-0000-4000-8000-000000000002';
  const id = '50000000-0000-4000-8000-000000000003', file = '50000000-0000-4000-8000-000000000004';
  const project = { id, subject: 'Synthetic private website', state: 'IN_PROGRESS', progress: 35, nextStep: 'Review the next design', updatedAt: '2026-10-16T10:00:00Z' };
  let mode = 'OK', authenticated = true, currentAccount = account, writes = [], overviewRequested, releaseOverview;
  await page.route('**/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname, method = route.request().method();
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const identity = { authenticated, client: { id: currentAccount, workspaceId: workspace, displayName: 'Synthetic client' } };
    if (endpoint === '/api/client/auth/session') return reply(identity);
    if (endpoint === '/api/client/auth/login') { authenticated = true; return reply({ ...identity, authenticated: true }); }
    if (endpoint === '/api/admin/auth/csrf') return reply({ token: 'synthetic-client-csrf', headerName: 'X-CSRF-TOKEN' });
    if (endpoint === '/api/client/projects/page') return reply({ clientId: currentAccount, workspaceId: workspace, projects: mode === 'MISSING' || currentAccount !== account ? [] : [project], nextCursor: null, total: mode === 'MISSING' || currentAccount !== account ? 0 : 1 });
    if (endpoint === '/api/client/auth/preferences') return reply({ clientId: currentAccount, workspaceId: workspace, contactPreference: 'PORTAL_ONLY', version: 0 });
    if (endpoint === '/api/client/billing/page') { if (mode === 'BILLING_EXPIRED') { authenticated = false; return reply({ message: 'Synthetic billing session expired.' }, 401); } return reply({ accountId: currentAccount, workspaceId: workspace, paymentsEnabled: false, managementEnabled: false, liveMode: false, bills: [], nextCursor: null, total: 0 }); }
    if (endpoint === '/api/client/projects/' + id + '/overview') {
      if (['MISSING', 'FEED_MISSING'].includes(mode)) return reply({ message: 'Synthetic project access removed.' }, 404);
      if (mode === 'DELAY_OVERVIEW') await new Promise(resolve => { releaseOverview = resolve; overviewRequested(); });
      return reply({ clientId: currentAccount, workspaceId: workspace, project, files: [{ id: file, filename: 'private-reference.pdf', sizeBytes: 1400 }] });
    }
    if (endpoint === '/api/client/projects/' + id + '/conversation') {
      if (mode === 'EXPIRED') { authenticated = false; return reply({ message: 'Synthetic session expired.' }, 401); }
      if (['FEED_MISSING', 'CURSOR_MISSING'].includes(mode)) return reply({ message: 'Synthetic conversation cursor or access unavailable.' }, 404);
      return reply({ items: [{ id: file, direction: 'TEAM', author: 'Team', body: 'Synthetic private team update', createdAt: '2026-10-16T10:00:00Z' }], nextCursor: null });
    }
    if (endpoint === '/api/client/projects/' + id + '/messages' && method === 'POST') { writes.push(route.request().postDataJSON()); if (mode === 'SEND_MISSING') return reply({ message: 'Synthetic send access removed.' }, 404); return mode === 'SEND_OUTAGE' ? reply({ message: 'Synthetic unconfirmed send.' }, 503) : reply({ id: file }); }
    report.errors.push(method + ' ' + endpoint); return reply({ message: 'Unexpected synthetic endpoint' }, 400);
  });
  const choose = () => page.getByRole('button', { name: /Synthetic private website/ });
  const message = () => page.locator('.support-request-detail textarea');
  const open = async () => { await choose().click(); await message().waitFor(); await page.getByText('Synthetic private team update', { exact: true }).waitFor(); };
  const signIn = async () => { await page.getByRole('button', { name: 'Return to sign-in', exact: true }).click(); await page.getByLabel('Email', { exact: true }).fill('synthetic@example.invalid'); await page.getByLabel('Password', { exact: true }).fill('Synthetic-fixture-password-2026'); await page.getByRole('button', { name: 'Open my projects', exact: true }).click(); await page.getByRole('heading', { name: 'Your projects', exact: true }).waitFor(); };
  try {
    await page.goto(base + '/client'); await open();
    check('Client route is private noindex', (await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'));
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: theme, exact: true }).click(); await page.keyboard.press('Escape');
      check(theme + ' contact choices have aligned radios and full label targets', await page.locator('.client-contact-choices label').evaluateAll(labels => labels.length === 2 && labels.every(label => { const a = label.getBoundingClientRect(), b = label.querySelector('input').getBoundingClientRect(); return a.height >= 44 && b.width <= 24 && b.height <= 24 && Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) <= 1; })));
      for (const width of [320, 390, 768, 1024, 1440, 1920]) { await page.setViewportSize({ width, height: 1000 }); check(theme + ' ' + width + ' portal has no overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    }
    for (const width of [390, 1440]) { await page.setViewportSize({ width, height: 1000 }); await page.screenshot({ path: path.join(output, 'synthetic-client-' + width + '.png'), fullPage: true }); }
    await message().fill('Discard only this unavailable project draft'); mode = 'MISSING'; await page.getByRole('button', { name: 'Refresh updates', exact: true }).click(); await page.getByText('Synthetic project access removed.', { exact: true }).waitFor();
    check('Unavailable overview clears private detail, download links and composer', await message().count() === 0 && await page.getByRole('link', { name: 'Download private-reference.pdf', exact: true }).count() === 0 && await page.getByText('Synthetic private team update', { exact: true }).count() === 0);
    mode = 'OK'; await page.getByRole('button', { name: 'Refresh projects', exact: true }).click(); await open();
    check('Revoked project draft is not recovered', await message().inputValue() === '');
    await message().fill('Retain an unconfirmed client reply'); mode = 'SEND_OUTAGE'; await page.getByRole('button', { name: 'Send to the team', exact: true }).click(); await page.getByText('Synthetic unconfirmed send.', { exact: true }).waitFor();
    report.composerSnapshot = await message().ariaSnapshot();
    check('Entered reply retains its clear accessible textbox name', report.composerSnapshot.startsWith('- textbox "Your message":'));
    check('Unconfirmed reply preserves its text and submission key', await message().inputValue() === 'Retain an unconfirmed client reply' && !!writes[0].submissionKey);
    const overviewStarted = new Promise(resolve => { overviewRequested = resolve; });
    mode = 'DELAY_OVERVIEW'; await page.getByRole('button', { name: 'Refresh updates', exact: true }).click(); await overviewStarted;
    mode = 'BILLING_EXPIRED'; await page.getByRole('button', { name: 'Refresh payment requests', exact: true }).click(); await page.getByText('Your session has ended. Unsent project messages remain in this tab for recovery after sign-in.', { exact: true }).waitFor();
    releaseOverview();
    check('Expiry clears previously loaded private project data', await message().count() === 0 && await page.getByRole('link', { name: 'Download private-reference.pdf', exact: true }).count() === 0);
    check('Expiry also clears billing/password UI and ignores the cancelled overview', await page.locator('.client-billing').count() === 0 && await page.getByText('Change your password', { exact: true }).count() === 0);
    mode = 'OK'; await signIn(); await message().waitFor();
    check('Same-account recovery rechecks project access and restores only the draft', await message().inputValue() === 'Retain an unconfirmed client reply');
    await page.getByRole('button', { name: 'Send to the team', exact: true }).click(); await page.getByText('Your message is saved in the team inbox. This does not confirm it has been read.', { exact: true }).waitFor();
    check('Recovered retry keeps the original key/body and clears confirmed input', writes.length === 2 && writes[0].submissionKey === writes[1].submissionKey && writes[0].body === writes[1].body && await message().inputValue() === '');
    await message().fill('Keep this reply when only a cursor is missing'); mode = 'CURSOR_MISSING';
    const rechecked = page.waitForResponse(response => response.url().endsWith('/api/client/projects/' + id + '/overview') && response.status() === 200);
    await page.getByRole('region', { name: 'Conversation', exact: true }).getByRole('button', { name: 'Refresh this page', exact: true }).click();
    await page.getByText('Synthetic conversation cursor or access unavailable.', { exact: true }).waitFor();
    await rechecked;
    await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).find(element => element.textContent === 'Refresh updates')?.disabled);
    check('Missing feed cursor preserves draft when overview still authorises the project', await message().inputValue() === 'Keep this reply when only a cursor is missing' && await page.getByRole('link', { name: 'Download private-reference.pdf', exact: true }).isVisible());
    mode = 'FEED_MISSING'; await page.getByRole('region', { name: 'Conversation', exact: true }).getByRole('button', { name: 'Refresh this page', exact: true }).click();
    await page.getByText('This project is no longer available. Its retained message was discarded.', { exact: true }).waitFor();
    check('Unavailable conversation also removes the parent detail/files', await message().count() === 0 && await page.getByRole('link', { name: 'Download private-reference.pdf', exact: true }).count() === 0);
    check('Removed conversation keeps focus on project choices or the authoritative error', await page.locator('.client-workspace > .admin-error, .client-workspace aside h2').evaluateAll(elements => elements.some(element => element === document.activeElement)));
    mode = 'OK'; await page.getByRole('button', { name: 'Refresh projects', exact: true }).click(); await open(); await message().fill('Discard a reply refused by project scope');
    mode = 'SEND_MISSING'; await page.getByRole('button', { name: 'Send to the team', exact: true }).click(); await page.getByText('Synthetic send access removed.', { exact: true }).waitFor();
    check('Unavailable send also clears private detail and its refused draft', await message().count() === 0 && await page.getByRole('link', { name: 'Download private-reference.pdf', exact: true }).count() === 0);
    mode = 'OK'; await page.getByRole('button', { name: 'Refresh projects', exact: true }).click(); await open(); await message().fill('Never expose another client draft');
    mode = 'EXPIRED'; await page.getByRole('region', { name: 'Conversation', exact: true }).getByRole('button', { name: 'Refresh this page', exact: true }).click(); await page.getByText('Your session has ended. Unsent project messages remain in this tab for recovery after sign-in.', { exact: true }).waitFor();
    currentAccount = '50000000-0000-4000-8000-000000000005'; mode = 'OK'; await signIn();
    check('Different account clears retained project selection/drafts', await message().count() === 0 && await choose().count() === 0 && await page.getByText(/Unsent project messages remain in this tab/).count() === 0);
    check('Private replies never persist into local/session storage', !await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => /Retain an unconfirmed client reply|Never expose another client draft/.test(value))));
    check('No unexpected requests or uncaught browser errors', report.errors.length === 0);
    console.log('CLIENT_RECOVERY_BROWSER_PASS:' + report.checks.length);
  } catch (failure) { report.failure = failure.stack; report.lastText = (await page.locator('body').innerText()).slice(0, 7000); console.error(failure); process.exitCode = 1; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})();
