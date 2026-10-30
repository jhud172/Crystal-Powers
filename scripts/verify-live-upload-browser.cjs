/* Actual disposable sessions/API/ClamAV; cookie handoff stays in process memory. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
(async () => {
  let input = ''; for await (const chunk of process.stdin) input += chunk;
  const fixture = JSON.parse(input); input = '';
  assert.equal(fixture.base, 'http://127.0.0.1:18084');
  const values = [...fixture.ownerCookies, ...fixture.memberCookies].map(cookie => cookie.value);
  const scrub = value => values.reduce((text, secret) => text.split(secret).join('[redacted]'), String(value));
  const report = { checks: [], errors: [], scope: 'Actual synthetic loopback sessions and attachment UI; no API fixtures; actual ClamAV or explicitly stopped scanner; emulated viewport sizes, not physical-device acceptance.' };
  const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const contexts = [];
  const endpoint = `/api/team/channels/${fixture.channel}/messages/${fixture.message}/attachments`;
  async function open(cookies) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    contexts.push(context); await context.addCookies(cookies);
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', error => report.errors.push(scrub(error.message)));
    await page.goto(fixture.base + '/team', { waitUntil: 'domcontentloaded' });
    await page.getByRole('navigation', { name: 'Team channels' }).getByRole('button').filter({ hasText: 'scanner-acceptance' }).click();
    await page.locator('#message-attachments-' + fixture.message).click();
    await page.getByRole('heading', { name: 'Message attachments', exact: true }).waitFor();
    return page;
  }
  try {
    const owner = await open(fixture.ownerCookies), member = await open(fixture.memberCookies);
    const panel = owner.locator('.team-attachment-panel');
    const item = panel.locator('.team-attachment-item').filter({ has: owner.getByText(fixture.filename, { exact: true }) });
    await item.waitFor();
    await member.getByText('No attachments are visible to your account for this message.', { exact: true }).waitFor();
    check('Ordinary member UI hides quarantined attachment metadata', await member.getByText('No attachments are visible to your account for this message.', { exact: true }).isVisible() && await member.getByRole('link', { name: 'Download ' + fixture.filename, exact: true }).count() === 0);
    check('Approval stays unavailable before a clean scan', await item.getByRole('combobox', { name: /^Decision/ }).locator('option[value="APPROVED"]').evaluate(option => option.disabled));
    owner.once('dialog', dialog => dialog.accept());
    await item.getByRole('button', { name: 'Scan / retry scan', exact: true }).focus();
    await owner.keyboard.press('Enter');
    await panel.getByText('Scan status updated. Check the result before reviewing.', { exact: true }).waitFor();
    const scanned = (await (await owner.request.get(fixture.base + endpoint)).json()).files.find(file => file.id === fixture.id);
    check('Keyboard scan action persists the actual scanner outcome', scanned.scanState === (fixture.unavailable ? 'ERROR' : 'CLEAN') && scanned.reviewState === 'PENDING');
    check('Ordinary member download remains forbidden before human approval', (await member.request.get(fixture.base + endpoint + '/' + fixture.id + '/download')).status() === 403);
    if (fixture.unavailable) {
      check('Unavailable scanner UI cannot approve or offer reviewer download', await item.getByRole('combobox', { name: /^Decision/ }).locator('option[value="APPROVED"]').evaluate(option => option.disabled) && await item.getByRole('link').count() === 0);
    } else {
      await item.getByText(/clean scan · pending review/).waitFor();
      await item.getByRole('combobox', { name: /^Decision/ }).selectOption('APPROVED');
      await item.getByLabel('Review note', { exact: true }).fill('Synthetic actual browser acceptance only.');
      await item.getByRole('button', { name: 'Save review', exact: true }).focus();
      await owner.keyboard.press('Enter');
      await panel.getByText('Review saved. Approval does not publish this file outside the channel.', { exact: true }).waitFor();
      const approved = (await (await owner.request.get(fixture.base + endpoint)).json()).files.find(file => file.id === fixture.id);
      check('Explicit keyboard review persists a separate human approval', approved.scanState === 'CLEAN' && approved.reviewState === 'APPROVED');
      await member.getByRole('button', { name: 'Refresh attachment status', exact: true }).click();
      const downloadLink = member.getByRole('link', { name: 'Download ' + fixture.filename, exact: true });
      await downloadLink.waitFor();
      const pendingDownload = member.waitForEvent('download'); await downloadLink.click();
      const download = await pendingDownload;
      assert.equal(await download.failure(), null);
      const digest = crypto.createHash('sha256').update(await fs.readFile(await download.path())).digest('hex');
      check('Actual member browser downloads exactly the approved bytes and filename', digest === fixture.digest && download.suggestedFilename() === fixture.filename);
    }
    for (const [name, page] of [['reviewer', owner], ['member', member]]) {
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        check(`${name} attachment controls fit ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll('.team-attachment-panel button,.team-attachment-panel input,.team-attachment-panel select,.team-attachment-panel textarea')].every(element => { const r = element.getBoundingClientRect(); return !r.width || (r.left >= -1 && r.right <= innerWidth + 1); })));
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.team-attachment-panel').screenshot({ path: path.join(fixture.output, 'actual-upload-' + name + '-mobile.png') });
      await page.getByRole('button', { name: 'Close attachments', exact: true }).focus(); await page.keyboard.press('Enter');
      check(name + ' closing attachments restores keyboard focus', await page.locator('#message-attachments-' + fixture.message).evaluate(element => element === document.activeElement));
      check(name + ' reduced-motion private workflow remains canvas-free', await page.locator('canvas').count() === 0);
    }
    check('No uncaught browser errors during actual upload review', report.errors.length === 0);
    report.passed = true;
  } catch (error) {
    report.failure = scrub(error.message); console.error(report.failure); process.exitCode = 1;
    report.diagnostics = [];
    for (const [index, context] of contexts.entries()) {
      const page = context.pages()[0]; if (!page) continue;
      report.diagnostics.push({ index, selectLabels: await page.locator('.team-attachment-panel select').evaluateAll(elements => elements.map(element => [...element.labels].map(label => label.textContent).join(' '))).catch(() => []) });
      await page.screenshot({ path: path.join(fixture.output, 'actual-upload-failure-' + index + '.png') }).catch(() => {});
    }
  }
  finally { for (const context of contexts) await context.close(); await browser.close(); await fs.writeFile(path.join(fixture.output, 'actual-upload-browser-report.json'), JSON.stringify(report, null, 2)); }
  console.log('ACTUAL_UPLOAD_BROWSER_' + (report.passed ? 'PASS' : 'FAIL') + ': ' + report.checks.length + ' checks');
})().catch(() => { console.error('Actual upload browser could not initialise; no session values logged.'); process.exitCode = 1; });
