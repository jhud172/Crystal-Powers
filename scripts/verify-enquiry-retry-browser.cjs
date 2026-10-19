/* Synthetic enquiry transports only: no real enquiry, file storage, provider or email mutation. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = 'http://127.0.0.1:8084', output = path.resolve('.codex-runtime/qa/enquiry-retry-pc');
const report = { checks: [], errors: [], scope: 'Packaged app, installed Edge; synthetic uncertain intake responses and real internal navigation/File objects' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  const writes = [];
  await page.route('**/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (endpoint === '/api/site/privacy/status') return reply({ ready: false });
    if (['/api/contact', '/api/services'].includes(endpoint) && route.request().method() === 'POST') {
      writes.push({ endpoint, key: route.request().headers()['idempotency-key'] });
      return reply({ success: false, message: 'Synthetic uncertain enquiry outcome.', requestId: '25000000-0000-4000-8000-000000000001', fieldErrors: {} }, 503);
    }
    report.errors.push('Unexpected fixture endpoint: ' + route.request().method() + ' ' + endpoint);
    return reply({ message: 'Unexpected synthetic endpoint.' }, 400);
  });
  async function fill(message = 'Synthetic retry enquiry: unchanged intent retained in this visit.') {
    await page.locator('#firstName').fill('Synthetic retry browser');
    await page.locator('#email').fill('synthetic-enquiry-retry@example.invalid');
    await page.locator('#preferredContactPoint').selectOption('Email');
    await page.locator('#message').fill(message);
  }
  async function submit() {
    const before = writes.length;
    await page.getByRole('button', { name: 'Review enquiry →', exact: true }).click();
    await page.getByRole('button', { name: 'Send enquiry ↗', exact: true }).click();
    await page.getByText('Synthetic uncertain enquiry outcome.', { exact: true }).waitFor();
    check('Exactly one transport attempt per reviewed submit ' + writes.length, writes.length === before + 1);
    return writes.at(-1);
  }
  async function viaServices() {
    await page.getByRole('link', { name: 'Explore services ↗', exact: true }).click();
    await page.getByRole('link', { name: 'Discuss your idea ↗', exact: true }).click();
    await page.locator('#firstName').waitFor();
  }
  async function file(bytes) {
    const summary = page.locator('.enquiry-attachments summary');
    if (!await page.locator('#referenceFiles').isVisible()) await summary.click();
    await page.locator('#referenceFiles').evaluate((input, values) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(values)], 'same-reference.png', { type: 'image/png', lastModified: 1700000000000 }));
      input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, Array.from(bytes));
    await page.getByRole('button', { name: 'Remove same-reference.png', exact: true }).waitFor();
  }
  try {
    await page.goto(base + '/contact?intent=app'); await fill();
    const first = await submit();
    check('Initial contact request uses the contact contract', first.endpoint === '/api/contact' && /^[a-f0-9-]{36}$/.test(first.key));
    check('Uncertain response preserves the saved reference', (await page.locator('.enquiry-request-reference').innerText()).includes('25000000-0000-4000-8000-000000000001'));
    await viaServices();
    check('New route carries services context', new URL(page.url()).searchParams.get('from') === 'services');
    check('Personal fields remain visit-only across form remount', await page.locator('#firstName').inputValue() === 'Synthetic retry browser');
    const retry = await submit();
    check('Unchanged remounted enquiry retains its key', retry.key === first.key);
    check('Unchanged cross-source retry retains its original endpoint', retry.endpoint === first.endpoint);
    await page.locator('#message').fill('Synthetic edited enquiry is a deliberate new submission intent.');
    const edited = await submit();
    check('Changed body gets a fresh submission key', edited.key !== retry.key);
    check('Changed intent uses the current route contract', edited.endpoint === '/api/services');
    const image = await fs.readFile(path.resolve('frontend/public/branding/favicon.png'));
    await file(image); const attached = await submit();
    check('Adding a file creates a new intent', attached.key !== edited.key);
    await viaServices();
    check('Actual File object survives internal navigation', (await page.locator('.enquiry-attachments summary').innerText()).includes('1 selected'));
    const retained = await submit();
    check('Unchanged retained File preserves its submission key', retained.key === attached.key);
    if(!await page.getByRole('button', { name: 'Remove same-reference.png', exact: true }).isVisible())await page.locator('.enquiry-attachments summary').click();
    await page.getByRole('button', { name: 'Remove same-reference.png', exact: true }).click();
    const changed = Buffer.from(image); changed[changed.length - 1] ^= 1;
    await file(changed); const replaced = await submit();
    check('Replacing bytes with identical filename/type/size/date creates a new key', replaced.key !== retained.key);
    await page.getByRole('button', { name: 'Clear this enquiry', exact: true }).click();
    await page.getByRole('button', { name: 'Clear everything', exact: true }).click();
    check('Explicit clear removes personal fields and files', await page.locator('#firstName').inputValue() === '' && (await page.locator('.enquiry-attachments summary').innerText()).includes('0 selected'));
    await page.locator('#intent').getByRole('button', { name: 'App', exact: true }).click(); await fill();
    const fresh = await submit();
    check('Explicit clear retires the previous retry identity', fresh.key !== first.key && fresh.key !== replaced.key);
    check('No enquiry data or retry keys are persisted in browser storage', await page.evaluate(keys => {
      const stored = JSON.stringify({ ...localStorage, ...sessionStorage });
      return !stored.includes('synthetic-enquiry-retry@example.invalid') && !stored.includes('Synthetic retry browser') && keys.every(key => !stored.includes(key));
    }, writes.map(write => write.key)));
    check('No unexpected API or uncaught browser errors', report.errors.length === 0);
  } catch (error) { report.failure = error.stack; throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  console.log('ENQUIRY_RETRY_BROWSER_PASS: ' + report.checks.length + ' checks');
})().catch(error => { console.error(error); process.exitCode = 1; });
