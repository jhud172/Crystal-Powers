/* Shared D1 controls: real route elements, no enquiry/account/provider writes. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8080';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8080|8084)$/);
const output = path.resolve('.codex-runtime/qa/liquid-controls-d1');
const report = { base, checks: [], errors: [], scope: 'Installed Edge; real route controls; emulated layouts, reduced motion and forced colours. No physical device or full design acceptance.' };
function check(name, value) { assert.ok(value, name); report.checks.push(name); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => report.errors.push(error.message));
  // Use the running synthetic local backend for GETs only; prohibit every write.
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') throw new Error('Unexpected API write');
    const url = new URL(route.request().url());
    const response = await page.request.get('http://127.0.0.1:8084' + url.pathname + url.search);
    await route.fulfill({ response });
  });
  try {
    await page.goto(base + '/contact');
    const name = page.locator('#firstName');
    await name.waitFor();
    check('Text field shares Liquid Light geometry', await name.evaluate(el => getComputedStyle(el).borderRadius === '12px'));
    await name.focus();
    check('Keyboard field focus has a visible outline', await name.evaluate(el => getComputedStyle(el).outlineStyle === 'solid'));
    await name.fill('Synthetic local preview');
    check('Styled field retains native editing', await name.inputValue() === 'Synthetic local preview');
    const select = page.locator('#preferredContactPoint');
    check('Contact dropdown retains native select semantics', await select.evaluate(el => el.tagName === 'SELECT' && getComputedStyle(el).borderRadius === '12px'));
    const options = await select.locator('option').evaluateAll(items => items.map(item => item.value).filter(Boolean));
    await select.selectOption(options[0]);
    check('Native dropdown remains selectable', await select.inputValue() === options[0]);
    const addition = page.locator('.enquiry-additions input[type="checkbox"]').first();
    await addition.focus(); await page.keyboard.press('Space');
    check('Styled checkbox toggles with Space', await addition.isChecked());
    check('Checked control renders the custom tick', await addition.evaluate(el => getComputedStyle(el, '::before').transform === 'matrix(1, 0, 0, 1, 0, 0)'));
    await page.keyboard.press('Space');
    check('Styled checkbox deselects without losing focus', !await addition.isChecked() && await addition.evaluate(el => el === document.activeElement));
    for (const theme of ['futuristic', 'clean', 'classic', 'fresh', 'summer-vibes']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      const label = { futuristic: 'Dark', clean: 'Light', classic: 'Warm dark', fresh: 'Fresh light', 'summer-vibes': 'Warm light' }[theme];
      await page.getByRole('button', { name: label, exact: true }).click(); await page.keyboard.press('Escape');
      check(theme + ' appearance preserves field contrast tokens', await name.evaluate(el => {
        const style = getComputedStyle(el);
        return style.color !== style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)';
      }));
      await page.screenshot({ path: path.join(output, 'contact-' + theme + '.png') });
      await addition.check();
      await page.locator('.enquiry-additions').first().screenshot({ path: path.join(output, 'choices-' + theme + '.png') });
      await addition.uncheck();
    }
    await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
    const reduced = page.getByRole('checkbox', { name: 'Reduce effects', exact: true });
    check('Appearance custom checkbox keeps its full-label hit area', await reduced.evaluate(el => getComputedStyle(el).opacity === '0'));
    await reduced.check();
    check('Reduced effects disables control transitions', await name.evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(value => parseFloat(value) === 0)));
    await page.keyboard.press('Escape');
    for (const route of ['/contact', '/services', '/team', '/client', '/admin']) {
      await page.goto(base + route); await page.locator('main').waitFor();
      await page.locator('main input, main select, main button').first().waitFor();
      for (const width of [320, 390, 768, 1440, 2560]) {
        await page.setViewportSize({ width, height: 900 });
        check(route + ' reflows at ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, route.slice(1) + '-' + width + '.png') });
      }
    }
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(base + '/contact'); await name.waitFor();
    check('Forced colours restores native checkbox painting', await addition.evaluate(el => getComputedStyle(el).appearance === 'auto'));
    check('Forced colours removes the custom checkbox glyph', await addition.evaluate(el => getComputedStyle(el, '::before').content === 'none'));
    await addition.focus(); await page.keyboard.press('Space');
    check('Forced colours checkbox retains keyboard operation', await addition.isChecked());
    await name.focus();
    check('Forced colours retains visible field focus', await name.evaluate(el => getComputedStyle(el).outlineStyle === 'solid'));
    check('No uncaught page errors', report.errors.length === 0);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log('LIQUID_CONTROLS_PASS:', report.checks.length, 'checks;', output);
  } catch (error) {
    report.failure = String(error);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
