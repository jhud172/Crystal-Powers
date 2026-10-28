/* Synthetic local MFA enrolment only: independently decode rendered QR pixels. */
const {chromium} = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const jsQR = require('../frontend/node_modules/jsqr');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8083';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8080|8083|8084|5175)$/);
const secret = 'A'.repeat(32); // Deliberately public fixture, never a real account key.
const report = {checks: [], errors: [], externalRequests: [], scope: 'Synthetic owner/team MFA enrolment, independent QR pixel decoder; no real credentials, accounts or provider calls.'};
function check(name, value) {assert.ok(value, name); report.checks.push(name);}
(async () => {
  const output = '.codex-runtime/qa/mfa-qr'; await fs.mkdir(output, {recursive: true});
  const browser = await chromium.launch({headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE});
  const page = await browser.newPage(); let badKey = false;
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => {
    const address = new URL(request.url());
    if (address.origin !== base) report.externalRequests.push(address.origin);
    check('No setup secret or otpauth URI in a network request', !request.url().includes(secret) && !request.url().includes('otpauth'));
  });
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname.endsWith('/csrf') ? {token: 'synthetic-qr-csrf', headerName: 'X-CSRF-TOKEN'}
      : pathname.endsWith('/session') ? {authenticated: false, mfaRequired: true, enrolmentRequired: true, setupAvailable: false}
      : pathname.endsWith('/enrolment') ? {secret: badKey ? 'invalid-test-key' : secret}
      : {};
    return route.fulfill({json: body});
  });
  try {
    for (const route of ['/admin', '/team']) for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({width, height: 1000}); await page.goto(base + route);
      const svg = page.getByRole('img', {name: 'Scan this QR code with your authenticator app to add Crystal Powers', exact: true});
      await svg.waitFor(); check(route + ' ' + width + ' QR is visible', await svg.isVisible());
      const pixels = await svg.evaluate(async node => {
        const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(node)], {type: 'image/svg+xml'}));
        try {
          const image = new Image(); image.src = url; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 768;
          const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, 768, 768);
          return Array.from(context.getImageData(0, 0, 768, 768).data);
        } finally {URL.revokeObjectURL(url);}
      });
      const decoded = jsQR(new Uint8ClampedArray(pixels), 768, 768);
      check(route + ' ' + width + ' QR pixels independently decode', !!decoded);
      const uri = new URL(decoded.data);
      check('Decoded QR matches the exact secret and TOTP settings', uri.protocol === 'otpauth:' && uri.hostname === 'totp' && uri.searchParams.get('secret') === secret && uri.searchParams.get('issuer') === 'Crystal Powers' && uri.searchParams.get('algorithm') === 'SHA1' && uri.searchParams.get('digits') === '6' && uri.searchParams.get('period') === '30');
      check('Manual key and copy fallback remain available', await page.locator('.admin-enrolment code').textContent() === secret && await page.getByRole('button', {name: 'Copy authenticator setup key', exact: true}).isEnabled());
      check(route + ' ' + width + ' has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check('Setup secrets stay out of local/session storage', await page.evaluate(value => ![...Object.values(localStorage), ...Object.values(sessionStorage)].some(item => item.includes(value)), secret));
      await page.screenshot({path: `${output}/${route.slice(1)}-${width}.png`});
    }
    badKey = true; await page.goto(base + '/admin');
    await page.getByText('The QR code is unavailable. You can still add the account using the setup key below.', {exact: true}).waitFor();
    check('Invalid QR input retains a usable manual fallback', await page.getByRole('button', {name: 'Copy authenticator setup key', exact: true}).isEnabled());
    check('No third-party requests during private enrolment', report.externalRequests.length === 0);
    check('No browser runtime errors', report.errors.length === 0); report.passed = true;
  } catch (error) {report.failure = error.stack; throw error;}
  finally {await fs.writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); await browser.close();}
  console.log('MFA_QR_BROWSER_PASS:', report.checks.length);
})().catch(error => {console.error(error.message); process.exitCode = 1;});
