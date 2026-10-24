/* UI rejection/transition fixtures; real owner/MFA/upload acceptance is verified separately. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8080';
assert.ok(/^http:\/\/127\.0\.0\.1:(8080|8083|8084|5175)$/.test(base), 'Use an isolated loopback runtime');
const report = { base, checks: [], errors: [], runtime: 'installed Edge; labelled UI fixtures, no live credentials or publication' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const output = path.resolve('.codex-runtime/qa/owner-pc');
const reply = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message));
  // Keep the initial sign-in and CSRF bootstrap as isolated as the later fixtures.
  await page.route('**/api/**', route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/admin/auth/session') return reply(route, { authenticated: false, mfaRequired: false, enrolmentRequired: false, setupAvailable: false });
    if (endpoint === '/api/admin/auth/csrf') return reply(route, { token: 'local-qa-csrf', headerName: 'X-CSRF-TOKEN' });
    return reply(route, { message: 'Local QA: no fixture for ' + endpoint }, 404);
  });
  try {
    await page.goto(base + '/admin'); await page.getByRole('heading', { name: 'Welcome back.', exact: true }).waitFor();
    check('Focused shell removes marketing navigation and retains the public-site link', await page.locator('.owner-shell').count() === 1 && await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).count() === 0 && await page.getByRole('link', { name: 'Public site', exact: true }).count() === 1);
    check('Owner page has one noindex robots element', await page.locator('meta[name="robots"]').count() === 1 && (await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      check(`Sign-in ${width}px fits without overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check(`Sign-in ${width}px retains usable password and actions`, await page.getByLabel('Password', { exact: true }).isVisible() && await page.getByRole('button', { name: 'Sign in ↗', exact: true }).isVisible());
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const appearance of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: appearance, exact: true }).click();
      check(`${appearance} owner layout fits`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, `signin-${appearance.replaceAll(' ', '-')}.png`) });
    }
    await page.getByLabel('Password', { exact: true }).fill('synthetic-ui-password');
    await page.getByRole('button', { name: 'Show password', exact: true }).focus(); await page.keyboard.press('Enter');
    check('Keyboard shows password without changing value', await page.getByLabel('Password', { exact: true }).getAttribute('type') === 'text' && await page.getByRole('button', { name: 'Hide password', exact: true }).getAttribute('aria-pressed') === 'true');
    await page.getByRole('button', { name: 'Hide password', exact: true }).click();
    check('Password visibility returns to concealed state', await page.getByLabel('Password', { exact: true }).getAttribute('type') === 'password');
    await page.getByLabel('Email address', { exact: true }).fill('ui-fixture@example.invalid');
    let rejectLogin, loginReady; const loginIntercepted = new Promise(resolve => { loginReady = resolve; });
    await page.route('**/api/admin/auth/login', route => new Promise(resolve => { rejectLogin = async () => { await reply(route, { message: 'Email or password was not recognised.' }, 401); resolve(); }; loginReady(); }));
    await page.getByRole('button', { name: 'Sign in ↗', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('form[aria-busy="true"]'));
    check('Sign-in freezes fields, visibility and recovery navigation while waiting', await page.getByLabel('Password', { exact: true }).isDisabled() && await page.getByRole('button', { name: 'Show password', exact: true }).isDisabled() && await page.getByRole('button', { name: 'Forgotten your password?', exact: true }).isDisabled());
    await loginIntercepted; await rejectLogin(); await page.getByRole('alert').waitFor();
    check('Sign-in rejection receives focus and retains inputs', await page.getByRole('alert').evaluate(e => e === document.activeElement) && await page.getByLabel('Password', { exact: true }).inputValue() === 'synthetic-ui-password');
    await page.unroute('**/api/admin/auth/login');
    await page.getByRole('button', { name: 'Forgotten your password?', exact: true }).click();
    await page.getByLabel('Owner email address', { exact: true }).fill('ui-fixture@example.invalid');
    await page.route('**/api/admin/auth/recovery/request', route => reply(route, { message: 'If this address belongs to the owner account, a reset link will be sent. Check your inbox and spam folder.' }));
    await page.getByRole('button', { name: 'Send reset link ↗', exact: true }).click(); await page.getByRole('status').waitFor();
    check('Recovery request preserves generic account messaging', (await page.getByRole('status').innerText()).startsWith('If this address belongs'));
    await page.getByRole('button', { name: 'Return to sign-in', exact: true }).click();
    await page.getByRole('heading', { name: 'Welcome back.', exact: true }).waitFor();
    check('Recovery return does not restore the previous password', await page.getByLabel('Password', { exact: true }).inputValue() === '');
    await page.goto(base + '/admin/reset/#synthetic-ui-reset-link'); await page.getByLabel('New password', { exact: true }).waitFor();
    check('Reset token is removed from the address bar including trailing-slash route', new URL(page.url()).hash === '' && new URL(page.url()).pathname === '/admin/reset');
    let resetCalls = 0;
    await page.route('**/api/admin/auth/recovery/reset', route => { resetCalls++; return reply(route, { message: 'This reset link has expired. Request a new link.' }, 400); });
    await page.getByLabel('New password', { exact: true }).fill('synthetic-ui-next-password'); await page.getByLabel('Confirm new password', { exact: true }).fill('different-ui-password'); await page.getByLabel('Authenticator or recovery code', { exact: true }).fill('ABCD-EFGH-IJKL');
    await page.getByRole('button', { name: 'Reset password ↗', exact: true }).click();
    check('Mismatched password confirmation blocks reset without a request', resetCalls === 0 && await page.getByLabel('Confirm new password', { exact: true }).evaluate(e => !e.validity.valid));
    await page.getByLabel('New password', { exact: true }).fill('😀'.repeat(20)); await page.getByLabel('Confirm new password', { exact: true }).fill('😀'.repeat(20)); await page.getByRole('button', { name: 'Reset password ↗', exact: true }).click();
    check('UTF-8 byte limit blocks multi-byte overlong passwords before sending', resetCalls === 0 && await page.getByLabel('New password', { exact: true }).evaluate(e => !e.validity.valid));
    await page.getByLabel('New password', { exact: true }).fill('synthetic-ui-next-password'); await page.getByLabel('Confirm new password', { exact: true }).fill('synthetic-ui-next-password'); await page.getByRole('button', { name: 'Reset password ↗', exact: true }).click();
    await page.getByRole('heading', { name: 'This link can’t be used.', exact: true }).waitFor();
    check('Expired reset is a distinct focused state with no stale credential form', resetCalls === 1 && await page.getByRole('heading', { name: 'This link can’t be used.', exact: true }).evaluate(e => e === document.activeElement) && await page.locator('form').count() === 0 && await page.getByRole('button', { name: 'Request a fresh link', exact: true }).isVisible());
    await page.unroute('**/api/admin/auth/recovery/reset');
    await page.goto(base + '/admin/reset#synthetic-ui-next-reset-link'); await page.getByLabel('New password', { exact: true }).fill('synthetic-ui-next-password'); await page.getByLabel('Confirm new password', { exact: true }).fill('synthetic-ui-next-password'); await page.getByLabel('Authenticator or recovery code', { exact: true }).fill('ABCD-EFGH-IJKL');
    let resetPayloadValid = false;
    await page.route('**/api/admin/auth/recovery/reset', route => { const v = route.request().postDataJSON(); resetPayloadValid = Object.keys(v).sort().join(',') === 'code,password,token'; return reply(route, { message: 'Password changed. Sign in again with your new password and authenticator.' }); });
    await page.getByRole('button', { name: 'Reset password ↗', exact: true }).click(); await page.getByRole('status').waitFor();
    check('Reset completion removes the form and sends only the existing API fields', resetPayloadValid && await page.locator('form').count() === 0 && new URL(page.url()).hash === '');
    // Authenticated UI fixture proves client transitions only. No real security changes occur here.
    let fixtureAuthenticated = true;
    await page.route('**/api/admin/auth/session', route => reply(route, { authenticated: fixtureAuthenticated, email: 'ui-fixture@example.invalid', mfaRequired: false, enrolmentRequired: false, setupAvailable: false }));
    await page.route('**/api/admin/projects', route => reply(route, []));
    await page.goto(base + '/admin'); await page.getByRole('button', { name: 'Account security', exact: true }).click();
    await page.getByLabel('Current password', { exact: true }).fill('synthetic-ui-password'); await page.getByLabel('Authenticator or recovery code', { exact: true }).fill('ABCD-EFGH-IJKL');
    await page.getByLabel('New password', { exact: true }).fill('synthetic-ui-next-password'); await page.getByLabel('Confirm new password', { exact: true }).fill('synthetic-ui-next-password');
    let releaseSecurity, securityReady, payloadValid = false; const securityIntercepted = new Promise(resolve => { securityReady = resolve; });
    await page.route('**/api/admin/account/password', route => new Promise(resolve => { payloadValid = Object.keys(route.request().postDataJSON()).sort().join(',') === 'code,nextPassword,password'; releaseSecurity = async () => { await reply(route, { message: 'Use a fresh authenticator or unused recovery code.' }, 400); resolve(); }; securityReady(); }));
    await page.getByRole('button', { name: 'Change password ↗', exact: true }).click(); await page.waitForFunction(() => document.querySelector('form[aria-busy="true"]'));
    check('Security request freezes mode switching and return navigation', await page.getByRole('button', { name: 'Authenticator', exact: true }).isDisabled() && await page.getByRole('button', { name: '← All projects', exact: true }).isDisabled());
    await securityIntercepted; await releaseSecurity(); await page.getByRole('alert').waitFor();
    check('Security failure retains inputs, focuses error and excludes confirmation from API', payloadValid && await page.getByRole('alert').evaluate(e => e === document.activeElement) && await page.getByLabel('New password', { exact: true }).inputValue() === 'synthetic-ui-next-password');
    await page.getByRole('button', { name: 'Recovery codes', exact: true }).click();
    check('Changing security action removes previous passwords', await page.getByLabel('Current password', { exact: true }).inputValue() === '');
    await page.getByLabel('Current password', { exact: true }).fill('synthetic-ui-password'); await page.getByLabel('Authenticator or recovery code', { exact: true }).fill('ABCD-EFGH-IJKL');
    await page.route('**/api/admin/account/recovery-codes', route => reply(route, { recoveryCodes: ['SYNTHETIC-UI-ONE', 'SYNTHETIC-UI-TWO'] }));
    await page.getByRole('button', { name: 'Replace recovery codes ↗', exact: true }).click(); await page.getByRole('heading', { name: 'Recovery codes replaced.', exact: true }).waitFor();
    check('Replacement-code acknowledgement guards both sign-in exits', await page.getByRole('button', { name: '← Sign in', exact: true }).isDisabled() && await page.getByRole('button', { name: 'Sign in again ↗', exact: true }).isDisabled());
    check('Security completion removes topbar actions and password fields', await page.getByRole('button', { name: 'Sign out', exact: true }).count() === 0 && await page.locator('input[type=password]').count() === 0);
    const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download recovery codes', exact: true }).click(); const file = await download;
    check('Codes download has the expected private text filename', file.suggestedFilename() === 'crystal-powers-recovery-codes.txt'); await file.delete();
    await page.getByRole('checkbox', { name: 'I’ve saved my new recovery codes privately.', exact: true }).check();
    check('Acknowledgement enables both guarded exits', await page.getByRole('button', { name: '← Sign in', exact: true }).isEnabled() && await page.getByRole('button', { name: 'Sign in again ↗', exact: true }).isEnabled());
    await page.goto(base + '/admin', { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    let finishLogout, logoutReady; const logoutIntercepted = new Promise(resolve => { logoutReady = resolve; });
    await page.route('**/api/admin/auth/logout', route => new Promise(resolve => { finishLogout = async () => { fixtureAuthenticated = false; await reply(route, { message: 'Signed out.' }); resolve(); }; logoutReady(); }));
    await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await logoutIntercepted;
    check('Sign-out freezes competing workspace actions until confirmed', await page.getByRole('button', { name: 'Sign out', exact: true }).isDisabled() && await page.getByRole('button', { name: 'New project +', exact: true }).isDisabled());
    await finishLogout(); await page.getByRole('heading', { name: 'Welcome back.', exact: true }).waitFor();
    check('Confirmed sign-out clears private workspace state and credential fields', await page.locator('.admin-project-row, .admin-account-settings, .admin-recovery-codes').count() === 0 && await page.getByLabel('Password', { exact: true }).inputValue() === '');
    check('Owner UI does not create a WebGL canvas', await page.locator('canvas').count() === 0);
    check('No uncaught owner browser errors', report.errors.length === 0);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log('OWNER_BROWSER_PASS:', report.checks.length, 'checks; evidence:', output);
  } catch (error) { report.failure = String(error); await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); throw error; }
  finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
