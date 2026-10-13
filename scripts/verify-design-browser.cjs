/* Development reference and labelled loading fixtures, not real publication/server acceptance. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs/promises'), path = require('node:path');
const base = 'http://127.0.0.1:5175';
const report = { base, runtime: 'Installed Edge; development reference, emulated widths, native keyboard and labelled delayed Work API fixtures', checks: [], errors: [], shifts: [] };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const themes = ['futuristic', 'clean', 'classic', 'fresh', 'summer-vibes'];
const widths = [320, 390, 768, 1024, 1440, 1920];
const output = path.resolve('.codex-runtime/qa/design-pc');
function luminance(colour) { const channels = colour.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }); return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722; }
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(error.message));
    const writes = [];
    page.on('request', request => { if (request.method() !== 'GET' && request.url().includes('/api/')) writes.push(request.url()); });
    await page.goto(base + '/design/observatory.html');
    check('Development entry is noindex and labelled as a design preview', await page.locator('meta[name="robots"]').getAttribute('content') === 'noindex, nofollow' && (await page.locator('.draft-toolbar').textContent()).includes('design preview'));
    const compositions = page.getByRole('group', { name: 'Preview a composition' });
    for (const theme of themes) {
      await page.getByLabel('Appearance', { exact: true }).selectOption(theme);
      for (const name of ['Homepage', 'Services builder', 'Case study', 'Control states']) {
        await compositions.getByRole('button', { name, exact: true }).click();
        for (const width of widths) {
          await page.setViewportSize({ width, height: 900 });
          check(`${theme} / ${name} / ${width}px bounds and one readable title`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelectorAll('main h1').length === 1));
          check(`${theme} / ${name} / ${width}px controls stay inside the screen`, await page.locator('main :is(button,input,select,textarea,summary)').evaluateAll(elements => elements.every(element => { const box = element.getBoundingClientRect(); return !box.width || (box.left >= -1 && box.right <= innerWidth + 1); })));
          if (['futuristic', 'clean'].includes(theme) && [390, 1440].includes(width)) await page.screenshot({ path: path.join(output, `draft-${name.replaceAll(' ', '-')}-${theme}-${width}.png`), fullPage: true });
        }
      }
      await page.setViewportSize({ width: 390, height: 900 });
      const input = page.getByLabel('Example email address', { exact: true });
      await page.getByRole('button', { name: 'Check example details', exact: false }).click();
      check(`${theme} invalid field links textual error and retains keyboard focus`, await input.getAttribute('aria-invalid') === 'true' && await input.evaluate(element => element === document.activeElement) && await page.getByRole('alert').count() === 1);
      const colours = await page.evaluate(() => {
        const shell = document.querySelector('.studio-shell'), field = document.querySelector('.design-reference .field-input'), error = document.querySelector('.reference-error'), hint = document.querySelector('.reference-hint');
        return { background: getComputedStyle(shell).backgroundColor, text: getComputedStyle(shell).color, muted: getComputedStyle(hint).color, error: getComputedStyle(error).color, fieldBorder: getComputedStyle(field).borderTopColor, focus: getComputedStyle(field).outlineColor, focusWidth: getComputedStyle(field).outlineWidth };
      });
      check(`${theme} representative body and hint contrast >= 4.5`, contrast(colours.text, colours.background) >= 4.5 && contrast(colours.muted, colours.background) >= 4.5);
      check(`${theme} textual error contrast >= 4.5 and state border >= 3`, contrast(colours.error, colours.background) >= 4.5 && contrast(colours.fieldBorder, colours.background) >= 3);
      check(`${theme} visible keyboard focus contrast >= 3`, parseFloat(colours.focusWidth) >= 2 && contrast(colours.focus, colours.background) >= 3);
      const action = page.getByRole('button', { name: 'Check example details', exact: false });
      const normalAction = await action.evaluate(element => ({ text: getComputedStyle(element).color, surface: getComputedStyle(element).backgroundColor })); await action.hover();
      const hoverAction = await action.evaluate(element => ({ text: getComputedStyle(element).color, surface: getComputedStyle(element).backgroundColor }));
      check(`${theme} primary action has readable default and hover contrast`, contrast(normalAction.text, normalAction.surface) >= 4.5 && contrast(hoverAction.text, hoverAction.surface) >= 4.5);
      await input.fill('example@example.com'); await input.press('Enter');
      check(`${theme} success is explicit preview-only feedback`, (await page.getByRole('status').textContent()).includes('Nothing has been submitted or delivered') && await page.getByRole('alert').count() === 0);
      await page.getByRole('button', { name: 'Reset example', exact: true }).click();
      check(`${theme} reset clears the example and feedback`, await input.inputValue() === '' && await page.getByRole('status').count() === 0);
      const disabled = page.getByRole('button', { name: 'Unavailable action', exact: true });
      const beforeHover = await disabled.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, transform: getComputedStyle(element).transform })); await disabled.hover();
      check(`${theme} disabled action cannot hover-lift or change its surface`, await disabled.isDisabled() && await disabled.evaluate((element, before) => getComputedStyle(element).backgroundColor === before.background && getComputedStyle(element).transform === before.transform, beforeHover));
      await page.getByRole('radio', { name: 'Expressive', exact: true }).check();
      check(`${theme} native selection has checked and visible indicator`, await page.getByRole('radio', { name: 'Expressive', exact: true }).isChecked() && (await page.locator('.reference-choice:has(:checked)').textContent()).includes('✓'));
      const mobile = page.getByRole('button', { name: 'Mobile', exact: true }); await mobile.focus(); await page.keyboard.press('Space');
      check(`${theme} keyboard activates selected device button`, await mobile.getAttribute('aria-pressed') === 'true');
      const summary = page.locator('.reference-disclosure summary'); await summary.focus(); await page.keyboard.press('Enter');
      check(`${theme} native disclosure opens with keyboard`, await page.locator('.reference-disclosure').getAttribute('open') !== null);
      await page.screenshot({ path: path.join(output, `controls-${theme}.png`), fullPage: true });
      await page.setViewportSize({ width: 320, height: 900 });
      await page.locator('.design-reference :is(h1,h2,h3,p,label,button,summary,legend,span,input)').evaluateAll(elements => { const sizes = elements.map(element => parseFloat(getComputedStyle(element).fontSize)); elements.forEach((element, index) => { element.style.fontSize = `${sizes[index] * 2}px`; }); });
      check(`${theme} doubled reference text remains readable without clipped controls`, await page.locator('.design-reference :is(h1,h2,p,button,input,summary)').evaluateAll(elements => elements.every(element => { const box = element.getBoundingClientRect(); return box.left >= -1 && box.right <= innerWidth + 1 && (element.tagName === 'INPUT' || element.scrollWidth <= element.clientWidth + 1); })));
      // Clear local example selection/disclosure state before the next appearance.
      await compositions.getByRole('button', { name: 'Homepage', exact: true }).click();
    }
    const skipPage = await browser.newPage({ viewport: { width: 1440, height: 900 } }); await skipPage.goto(base + '/design/observatory.html'); await skipPage.keyboard.press('Tab'); await skipPage.keyboard.press('Enter');
    check('Development skip link focuses the actual main content', await skipPage.locator('main').evaluate(element => element === document.activeElement)); await skipPage.close();
    await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(base + '/design/observatory.html');
    await compositions.getByRole('button', { name: 'Homepage', exact: true }).click();
    await page.getByRole('button', { name: 'Preview open state', exact: false }).click();
    check('Draft uses real Aurora stills and links its live opening separately', (await page.locator('.draft-observatory img').getAttribute('src')).includes('-open.png') && (await page.locator('.draft-observatory').textContent()).includes('live opening available on the homepage'));
    await compositions.getByRole('button', { name: 'Services builder', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: false }).click(); check('Builder example blocks an empty starting point', await page.getByRole('alert').count() === 1);
    await page.locator('.draft-choice').first().click(); await page.getByRole('button', { name: 'Continue', exact: false }).click(); await page.getByRole('button', { name: 'Continue', exact: false }).click();
    check('Draft aftercare accurately points to the implemented discuss-later choice', (await page.locator('.draft-builder-main').textContent()).includes('working website also offers a discuss-later choice'));
    await compositions.getByRole('button', { name: 'Case study', exact: true }).click();
    check('Case-study composition never presents demonstration art as client proof', (await page.locator('.draft-case').textContent()).includes('not a client project'));
    check('Development interactions never write to an API', writes.length === 0);
    for (const width of widths) {
      const delayed = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      delayed.on('pageerror', error => report.errors.push(error.message));
      let release; const gate = new Promise(resolve => { release = resolve; });
      await delayed.route('**/api/projects', async route => { await gate; await route.fulfill({ json: [] }); });
      await delayed.addInitScript(() => { window.__shifts = []; new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shifts.push(entry.value); }).observe({ type: 'layout-shift', buffered: true }); });
      await delayed.goto(base + '/portfolio'); await delayed.locator('.work-loading').waitFor();
      const before = await delayed.locator('.work-filter-bar').boundingBox(); await delayed.evaluate(() => { window.__shifts = []; }); release();
      await delayed.locator('.studio-empty').waitFor(); await delayed.waitForTimeout(150);
      const after = await delayed.locator('.work-filter-bar').boundingBox();
      const shift = await delayed.evaluate(() => window.__shifts.reduce((sum, value) => sum + value, 0)); report.shifts.push({ width, shift, before, after });
      check(`${width}px Work counts retain filter geometry during delayed empty loading`, Math.abs(before.y - after.y) < 1 && Math.abs(before.height - after.height) < 1);
      check(`${width}px delayed Work transition has no material layout shift`, shift < .01);
      await delayed.close();
    }
    check('No uncaught browser errors', report.errors.length === 0);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`DESIGN_BROWSER_PASS: ${report.checks.length} checks`);
  } catch (error) { report.failure = String(error); await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
