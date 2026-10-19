/* Contrast roles and text-enlargement proxies; not an assistive-device audit. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/liquid-accessibility-d5');
const report = { checks: [], errors: [], contrast: [], scope: 'Built frontend; computed semantic-role contrast and synthetic doubled text at emulated widths. This is not real browser zoom, full-page contrast or assistive-device certification.' };
function check(name, value) { assert.ok(value, name); report.checks.push(name); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET');
    return route.fulfill({ json: new URL(route.request().url()).pathname === '/api/site/privacy/status' ? { ready: false } : [] });
  });
  try {
    await page.goto(base + '/contact'); await page.locator('#firstName').waitFor();
    for (const [label, theme] of [['Dark', 'futuristic'], ['Light', 'clean'], ['Warm dark', 'classic'], ['Fresh light', 'fresh'], ['Warm light', 'summer-vibes']]) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: label, exact: true }).click();
      const values = await page.evaluate(() => {
        const style = getComputedStyle(document.querySelector('.studio-shell'));
        const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
        function luminance(colour) {
          ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = colour; ctx.fillRect(0, 0, 1, 1);
          const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
          return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
        }
        const token = name => style.getPropertyValue('--studio-' + name).trim();
        const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
        const field = getComputedStyle(document.querySelector('#firstName'));
        return { text: ratio(token('text'), token('bg')), muted: ratio(token('muted'), token('bg')), accentAction: ratio(token('button-text'), token('accent')), fieldText: ratio(field.color, field.backgroundColor), fieldBoundary: ratio(field.borderTopColor, field.backgroundColor), focus: ratio(token('focus'), token('bg')) };
      });
      report.contrast.push({ theme, ...values });
      for (const role of ['text', 'muted', 'accentAction', 'fieldText']) check(theme + '/' + role + ' contrast >=4.5', values[role] >= 4.5);
      for (const role of ['fieldBoundary', 'focus']) check(theme + '/' + role + ' contrast >=3', values[role] >= 3);
    }
    for (const route of ['/about', '/services', '/portfolio', '/contact', '/support', '/accessibility']) {
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(base + route); await page.locator('main h1').waitFor();
        await page.locator('.studio-shell').evaluate(root => {
          const sizes = [...root.querySelectorAll('p,h1,h2,h3,label,button,input,textarea,select,summary,a,small,dt,dd')].map(el => ({ el, font: parseFloat(getComputedStyle(el).fontSize) }));
          for (const { el, font } of sizes) el.style.fontSize = font * 2 + 'px';
        });
        const result = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, clipped: [...document.querySelectorAll('main button')].filter(el => el.clientWidth && el.scrollWidth > el.clientWidth + 3).map(el => el.textContent.trim()).slice(0, 8) }));
        check(route + '/' + width + ' doubled text reflows: ' + JSON.stringify(result), !result.overflow && result.clipped.length === 0);
      }
    }
    check('No uncaught accessibility-check errors', report.errors.length === 0);
    console.log('LIQUID_ACCESSIBILITY_PASS:', report.checks.length, 'checks;', output);
  } catch (error) { report.failure = String(error); await page.screenshot({ path: path.join(output, 'failure.png') }); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
