const inspectPrivateDesign = require('./lib/private-design-audit.cjs').createPrivateDesignAudit('support-operations');
/* Synthetic request/reply/provider-state UI fixtures; no actual email or payment is sent. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/support-workflow-pc');
const report = { checks: [], errors: [], runtime: 'Packaged app in installed Edge; labelled support/tracking/message/delivery/access API fixtures; no real client/provider/payment' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  const id = '30000000-0000-4000-8000-000000000001', staff = '30000000-0000-4000-8000-000000000002';
  const permissions = ['READ_CHANNELS', 'READ_SUPPORT', 'REPLY_SUPPORT', 'UPDATE_TRACKING'];
  const summary = { id, clientName: 'Synthetic client', clientEmail: 'client@example.invalid', intent: 'website', subject: 'Synthetic website request', state: 'IN_PROGRESS', progress: 40, nextStep: 'Review the draft', assignedMemberId: staff, notificationState: 'SENT', version: 3, createdAt: '2026-10-16T10:00:00Z', updatedAt: '2026-10-16T10:00:00Z' };
  const messages = [
    { id: 'saved-message', body: 'Saved client update', deliveryState: 'SAVED', deliveryStartedAt: null },
    { id: 'failed-message', body: 'Unconfirmed client update', deliveryState: 'FAILED', deliveryStartedAt: new Date(Date.now() - 30 * 60000).toISOString() },
    { id: 'stale-message', body: 'Interrupted client update', deliveryState: 'SENDING', deliveryStartedAt: new Date(Date.now() - 20 * 60000).toISOString() },
    { id: 'running-message', body: 'Running client update', deliveryState: 'SENDING', deliveryStartedAt: new Date().toISOString() },
  ].map(message => ({ ...message, author: 'Synthetic support', kind: 'CLIENT', portalVisible: false, createdAt: '2026-10-16T10:00:00Z' }));
  let holdOverview = false, releaseOverview, held;
  let trackingMode = 'CONFLICT', listDenied = false, portalOnly = false, sends = 0, shares = 0, messageSaves = 0, lastTracking;
  const requestPath = '/api/team/support/requests/' + id;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), endpoint = url.pathname, method = route.request().method();
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (endpoint === '/api/team/auth/session') return reply({ authenticated: true, member: { displayName: 'Synthetic support', role: 'SUPPORT' }, permissions });
    if (endpoint === '/api/team/workspace') return reply({ displayName: 'Synthetic support', memberId: staff, ownerId: null, permissions, channels: [], settings: { branding: { name: 'Synthetic QA workspace', tagline: '', version: 0 }, preferences: { compact: false, unreadBadges: false, mentionAlerts: false, version: 0 }, displayName: 'Synthetic support', editableName: true, channelPreferences: [] } });
    if (endpoint === '/api/team/unread') return reply([]);
    if (endpoint === '/api/team/mentions') return reply({ mentions: [], nextCursor: null });
    if (endpoint === '/api/admin/auth/csrf') return reply({ token: 'synthetic-browser-csrf', headerName: 'X-CSRF-TOKEN' });
    if (endpoint === '/api/team/support/requests/page') return listDenied ? reply({ message: 'Synthetic inbox access denied.' }, 403) : reply({ items: [summary], nextCursor: null });
    if (endpoint === '/api/team/support/assignees') return reply([{ id: staff, displayName: 'Synthetic support', role: 'SUPPORT' }]);
    if (endpoint === requestPath + '/overview') { const body = { request: summary, brief: { message: 'Private original enquiry' }, attachments: [], emailAvailable: !portalOnly, contactPreference: portalOnly ? 'PORTAL_ONLY' : 'PORTAL_AND_EMAIL', actorScope: 'TEAM:' + staff, permissions }; if (holdOverview) return new Promise(resolve => { releaseOverview = async () => { await reply(body); resolve(); }; held(); }); return reply(body); }
    if (endpoint === requestPath + '/updates') return reply({ items: url.searchParams.get('kind') === 'MESSAGES' ? messages : [], nextCursor: null });
    if (endpoint === requestPath + '/billing/page') return reply({ items: [], nextCursor: null, total: 0, unissued: 0 });
    if (endpoint === requestPath + '/billing/settings') return reply({ paymentsEnabled: false, managementEnabled: false, liveMode: false });
    if (endpoint === requestPath && method === 'PATCH') {
      lastTracking = route.request().postDataJSON();
      return trackingMode === 'DENIED' ? reply({ message: 'Synthetic tracking access denied.' }, 403) : reply({ message: 'Synthetic progress conflict: reload before saving.' }, 409);
    }
    if (endpoint === requestPath + '/messages' && method === 'POST') {
      messageSaves++; const input = route.request().postDataJSON(); const message = { ...messages[0], id: 'new-message', body: input.body, kind: input.kind }; messages.unshift(message); return reply(message);
    }
    if (endpoint.startsWith(requestPath + '/messages/') && method === 'POST') {
      const parts = endpoint.slice((requestPath + '/messages/').length).split('/'), message = messages.find(value => value.id === parts[0]);
      if (message && parts[1] === 'share') { shares++; message.portalVisible = true; return reply({ success: true }); }
      if (message && parts[1] === 'send') { sends++; message.deliveryState = 'SENT'; return reply(message); }
    }
    report.errors.push('Unexpected fixture endpoint: ' + method + ' ' + endpoint); return reply({ message: 'Unexpected synthetic endpoint' }, 400);
  });
  const detail = () => page.locator('.support-request-detail');
  const row = body => page.locator('.support-message-list > li').filter({ hasText: body });
  const saveProgress = () => page.getByRole('button', { name: 'Save progress', exact: true });
  try {
    await page.goto(base + '/team'); await page.getByRole('button', { name: 'Client requests', exact: true }).click();
    await page.getByRole('button', { name: /Synthetic client.*Synthetic website request/ }).click(); await detail().getByRole('heading', { name: summary.subject, exact: true }).waitFor();
    await row('Saved client update').waitFor();
    check('Opening a request never sends or shares messages', sends === 0 && shares === 0 && messageSaves === 0);
    check('Saved message separates email and portal states', (await row('Saved client update').innerText()).includes('Saved · not emailed') && (await row('Saved client update').innerText()).includes('Not shared to portal'));
    check('Unknown email result is not labelled as confirmed failure', (await row('Unconfirmed client update').innerText()).includes('Email outcome unknown'));
    check('Fresh email attempt cannot be retried', await row('Running client update').getByRole('button', { name: 'Retry email', exact: true }).count() === 0);
    check('Stale email attempt offers an explicit retry', await row('Interrupted client update').getByRole('button', { name: 'Retry email', exact: true }).isEnabled());
    check('No billing management controls for a support-only fixture', await page.getByRole('button', { name: /Create payment request/ }).count() === 0);
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: theme, exact: true }).click(); await page.keyboard.press('Escape');
      for (const width of [320, 390, 768, 1024, 1440, 1920]) { await page.setViewportSize({ width, height: 900 }); check(theme + ' ' + width + ' support workflow has no overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    }
    for (const width of [390, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.screenshot({ path: path.join(output, 'support-' + width + '.png'), fullPage: true }); await page.locator('.support-tracking').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, 'tracking-viewport-' + width + '.png') }); }
    await inspectPrivateDesign(page,'Request tracking and client delivery');
    const waiting = new Promise(resolve => { held = resolve; }); holdOverview = true; await page.getByRole('button', { name: 'Reload request', exact: true }).click(); await waiting;
    check('Reload blocks editing until the current overview and assignees arrive', await page.getByLabel('Next step for the client', { exact: true }).isDisabled() && await saveProgress().isDisabled());
    holdOverview = false; await releaseOverview(); await page.waitForFunction(() => !document.getElementById('support-next-step')?.disabled);
    await page.getByLabel('Next step for the client', { exact: true }).fill('Keep this progress draft'); await saveProgress().click(); await page.getByText('Synthetic progress conflict: reload before saving.', { exact: true }).waitFor();
    check('Progress conflict preserves text and original version', await page.getByLabel('Next step for the client', { exact: true }).inputValue() === 'Keep this progress draft' && lastTracking.expectedVersion === 3);
    await page.getByLabel('Message for the client', { exact: true }).fill('New saved portal update'); await page.getByRole('button', { name: 'Save client message', exact: true }).click();
    await page.getByText('Client message saved. Review it, then share it to the private portal or send an email if available.', { exact: true }).waitFor(); await row('New saved portal update').waitFor();
    check('Saving a reply never emails or shares it', messageSaves === 1 && sends === 0 && shares === 0);
    page.once('dialog', dialog => dialog.dismiss()); await row('New saved portal update').getByRole('button', { name: 'Share to client portal', exact: true }).click();
    check('Declining portal sharing makes no write', shares === 0);
    page.once('dialog', dialog => dialog.accept()); await row('New saved portal update').getByRole('button', { name: 'Share to client portal', exact: true }).click();
    await page.getByText('Message shared to the private client portal. No email was sent.', { exact: true }).waitFor();
    check('Portal sharing remains separate from email', shares === 1 && sends === 0);
    page.once('dialog', dialog => dialog.dismiss()); await row('Unconfirmed client update').getByRole('button', { name: 'Retry email', exact: true }).click();
    check('Uncertain email retry requires explicit confirmation', sends === 0);
    page.once('dialog', dialog => dialog.accept()); await row('Unconfirmed client update').getByRole('button', { name: 'Retry email', exact: true }).click();
    await page.getByText('The email provider accepted the client message. This does not confirm that it was read.', { exact: true }).waitFor();
    check('Accepted email is accurately labelled', sends === 1);
    portalOnly = true; page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Reload request', exact: true }).click();
    await page.getByText('This client wants portal-only support updates. Save the client message, then share it to their portal. Refresh to check their latest preference.', { exact: true }).waitFor();
    check('Portal-only preference blocks email but permits explicit sharing', await row('Saved client update').getByRole('button', { name: 'Send email to client', exact: true }).isDisabled() && await row('Saved client update').getByRole('button', { name: 'Share to client portal', exact: true }).isEnabled());
    await page.getByLabel('Message for the client', { exact: true }).fill('Clear this denied private draft'); await page.getByLabel('Next step for the client', { exact: true }).fill('Clear denied progress'); trackingMode = 'DENIED'; await saveProgress().click();
    await page.getByText('Synthetic tracking access denied.', { exact: true }).waitFor();
    check('Denied save removes private detail and editable input', await detail().count() === 0 && await page.getByLabel('Message for the client', { exact: true }).count() === 0 && !(await page.locator('.support-inbox').innerText()).includes('Private original enquiry'));
    await page.getByRole('button', { name: 'Try again', exact: true }).click(); await detail().waitFor();
    check('Denied request drafts cannot recover on reopening', await page.getByLabel('Message for the client', { exact: true }).inputValue() === '' && await page.getByLabel('Next step for the client', { exact: true }).inputValue() === summary.nextStep);
    listDenied = true; await page.getByRole('button', { name: 'Refresh inbox', exact: true }).click(); await page.getByText('Synthetic inbox access denied.', { exact: true }).waitFor();
    check('Denied inbox refresh removes cached client rows and details', await page.locator('.support-request-list > li').count() === 0 && await detail().count() === 0);
    check('No unexpected requests or browser errors', report.errors.length === 0);
  } catch (error) { report.failure = error.stack; throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  console.log('SUPPORT_WORKFLOW_BROWSER_PASS: ' + report.checks.length + ' checks');
})().catch(error => { console.error(error); process.exitCode = 1; });
