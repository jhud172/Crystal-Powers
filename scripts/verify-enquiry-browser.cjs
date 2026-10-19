/* Optional QA tooling: use an existing Playwright installation; installs nothing. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:5175';
const output = path.resolve('.codex-runtime/qa/enquiry-pc');
const report = { base, runtime: 'installed Edge/Chromium, emulated viewports', checks: [], layouts: [], errors: [] };
const contrast = (foreground, background) => { const light = colour => { const parts = colour.trim().replace('#', '').match(/.{2}/g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return .2126 * parts[0] + .7152 * parts[1] + .0722 * parts[2]; }; const a = light(foreground), b = light(background); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); };
const check = (name, value = true) => { assert.ok(value, name); report.checks.push(name); };

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CRYSTAL_BROWSER_EXECUTABLE ? { executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE } : { channel: 'msedge' }) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base + '/');
    for (const [label, intent] of [['Apps & digital products', 'app'], ['Bespoke systems', 'system'], ['Websites', 'website']]) {
      await page.getByRole('link').filter({ has: page.getByRole('heading', { name: label, exact: true }) }).click();
      check(`Home ${label} opens the matching service`, new URL(page.url()).searchParams.get('intent') === intent);
      await page.locator('.studio-header').getByRole('link', { name: 'Crystal Powers home', exact: true }).click();
    }
    await page.goto(base + '/services?intent=website');
    await page.getByRole('combobox', { name: 'Website starting point', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    check('Builder blocks empty starting point', await page.getByRole('alert').isVisible());
    await page.getByRole('combobox', { name: 'Website starting point', exact: true }).selectOption('Standard');
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Business card design £19.99', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Additional page £59.99', exact: true }).check();
    check('All additions remain available across four groups', await page.locator('.enquiry-addition-group').count() === 4 && await page.locator('.enquiry-additions input').count() === 11);
    await page.getByRole('checkbox', { name: 'Other Custom', exact: true }).check();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    check('Custom addition requires a description before continuing', await page.evaluate(() => document.activeElement.id) === 'otherAdditions');
    await page.getByRole('checkbox', { name: 'Other Custom', exact: true }).uncheck();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    await page.getByRole('combobox', { name: 'Aftercare', exact: true }).selectOption('Discuss aftercare');
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    check('Builder summary has selected additions', (await page.locator('.enquiry-review').innerText()).includes('2 selected'));
    await page.goBack();
    check('Back restores aftercare step and choice', await page.locator('#maintenanceSelection').inputValue() === 'Discuss aftercare');
    await page.goForward();
    await page.getByRole('link', { name: 'Add your details ↗', exact: true }).click();
    check('Services to Contact retains package', await page.locator('#packageSelection').inputValue() === 'Standard');
    check('Services to Contact retains aftercare', await page.locator('#maintenanceSelection').inputValue() === 'Discuss aftercare');
    check('Services to Contact retains both additions', await page.locator('.enquiry-additions input:checked').count() === 2);
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Synthetic browser QA');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(`synthetic-browser-${Date.now()}@example.invalid`);
    await page.getByRole('combobox', { name: 'Preferred contact point', exact: true }).selectOption('Email');
    await page.locator('#message').fill('Local browser acceptance only; no external email delivery.');
    await page.locator('.enquiry-attachments summary').click();
    const image = await fs.readFile(path.resolve('frontend/public/branding/favicon.png'));
    await page.locator('#referenceFiles').setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: image });
    check('Upload shows filename', await page.getByRole('button', { name: 'Remove reference.png', exact: true }).isVisible());
    await page.getByRole('button', { name: 'Remove reference.png', exact: true }).click();
    check('Individual upload removal works', await page.getByRole('button', { name: 'Remove reference.png', exact: true }).count() === 0);
    await page.locator('#referenceFiles').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('synthetic') });
    check('Invalid upload type lists the supported formats', (await page.locator('#referenceFiles-error').innerText()) === 'Choose JPEG, PNG, GIF, WebP, MP4, WebM or MOV files.');
    await page.locator('#referenceFiles').setInputFiles(Array.from({ length: 6 }, (_, index) => ({ name: `count-${index}.png`, mimeType: 'image/png', buffer: image })));
    check('Upload count limit is explained before submission', (await page.locator('#referenceFiles-error').innerText()).includes('five'));
    await page.locator('#referenceFiles').setInputFiles({ name: 'oversized.png', mimeType: 'image/png', buffer: Buffer.alloc(15 * 1024 * 1024 + 1) });
    check('Upload total size limit is explained before submission', (await page.locator('#referenceFiles-error').innerText()).includes('15 MB'));
    await page.locator('#referenceFiles').setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: image });
    await page.getByRole('link', { name: 'Explore services ↗', exact: true }).click();
    await page.getByRole('link', { name: 'Start a project', exact: true }).click();
    check('Internal edits retain personal details in memory', await page.locator('#firstName').inputValue() === 'Synthetic browser QA');
    check('Internal edits retain file objects', (await page.locator('.enquiry-attachments summary').innerText()).includes('1 selected'));
    await page.route('**/api/services', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Synthetic field rejection.', fieldErrors: { email: 'Check this email.' } }) }));
    await page.getByRole('button', { name: 'Review enquiry →', exact: true }).click();
    await page.getByRole('button', { name: 'Send enquiry ↗', exact: true }).click();
    await page.getByRole('link', { name: 'Email: Check this email.', exact: true }).waitFor();
    check('Server validation keeps inputs and uploads', await page.locator('#firstName').inputValue() === 'Synthetic browser QA' && (await page.locator('.enquiry-attachments summary').innerText()).includes('1 selected'));
    await page.getByRole('link', { name: 'Email: Check this email.', exact: true }).click();
    check('Error summary focuses associated field', await page.evaluate(() => document.activeElement.id) === 'email');
    await page.unroute('**/api/services');
    await page.route('**/api/services', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Synthetic transport outage.', fieldErrors: {} }) }));
    await page.getByRole('button', { name: 'Review enquiry →', exact: true }).click();
    await page.getByRole('button', { name: 'Send enquiry ↗', exact: true }).click();
    await page.getByText('Synthetic transport outage.', { exact: true }).waitFor();
    check('Service outage keeps inputs and a retry path', await page.locator('#firstName').inputValue() === 'Synthetic browser QA' && await page.getByRole('button', { name: 'Review enquiry →', exact: true }).isVisible());
    await page.unroute('**/api/services');
    await page.getByRole('button', { name: 'Review enquiry →', exact: true }).click();
    const delivered = page.waitForResponse(response => response.url().endsWith('/api/services') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Send enquiry ↗', exact: true }).click();
    const deliveryResponse=await delivered;
    const result = await deliveryResponse.json();
    report.localSubmission = result;
    check('Disabled mail truthfully reports a persisted enquiry with an unconfirmed notification', deliveryResponse.status()===503 && result.success === false && typeof result.requestId === 'string' && result.message.includes('saved for the team') && result.message.includes('could not be confirmed'));
    check('Notification failure preserves the brief and attachment', await page.locator('#firstName').inputValue() === 'Synthetic browser QA' && (await page.locator('.enquiry-attachments summary').innerText()).includes('1 selected'));
    await page.getByRole('button', { name: 'Review enquiry →', exact: true }).click();
    const retried = page.waitForResponse(response => response.url().endsWith('/api/services') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Send enquiry ↗', exact: true }).click();
    const retryResult = await (await retried).json();
    check('Actual notification retry reuses the persisted request rather than duplicating it', retryResult.requestId === result.requestId && retryResult.success === false);
    // Success presentation is a labelled browser fixture; this does not claim provider delivery.
    await page.route('**/api/services', route => route.fulfill({ json: { success: true, message: 'Synthetic browser success only.', requestId: result.requestId } }));
    await page.getByRole('button', { name: 'Review enquiry →', exact: true }).click();
    await page.getByRole('button', { name: 'Send enquiry ↗', exact: true }).click();
    await page.getByRole('heading', { name: 'A good beginning.', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Start another enquiry ↗', exact: true }).click();
    await page.unroute('**/api/services');
    check('Success clears personal details', await page.locator('#firstName').inputValue() === '');
    check('Success clears files', (await page.locator('.enquiry-attachments summary').innerText()).includes('0 selected'));
    await page.getByRole('button', { name: 'General question', exact: true }).click();
    check('General mode removes package fields', await page.locator('#packageSelection').count() === 0);
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Synthetic reset');
    await page.getByRole('button', { name: 'Clear this enquiry', exact: true }).click();
    await page.getByRole('button', { name: 'Keep my enquiry', exact: true }).click();
    check('Reset cancellation retains inputs', await page.locator('#firstName').inputValue() === 'Synthetic reset');
    await page.getByRole('button', { name: 'Clear this enquiry', exact: true }).click();
    await page.getByRole('button', { name: 'Clear everything', exact: true }).click();
    check('Confirmed reset clears inputs', await page.locator('#firstName').inputValue() === '');
    await page.getByRole('button', { name: 'Existing-client support', exact: true }).click();
    check('Support mode has issue fields and no package fields', await page.locator('#websiteAddress').count() === 1 && await page.locator('#packageSelection').count() === 0);
    await page.getByRole('combobox', { name: 'Preferred contact point', exact: true }).selectOption('WhatsApp');
    check('WhatsApp requires a phone number', await page.locator('#phoneNumber').getAttribute('required') !== null);
    await page.reload();
    check('Refresh deliberately clears private details', await page.locator('#firstName').inputValue() === '');
    await page.goto(base + '/services?intent=support');
    await page.locator('#packageSelection').waitFor();
    check('Services normalises non-service intents to a visible service choice', await page.getByRole('button', { name: 'Website', exact: true }).getAttribute('aria-pressed') === 'true');
    const themes = ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light'];
    for (const route of ['/services?intent=website', '/contact?intent=general', '/support']) {
      await page.goto(base + route);
      await page.locator('main h1').waitFor();
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
        const geometry = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, fieldTop: document.querySelector('#firstName')?.getBoundingClientRect().top + scrollY }));
        check(`${route} no horizontal overflow at ${width}`, geometry.documentWidth <= width);
        report.layouts.push({ route, ...geometry });
        if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, route.split('?')[0].slice(1) + '-' + width + '.png'), fullPage: true });
      }
      for (const theme of themes) {
        await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
        await page.getByRole('button', { name: theme, exact: true }).click();
        const geometry = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
        check(`${route} ${theme} fits`, geometry.documentWidth <= geometry.width);
        const tokens = await page.evaluate(() => { const style = getComputedStyle(document.querySelector('.studio-shell')); return Object.fromEntries(['bg','text','muted','accent','focus','error','control-line'].map(key => [key, style.getPropertyValue('--studio-' + key).trim()])); });
        for (const key of ['text', 'muted', 'accent', 'error']) check(`${route} ${theme} ${key} token contrast`, contrast(tokens[key], tokens.bg) >= 4.5);
        check(`${route} ${theme} focus/control contrast`, contrast(tokens.focus, tokens.bg) >= 3 && contrast(tokens['control-line'], tokens.bg) >= 3);
        if (route.startsWith('/contact')) {
          const renderedContrast = await page.locator('#firstName').evaluate(input => {
            const placeholder = getComputedStyle(input, '::placeholder'), field = getComputedStyle(input);
            // Resolve CSS Color 4 values (including colour-mix's color(srgb ...))
            // through the browser rather than interpreting unit-range channels as bytes.
            const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
            const rgb = value => {
              context.clearRect(0, 0, 1, 1);
              context.fillStyle = value;
              context.fillRect(0, 0, 1, 1);
              return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
            };
            const background = rgb(field.backgroundColor), alpha = Number(placeholder.opacity);
            const foreground = rgb(placeholder.color).map((value, index) => alpha * value + (1 - alpha) * background[index]);
            const luminance = colour => colour.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
            const a = luminance(foreground), b = luminance(background);
            return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
          });
          check(`${route} ${theme} rendered placeholder contrast`, renderedContrast >= 4.5);
        }
      }
    }
    await page.goto(base + '/services?intent=website&step=0.5');
    check('Fractional builder URLs resolve to a safe step', await page.getByRole('heading', { name: 'What does your website need?', exact: true }).isVisible());
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.id === 'packageSelection');
    check('Step validation restores keyboard focus', await page.evaluate(() => document.activeElement.id) === 'packageSelection');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    check('OS reduced motion removes enquiry animation', await page.evaluate(() => getComputedStyle(document.querySelector('.enquiry-builder > h2')).animationName) === 'none');
    await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Reduce effects', exact: true }).check();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    check('Reduce effects independently suppresses step animation', await page.evaluate(() => getComputedStyle(document.querySelector('.enquiry-builder > h2')).animationName) === 'none');
    check('Reduce effects is applied to shared shell', await page.locator('.studio-shell').getAttribute('data-reduced-effects') === 'true');
    check('No form page loads a WebGL canvas', await page.locator('canvas').count() === 0);
    check('No uncaught browser errors', report.errors.length === 0);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log('ENQUIRY_BROWSER_PASS:', report.checks.length, 'checks; evidence:', output);
  } catch (error) {
    report.failure = String(error);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
