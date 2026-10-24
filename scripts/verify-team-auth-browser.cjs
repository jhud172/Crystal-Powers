/* Synthetic invitation/login/MFA transport fixtures; no real account or delivery. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084', output = path.resolve('.codex-runtime/qa/team-auth-pc');
assert.match(base, /^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const report = { checks: [], errors: [], scope: 'Packaged team entry, synthetic transport/link/MFA responses, no real credentials/accounts/provider' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  let mode = 'EXPIRED', activations = [], logins = 0, releaseLogin, loginStarted, logoutMode='FAIL', logouts=0;
  await page.route('**/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (endpoint === '/api/team/auth/session') return reply({ authenticated: false });
    if (endpoint === '/api/admin/auth/csrf') return reply({ token: 'synthetic-team-csrf', headerName: 'X-CSRF-TOKEN' });
    if (endpoint === '/api/team/auth/activate') { activations.push(route.request().postDataJSON()); return mode === 'EXPIRED' ? reply({ message: 'Synthetic invitation expired or replaced.' }, 400) : reply({ activated: true }); }
    if (endpoint === '/api/team/auth/login') { logins++; await new Promise(resolve => { releaseLogin = resolve; loginStarted(); }); return reply({ authenticated: false, mfaRequired: true, enrolmentRequired: true }); }
    if (endpoint === '/api/team/auth/enrolment') return reply({ secret: 'A'.repeat(32) });
    if (endpoint === '/api/team/auth/verify') return reply({ message: 'Synthetic authenticator code refused.' }, 401);
    if (endpoint === '/api/team/auth/logout') { logouts++; return logoutMode==='FAIL' ? reply({message:'Synthetic sign-in cancellation unconfirmed.'},503) : reply({success:true}); }
    report.errors.push(endpoint); return reply({ message: 'Unexpected synthetic endpoint' }, 400);
  });
  try {
    await page.goto(base + '/team/activate#token=synthetic-team-invitation-2026'); await page.getByLabel('Choose a password', { exact: true }).waitFor();
    check('Invitation fragment removed and route noindex', !new URL(page.url()).hash && (await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'));
    check('Recipient cannot choose elevated permissions', await page.getByRole('combobox').count() === 0 && await page.locator('input[name=role]').count() === 0);
    await page.getByLabel('Choose a password', { exact: true }).fill('Synthetic-activation-password-2026'); await page.getByLabel('Confirm password', { exact: true }).fill('Different-password-2026');
    await page.getByRole('button', { name: 'Activate account', exact: true }).click();
    check('Password mismatch is native invalid and sends nothing', activations.length === 0 && !await page.getByLabel('Confirm password', { exact: true }).evaluate(element => element.checkValidity()));
    await page.getByLabel('Confirm password', { exact: true }).fill('Synthetic-activation-password-2026'); await page.getByRole('button', { name: 'Activate account', exact: true }).click();
    await page.getByText('Synthetic invitation expired or replaced.', { exact: true }).waitFor();
    check('Expired response preserves private correction input without adding roles', await page.getByLabel('Choose a password', { exact: true }).inputValue() === 'Synthetic-activation-password-2026' && Object.keys(activations[0]).sort().join() === 'password,token');
    mode = 'OK'; await page.getByRole('button', { name: 'Activate account', exact: true }).click(); await page.getByRole('link', { name: 'Sign in and set up your authenticator', exact: true }).waitFor();
    check('Activation preserves its private token for a confirmed retry', activations.length === 2 && activations[0].token === activations[1].token);
    const session = page.waitForResponse(response => response.url().endsWith('/api/team/auth/session'));
    await page.getByRole('link', { name: 'Sign in and set up your authenticator', exact: true }).click(); await session;
    await page.waitForFunction(() => !!document.querySelector('input[name=email]') || [...document.querySelectorAll('[role=status]')].some(element => element.textContent.includes('Your password is set')));
    check('Activation continuation opens sign-in rather than repeating success', await page.getByLabel('Email', { exact: true }).count() === 1);
    await page.goBack(); await page.getByText('This invitation is missing. Ask your admin for a new private invitation.', { exact: true }).waitFor();
    check('Back cannot restore the consumed private token or password form', await page.getByLabel('Choose a password', { exact: true }).count() === 0 && !new URL(page.url()).hash);
    await page.goForward(); await page.getByLabel('Email', { exact: true }).waitFor();
    check('Forward returns to a clean sign-in form', await page.getByLabel('Email', { exact: true }).inputValue() === '' && await page.getByLabel('Password', { exact: true }).inputValue() === '');
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: theme, exact: true }).click(); await page.keyboard.press('Escape');
      for (const width of [320, 390, 768, 1024, 1440, 1920]) { await page.setViewportSize({ width, height: 1000 }); check(theme + ' ' + width + ' team entry has no overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    }
    await page.getByLabel('Email', { exact: true }).fill('synthetic-team@example.invalid'); await page.getByLabel('Password', { exact: true }).fill('Synthetic-login-password-2026');
    let guarded = false;
    const declinedNavigation=page.waitForEvent('dialog',{timeout:5000}).then(async dialog=>{guarded=dialog.type()==='confirm';await dialog.dismiss();});
    await page.getByRole('link', { name: /Public site/ }).click(); await declinedNavigation;
    check('Unsaved sign-in decline preserves fields and route', guarded && new URL(page.url()).pathname === '/team' && await page.getByLabel('Email', { exact: true }).inputValue() === 'synthetic-team@example.invalid');
    const started = new Promise(resolve => { loginStarted = resolve; }); await page.locator('.admin-form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); }); await started;
    check('Pending login freezes fields and visibility controls with one submission', logins === 1 && await page.getByLabel('Email', { exact: true }).isDisabled() && await page.getByLabel('Password', { exact: true }).isDisabled() && await page.getByRole('button', { name: 'Show password', exact: true }).isDisabled());
    releaseLogin(); await page.getByLabel('Authenticator code', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Copy authenticator setup key', exact: true }).waitFor();
    check('MFA step removes login passwords and shows only synthetic setup', await page.locator('input[name=password]').count() === 0 && await page.locator('.admin-enrolment code').count() === 1);
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: theme, exact: true }).click(); await page.keyboard.press('Escape');
      for (const width of [320, 390, 768, 1024, 1440, 1920]) { await page.setViewportSize({ width, height: 1000 }); check(theme + ' ' + width + ' authenticator step has no overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    }
    await page.getByLabel('Authenticator code', { exact: true }).fill('123 456'); await page.getByRole('button', { name: 'Open workspace', exact: true }).click(); await page.getByText('Synthetic authenticator code refused.', { exact: true }).waitFor();
    check('Refused MFA stays on the code step and keeps normalised input', await page.getByLabel('Authenticator code', { exact: true }).inputValue() === '123456');
    const cancel=page.getByRole('button',{name:'Cancel this sign-in',exact:true});
    await cancel.focus();
    check('MFA cancellation is keyboard reachable with a usable target',await cancel.evaluate(element=>document.activeElement===element && element.getBoundingClientRect().height>=44));
    await cancel.click(); await page.getByText('Synthetic sign-in cancellation unconfirmed.',{exact:true}).waitFor();
    check('Unconfirmed cancellation preserves the MFA correction and setup without false success',await page.getByLabel('Authenticator code',{exact:true}).inputValue()==='123456' && await page.locator('.admin-enrolment code').count()===1 && await page.getByText('Sign-in attempt cancelled. Enter your email and password to start again.',{exact:true}).count()===0);
    logoutMode='OK'; await cancel.click(); await page.getByLabel('Email',{exact:true}).waitFor();
    check('Confirmed cancellation returns to clean password sign-in',await page.getByLabel('Email',{exact:true}).inputValue()==='' && await page.getByLabel('Password',{exact:true}).inputValue()==='');
    check('Confirmed cancellation removes the private setup and code',await page.locator('.admin-enrolment code').count()===0 && await page.getByLabel('Authenticator code',{exact:true}).count()===0);
    check('Cancellation is confirmed once per explicit attempt',logouts===2 && await page.getByText('Sign-in attempt cancelled. Enter your email and password to start again.',{exact:true}).count()===1);
    check('Synthetic passwords, setup key and token never enter local/session storage', !await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => /Synthetic-login-password|Synthetic-activation-password|AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA|synthetic-team-invitation/.test(value))));
    check('No unexpected endpoints or browser errors', report.errors.length === 0);
    console.log('TEAM_AUTH_BROWSER_PASS:' + report.checks.length);
  } catch (failure) { report.failure = failure.stack; console.error(failure); process.exitCode = 1; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})();
