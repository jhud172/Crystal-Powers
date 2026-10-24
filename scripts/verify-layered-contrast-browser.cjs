/* Conservative screenshot-background samples under actual header/hero text.
   Text is temporarily made transparent without hiding its surfaces or changing layout.
   A bounding rectangle may include whitespace; this is stricter than glyph-only sampling. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/layered-contrast-d5');
const report = { checks: [], cases: [], errors: [], scope: 'Local built Edge, actual screenshot background pixels under header/hero text, five appearances and desktop/compact still states. Bounding-rectangle sampling is conservative; not independent conformance, all animation frames or physical-device certification.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.route('**/api/**', route => { assert.equal(route.request().method(), 'GET'); return route.fulfill({ json: new URL(route.request().url()).pathname === '/api/site/privacy/status' ? { ready: false } : [] }); });
  try {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 }); await page.goto(base); await page.locator('#hero-title').waitFor();
      await page.waitForFunction(() => document.querySelector('.liquid-light-art img')?.naturalWidth > 0);
      for (const label of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
        await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('button', { name: label, exact: true }).click(); await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.body.classList.contains('theme-changing'));
        await page.evaluate(() => window.scrollTo(0, 0));
        const samples = await page.evaluate(() => {
          const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
          const walker = document.createTreeWalker(document.querySelector('.studio-shell'), NodeFilter.SHOW_TEXT), result = [];
          while (walker.nextNode()) {
            const n = walker.currentNode, el = n.parentElement;
            if (!n.textContent.trim() || !el.closest('.studio-header,.liquid-hero') || el.closest('[aria-hidden="true"]') || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
            let visuallyClipped = false;
            for (let p = el; p; p = p.parentElement) {
              const s = getComputedStyle(p);
              if (s.clipPath === 'inset(50%)' || s.clip === 'rect(0px, 0px, 0px, 0px)') visuallyClipped = true;
            }
            if (visuallyClipped) continue;
            const style = getComputedStyle(el), range = document.createRange(); range.selectNodeContents(n);
            ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = style.color; ctx.fillRect(0, 0, 1, 1);
            const foreground = [...ctx.getImageData(0, 0, 1, 1).data]; let alpha = foreground[3] / 255;
            for (let p = el; p; p = p.parentElement) alpha *= Number(getComputedStyle(p).opacity);
            for (const box of range.getClientRects()) if (box.width > 0 && box.height > 0) result.push({ label: n.textContent.trim().slice(0, 100), foreground: foreground.slice(0, 3), alpha, minimum: parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5, box: { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height } });
          }
          return result;
        });
        await page.screenshot({ path: path.join(output, label.replaceAll(' ', '-') + '-' + width + '.png'), fullPage: true });
        const mask = await page.addStyleTag({ content: '.studio-header *, .liquid-hero * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } .studio-header svg, .liquid-hero svg { visibility: hidden !important; }' });
        const background = (await page.screenshot({ fullPage: true })).toString('base64');
        await mask.evaluate(el => el.remove());
        const results = await page.evaluate(async ({ background, samples }) => {
          const image = new Image(); image.src = 'data:image/png;base64,' + background; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const lum = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
          return samples.map(sample => {
            let minimum = Infinity, location = null;
            const { x, y, width, height } = sample.box;
            for (let row = Math.max(0, Math.ceil(y)); row < Math.min(canvas.height, Math.floor(y + height)); row++) for (let col = Math.max(0, Math.ceil(x)); col < Math.min(canvas.width, Math.floor(x + width)); col++) {
              const index = (row * canvas.width + col) * 4, back = [pixels[index], pixels[index + 1], pixels[index + 2]];
              const front = sample.foreground.map((v, i) => v * sample.alpha + back[i] * (1 - sample.alpha));
              const a = lum(front), b = lum(back), contrast = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
              if (contrast < minimum) { minimum = contrast; location = { x: col, y: row }; }
            }
            return { label: sample.label, minimum: sample.minimum, ratio: minimum, location };
          });
        }, { background, samples });
        report.cases.push({ width, theme: label, results });
      }
    }
    for (const item of report.cases) {
      const failed = item.results.filter(r => r.ratio + .01 < r.minimum || !Number.isFinite(r.ratio));
      check(item.theme + '/' + item.width + ' screenshot-background contrast: ' + JSON.stringify(failed), item.results.length > 0 && failed.length === 0);
    }
    check('No uncaught layered-contrast browser errors', report.errors.length === 0);
    console.log('LAYERED_CONTRAST_PASS:', report.checks.length, 'checks;', report.cases.reduce((n, c) => n + c.results.length, 0), 'text rectangles');
  } catch (error) { report.failure = String(error); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
