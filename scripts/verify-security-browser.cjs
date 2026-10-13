/* Real account changes in a fresh, disposable 8084 database with loopback-only SMTP.
   Credentials, keys, codes and email reset tokens remain in memory; never capture them. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = 'http://127.0.0.1:8084';
const output = path.resolve('.codex-runtime/qa/security-pc');
const mail = path.resolve('.codex-runtime/qa/v2-local-mail.eml');
const report = { base, checks: [], errors: [], runtime: 'packaged app, fresh disposable H2 owner, real session/CSRF/MFA, loopback SMTP' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
function totp(secret) {
  let bits = '';
  for (const letter of secret.toUpperCase()) bits += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(letter).toString(2).padStart(5, '0');
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = crypto.createHmac('sha1', Buffer.from(bits.match(/.{8}/g).map(value => parseInt(value, 2)))).update(counter).digest();
  return String((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  const email = 'synthetic-security-owner@example.invalid';
  const initialPassword = crypto.randomBytes(24).toString('hex');
  const nextPassword = crypto.randomBytes(24).toString('hex');
  const resetPassword = crypto.randomBytes(24).toString('hex');
  let password = initialPassword, codes;
  const button = name => page.getByRole('button', { name, exact: true });
  const field = name => page.getByLabel(name, { exact: true });
  async function post(client, url, data) {
    const csrf = await (await client.get(base + '/api/admin/auth/csrf')).json();
    return client.post(base + url, { headers: { [csrf.headerName]: csrf.token }, data });
  }
  async function login(client, chosenPassword, code) {
    const response = await post(client, '/api/admin/auth/login', { email, password: chosenPassword });
    if (response.status() !== 200) return response.status();
    return (await post(client, '/api/admin/auth/verify', { code })).status();
  }
  async function guiLogin(code) {
    await page.goto(base + '/admin'); await field('Email address').fill(email); await field('Password').fill(password); await button('Sign in ↗').click();
    await field('Authenticator or recovery code').fill(code); await button('Verify and continue ↗').click(); await button('Account security').waitFor();
  }
  async function openSecurity(action) { await button('Account security').click(); await button(action).click(); }
  async function proof(code, chosenPassword = password) { await field('Current password').fill(chosenPassword); await field('Authenticator or recovery code').fill(code); }
  async function captureCodes(heading) {
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    const result = await page.locator('.admin-recovery-codes code').allTextContents();
    check('A fresh complete set of ten distinct recovery codes is shown', result.length === 10 && new Set(result).size === 10 && result.every(code => /^[a-f0-9]{32}$/.test(code)));
    check('Both security completion exits require acknowledgement', await button('← Sign in').isDisabled() && await button('Sign in again ↗').isDisabled());
    const downloading = page.waitForEvent('download'); await button('Download recovery codes').click(); const download = await downloading;
    check('Private code download uses the intended filename', download.suggestedFilename() === 'crystal-powers-recovery-codes.txt'); await download.delete();
    await page.getByRole('checkbox', { name: 'I’ve saved my new recovery codes privately.', exact: true }).check();
    check('Acknowledgement enables the route back to sign-in', await button('← Sign in').isEnabled() && await button('Sign in again ↗').isEnabled());
    return result;
  }
  try {
    await page.goto(base + '/admin'); await button('First time here? Set up your owner account').click();
    await page.getByLabel('Owner setup token').fill('synthetic-browser-setup-only-000000000000'); await field('Email address').fill(email); await field('Password').fill(password); await field('Confirm password').fill(password); await button('Create owner account ↗').click();
    await page.locator('.admin-enrolment code').waitFor();
    const oldSecret = await page.locator('.admin-enrolment code').innerText();
    check('Enrolment code supports recovery-code letters and receives focus', await field('Authenticator or recovery code').getAttribute('inputmode') === 'text' && await field('Authenticator or recovery code').evaluate(e => e === document.activeElement));
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Synthetic denied clipboard'); } } }));
    await button('Copy authenticator setup key').click(); await page.getByText('The key couldn’t be copied. Select it above and copy it manually.', { exact: true }).waitFor();
    check('Denied clipboard retains the manual setup key without an external request', await page.locator('.admin-enrolment code').count() === 1);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.syntheticCopyMatches = value === document.querySelector('.admin-enrolment code').textContent; } } }));
    await button('Copy authenticator setup key').click(); await page.getByText('Setup key copied. Keep your clipboard private and clear it when you have finished.', { exact: true }).waitFor();
    check('User-triggered local copy receives exactly the displayed setup key', await page.evaluate(() => window.syntheticCopyMatches));
    await field('Authenticator or recovery code').fill('012 345');
    check('Grouped six-digit code preserves a leading zero', await field('Authenticator or recovery code').inputValue() === '012345');
    const grouped = totp(oldSecret); await field('Authenticator or recovery code').fill(grouped.slice(0, 3) + ' ' + grouped.slice(3));
    check('Actual grouped authenticator code normalises before submission', await field('Authenticator or recovery code').inputValue() === grouped);
    await button('Verify and continue ↗').click(); await page.getByRole('heading', { name: 'Keep these safe.', exact: true }).waitFor();
    codes = await page.locator('.admin-recovery-codes code').allTextContents(); check('Initial enrolment clears its secret and guards completion', await page.locator('.admin-enrolment').count() === 0 && await button('Open the studio ↗').isDisabled());
    const leave = page.waitForEvent('dialog'); const click = page.getByRole('link', { name: 'Public site', exact: true }).click(); const dialog = await leave; check('Public navigation warns before losing one-time codes', dialog.type() === 'confirm'); await dialog.dismiss(); await click;
    check('Cancelling exit preserves one-time codes', await page.locator('.admin-recovery-codes code').count() === 10);
    await page.getByRole('checkbox', { name: 'I’ve stored my recovery codes somewhere private.', exact: true }).check(); await button('Open the studio ↗').click(); await button('Account security').waitFor();
    const other = await browser.newContext(); check('A separate real owner session signs in using an unused recovery code', await login(other.request, password, codes[0]) === 200);
    await openSecurity('Password'); await proof(codes[1], 'synthetic-wrong-password'); await field('New password').fill(nextPassword); await field('Confirm new password').fill(nextPassword); await button('Change password ↗').click(); await page.getByRole('alert').waitFor();
    check('Wrong current password preserves correction form without treating it as session expiry', await field('New password').inputValue() === nextPassword && await page.getByRole('dialog').count() === 0 && await page.getByRole('alert').evaluate(e => e === document.activeElement));
    await field('Current password').fill(password); await button('Change password ↗').click(); await page.getByRole('heading', { name: 'Password updated.', exact: true }).waitFor(); password = nextPassword;
    check('Confirmed password change removes credential fields and focuses completion', await page.locator('input[type=password]').count() === 0 && await page.getByRole('heading', { name: 'Password updated.', exact: true }).evaluate(e => e === document.activeElement));
    check('Password change expires the second real session', (await other.request.get(base + '/api/admin/projects')).status() === 401);
    check('Old password is rejected', await login(other.request, initialPassword, codes[2]) === 401);
    await guiLogin(codes[2]); await openSecurity('Recovery codes'); await proof(codes[3]); await button('Replace recovery codes ↗').click();
    const previousCodes = codes; codes = await captureCodes('Recovery codes replaced.');
    check('All previous recovery codes are replaced', codes.every(code => !previousCodes.includes(code)));
    check('Old recovery code is rejected even with the new password', await login(other.request, password, previousCodes[4]) === 401);
    // Same pending sign-in survives wrong MFA; use a valid replacement without another password attempt.
    check('Replacement recovery code signs in', (await post(other.request, '/api/admin/auth/verify', { code: codes[0] })).status() === 200);
    await guiLogin(codes[1]); await openSecurity('Authenticator'); await proof(codes[2]); await button('Set up new authenticator ↗').click(); await field('New authenticator code').waitFor();
    const cancelledSecret = await page.locator('.admin-enrolment code').innerText();
    check('New authenticator input is six numeric digits and focused', await field('New authenticator code').getAttribute('inputmode') === 'numeric' && await field('New authenticator code').evaluate(e => e === document.activeElement));
    check('Pending setup does not expire another owner session', (await other.request.get(base + '/api/admin/projects')).status() === 200);
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); check('Authenticator setup fits at ' + width + 'px', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    await button('Cancel new authenticator setup').click(); await field('Current password').waitFor();
    check('Cancelled setup removes the key and returns focus to its labelled section', await page.locator('.admin-enrolment').count() === 0 && await page.getByRole('heading', { name: 'Move to a new authenticator.', exact: true }).evaluate(e => e === document.activeElement));
    check('Cancelled pending key cannot be confirmed through the real API', (await post(context.request, '/api/admin/account/authenticator/confirm', { code: totp(cancelledSecret) })).status() === 400);
    await proof(codes[3]); await button('Set up new authenticator ↗').click(); await field('New authenticator code').waitFor(); const newSecret = await page.locator('.admin-enrolment code').innerText();
    check('Restart creates a different private pending key', newSecret !== cancelledSecret && newSecret !== oldSecret);
    await field('New authenticator code').fill('ABCDEF'); await button('Confirm new authenticator ↗').click();
    check('Letters cannot submit the new six-digit authenticator confirmation', await field('New authenticator code').evaluate(e => !e.validity.valid));
    const confirmedStep = Math.floor(Date.now() / 30000);
    await field('New authenticator code').fill(totp(newSecret)); await button('Confirm new authenticator ↗').click(); const beforeDeviceCodes = codes; codes = await captureCodes('Authenticator updated.');
    check('Confirmed new authenticator expires the other session', (await other.request.get(base + '/api/admin/projects')).status() === 401);
    check('Authenticator move replaces recovery codes', codes.every(code => !beforeDeviceCodes.includes(code)));
    // Wait for a fresh step so the old-device rejection is not merely the replay guard.
    if (Math.floor(Date.now() / 30000) === confirmedStep) await new Promise(resolve => setTimeout(resolve, 30100 - Date.now() % 30000));
    check('Old authenticator is rejected after replacement', await login(other.request, password, totp(oldSecret)) === 401);
    check('A fresh new-authenticator code completes that pending sign-in', (await post(other.request, '/api/admin/auth/verify', { code: totp(newSecret) })).status() === 200);
    await guiLogin(codes[1]);
    await fs.rm(mail, { force: true });
    const recoveryContext = await browser.newContext(); const recoveryPage = await recoveryContext.newPage(); recoveryPage.on('pageerror', error => report.errors.push(error.message));
    await recoveryPage.goto(base + '/admin/reset'); await recoveryPage.getByLabel('Owner email address', { exact: true }).fill('unknown-security-owner@example.invalid'); await recoveryPage.getByRole('button', { name: 'Send reset link ↗', exact: true }).click(); await recoveryPage.getByRole('heading', { name: 'Check your inbox.', exact: true }).waitFor();
    const generic = await recoveryPage.getByRole('status').innerText();
    check('Unknown account receives generic request-sent state without an email', generic.startsWith('If this address belongs') && !(await fs.stat(mail).catch(() => null)));
    await recoveryPage.getByRole('button', { name: 'Use another email address', exact: true }).click(); await recoveryPage.getByLabel('Owner email address', { exact: true }).fill(email); await recoveryPage.getByRole('button', { name: 'Send reset link ↗', exact: true }).click(); await recoveryPage.getByRole('heading', { name: 'Check your inbox.', exact: true }).waitFor();
    check('Known owner receives the same generic response', await recoveryPage.getByRole('status').innerText() === generic);
    const rawMail = await fs.readFile(mail, 'utf8');
    const decoded = rawMail.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    const resetLink = decoded.match(/http:\/\/127\.0\.0\.1:8084\/admin\/reset#[a-f0-9]{64}/)?.[0];
    check('Real loopback SMTP delivers a single-use fragment link and accurate expiry instructions', !!resetLink && decoded.includes('15 minutes') && decoded.includes('unused recovery code'));
    await fs.rm(mail, { force: true });
    await recoveryPage.goto(resetLink); await recoveryPage.getByLabel('New password', { exact: true }).waitFor();
    check('Real reset token disappears from URL and rendered markup', new URL(recoveryPage.url()).hash === '' && !(await recoveryPage.content()).includes(resetLink.split('#')[1]));
    await recoveryPage.getByLabel('New password', { exact: true }).fill(resetPassword); await recoveryPage.getByLabel('Confirm new password', { exact: true }).fill(resetPassword); await recoveryPage.getByLabel('Authenticator or recovery code', { exact: true }).fill('synthetic-invalid-recovery-code'); await recoveryPage.getByRole('button', { name: 'Reset password ↗', exact: true }).click(); await recoveryPage.getByRole('alert').waitFor();
    check('Wrong recovery proof preserves valid token and entered password for correction', await recoveryPage.getByLabel('New password', { exact: true }).inputValue() === resetPassword && await recoveryPage.getByRole('alert').evaluate(e => e === document.activeElement));
    await recoveryPage.getByLabel('Authenticator or recovery code', { exact: true }).fill(codes[2].toUpperCase()); await recoveryPage.getByRole('button', { name: 'Reset password ↗', exact: true }).click(); await recoveryPage.getByRole('heading', { name: 'Password updated.', exact: true }).waitFor();
    check('Full real reset completes with an alphanumeric recovery code and clears form', await recoveryPage.locator('form').count() === 0 && await recoveryPage.getByRole('heading', { name: 'Password updated.', exact: true }).evaluate(e => e === document.activeElement));
    check('Password reset expires all other real sign-ins', (await context.request.get(base + '/api/admin/projects')).status() === 401 && (await other.request.get(base + '/api/admin/projects')).status() === 401);
    await recoveryPage.goto(resetLink); await recoveryPage.getByLabel('New password', { exact: true }).fill(resetPassword); await recoveryPage.getByLabel('Confirm new password', { exact: true }).fill(resetPassword); await recoveryPage.getByLabel('Authenticator or recovery code', { exact: true }).fill(codes[3]); await recoveryPage.getByRole('button', { name: 'Reset password ↗', exact: true }).click(); await recoveryPage.getByRole('heading', { name: 'This link can’t be used.', exact: true }).waitFor();
    check('Used real reset token reaches distinct invalid-link state without a stale form', await recoveryPage.locator('form').count() === 0 && await recoveryPage.getByRole('button', { name: 'Request a fresh link', exact: true }).isVisible());
    password = resetPassword; await guiLogin(codes[3]); check('New reset password reaches the actual owner dashboard', await button('New project +').isVisible());
    check('No browser errors in actual security/recovery journey', report.errors.length === 0);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log('SECURITY_BROWSER_PASS:', report.checks.length, 'checks; evidence:', output);
  } catch (error) {
    // Avoid serialising credential values, URLs containing reset tokens or screenshots.
    report.failure = error.name || 'Error'; await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); throw new Error('Security QA failed after ' + report.checks.length + ' completed checks; inspect the named checks without printing private state.');
  } finally { await fs.rm(mail, { force: true }); await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
