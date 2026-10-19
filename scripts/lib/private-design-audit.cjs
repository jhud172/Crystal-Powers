/* Opt-in visual/input acceptance inside existing synthetic functional journeys.
   This does not replace their transport/authority assertions or mutate any form value. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path');
const { auditText } = require('../verify-rendered-ui-browser.cjs');
const themes = [['Dark', 'futuristic'], ['Light', 'clean'], ['Warm dark', 'classic'], ['Fresh light', 'fresh'], ['Warm light', 'summer-vibes']];
function createPrivateDesignAudit(suite) {
  assert.match(suite, /^[a-z0-9-]+$/);
  const enabled = process.env.CRYSTAL_PRIVATE_DESIGN_AUDIT === '1';
  const output = path.resolve('.codex-runtime/qa/private-design-d5', suite);
  const report = { checks: [], states: [], scope: 'Optional read-only rendering/input inspection within the named synthetic browser journey. No real accounts/provider/publication. Computed solid-surface contrast; complex layers remain manual. Focus hit-testing and resized/doubled-text reflow are not physical devices, full Tab order or native browser zoom.' };
  const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
  return async function inspect(page, label) {
    if (!enabled) return;
    await fs.mkdir(output, { recursive: true });
    const viewport = page.viewportSize(), originalTheme = await page.evaluate(() => document.body.dataset.theme);
    const active = await page.evaluateHandle(() => document.activeElement), scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const state = { label, contrast: [], layouts: [], focus: [] }; report.states.push(state);
    const name = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const modal = await page.locator('dialog:modal').count() > 0;
    async function choose(label) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.waitForFunction(() => !document.body.classList.contains('theme-changing'));
    }
    try {
      await page.setViewportSize({ width: 1440, height: 1000 });
      for (const [themeLabel, theme] of modal ? themes.filter(([, theme]) => theme === originalTheme) : themes) {
        if (!modal) await choose(themeLabel);
        // Native modal backgrounds are inert; only its foreground text is relevant.
        const values = await page.evaluate(auditText, { modalOnly: modal });
        state.contrast.push({ theme, ...values });
        await page.screenshot({ path: path.join(output, name + '-' + theme + '.png'), fullPage: !modal });
      }
      for (const width of [320, 390, 768, 1024, 1440, 2560]) {
        await page.setViewportSize({ width, height: width === 1024 ? 480 : 1000 });
        const layout = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, clipped: [...document.querySelectorAll('main button,dialog:modal button')].filter(el => el.checkVisibility() && el.clientWidth && el.scrollWidth > el.clientWidth + 3).map(el => el.textContent.trim().slice(0, 90)) }));
        state.layouts.push({ ...layout, viewport: width });
        if ([390, 1440].includes(width)) await page.screenshot({ path: path.join(output, name + '-' + width + '.png'), fullPage: !modal });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      const styles = await page.evaluateHandle(() => [...document.querySelectorAll('main p, main h1, main h2, main h3, main label, main button, main input, main select, main textarea, main small, main summary,dialog:modal p,dialog:modal h2,dialog:modal label,dialog:modal button')].map(el => ({ el, original: el.style.fontSize, size: parseFloat(getComputedStyle(el).fontSize) })));
      await styles.evaluate(values => { for (const { el, size } of values) el.style.fontSize = size * 2 + 'px'; });
      try {
        state.doubled = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, clipped: [...document.querySelectorAll('main button,dialog:modal button')].filter(el => el.checkVisibility() && el.clientWidth && el.scrollWidth > el.clientWidth + 3).map(el => el.textContent.trim().slice(0, 90)) }));
        if (state.doubled.overflow || state.doubled.clipped.length) await page.screenshot({ path: path.join(output, name + '-doubled.png'), fullPage: !modal });
      } finally { await styles.evaluate(values => { for (const { el, original } of values) el.style.fontSize = original; }); await styles.dispose(); }
      for (const { width, height } of [{ width: 390, height: 844 }, { width: 1440, height: 480 }, { width: 1440, height: 1000 }]) {
        await page.setViewportSize({ width, height });
        const controls = page.locator(modal ? 'dialog:modal :is(button,input,textarea,select,summary,a[href])' : 'main :is(button,input,textarea,select,summary,a[href])');
        for (let i = 0; i < Math.min(await controls.count(), 20); i++) {
          const control = controls.nth(i);
          if (!await control.isVisible() || !await control.isEnabled()) continue;
          await control.focus();
          const hit = await control.evaluate(el => {
            const box = el.getBoundingClientRect(), x = Math.max(0, Math.min(innerWidth - 1, box.x + box.width / 2)), y = Math.max(0, Math.min(innerHeight - 1, box.y + box.height / 2)), top = document.elementFromPoint(x, y);
            return { label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 70) || el.id || el.name, focused: el === document.activeElement, exposed: !!top && (el.contains(top) || top.contains(el)), top: top?.className || top?.tagName };
          });
          await page.keyboard.press('Tab');
          const next = await page.evaluate(modal => {
            const el = document.activeElement;
            return !!el && el !== document.body && el.checkVisibility({ checkVisibilityCSS: true }) && (!modal || !!el.closest('dialog:modal'));
          }, modal);
          await control.focus(); await page.keyboard.press('Shift+Tab');
          const previous = await page.evaluate(modal => {
            const el = document.activeElement;
            return !!el && el !== document.body && el.checkVisibility({ checkVisibilityCSS: true }) && (!modal || !!el.closest('dialog:modal'));
          }, modal);
          state.focus.push({ width, height, ...hit, nativeTabAvailable: next, nativeReverseTabAvailable: previous });
        }
      }
      for (const item of state.contrast) check(label + '/' + item.theme + ' rendered contrast: ' + JSON.stringify(item.failures), item.samples > 0 && item.failures.length === 0);
      for (const item of state.layouts) check(label + '/' + item.width + ' reflow: ' + JSON.stringify(item.clipped), item.document <= item.width + 1 && item.clipped.length === 0);
      check(label + ' doubled text reflow: ' + JSON.stringify(state.doubled), !state.doubled.overflow && state.doubled.clipped.length === 0);
      for (const hit of state.focus) check(label + '/' + hit.width + 'x' + hit.height + ' focused control exposed and native Tab usable: ' + JSON.stringify(hit), hit.focused && hit.exposed && hit.nativeTabAvailable && hit.nativeReverseTabAvailable);
    } catch (error) { report.failure = String(error); throw error; }
    finally {
      if (!modal && originalTheme) await choose(themes.find(([, theme]) => theme === originalTheme)[0]).catch(() => {});
      if (viewport) await page.setViewportSize(viewport);
      await active.evaluate(el => { if (el instanceof HTMLElement && el.isConnected) el.focus({ preventScroll: true }); }).catch(() => {}); await active.dispose();
      await page.evaluate(({ x, y }) => window.scrollTo(x, y), scroll).catch(() => {});
      await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
      console.log('PRIVATE_DESIGN_STATE:', suite, label, report.checks.length, 'cumulative checks');
    }
  };
}
module.exports = { createPrivateDesignAudit };
