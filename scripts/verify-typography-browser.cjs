/* Read-only loopback typography checks; no provider or application writes. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:8084$/);
const output = path.resolve('.codex-runtime/qa/typography-20261023');
const report = { checks: [], errors: [], samples: 0, failures: [] };
const routes = ['/', '/about', '/services', '/portfolio', '/portfolio/missing', '/contact', '/support', '/accessibility', '/privacy', '/missing', '/admin', '/team', '/client', '/birthday/mission-vi'];
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET');
    const url = new URL(route.request().url()).pathname;
    if (url === '/api/projects') return route.fulfill({ json: [] });
    if (url === '/api/site/privacy/status') return route.fulfill({ json: { ready: false } });
    if (url.endsWith('/session')) return route.fulfill({ json: { authenticated: false } });
    return route.fulfill({ status: 404, json: { message: 'Read-only fixture: unavailable.' } });
  });
  async function inspect() {
    return page.evaluate(() => {
      const context = document.createElement('canvas').getContext('2d');
      const bitmap = document.createElement('canvas');
      function inkCollides(first, second, distance, font, size) {
        bitmap.width = Math.ceil(size * 4 + Math.abs(distance)); bitmap.height = Math.ceil(size * 3);
        const paint = bitmap.getContext('2d'); paint.font = font; paint.fontKerning = 'none';
        paint.fillText(first, size, size * 2);
        const a = paint.getImageData(0, 0, bitmap.width, bitmap.height).data;
        paint.clearRect(0, 0, bitmap.width, bitmap.height); paint.fillText(second, size + distance, size * 2);
        const b = paint.getImageData(0, 0, bitmap.width, bitmap.height).data;
        for (let i = 3; i < a.length; i += 4) if (a[i] > 64 && b[i] > 64) return true;
        return false;
      }
      const failures = []; let samples = 0;
      for (const element of document.querySelectorAll('h1,h2,h3,h4,h5,h6,.liquid-wordmark,button,label,nav a')) {
        const css = getComputedStyle(element);
        if (!element.getClientRects().length || css.visibility === 'hidden' || css.clipPath === 'inset(50%)' || css.clip === 'rect(0px, 0px, 0px, 0px)' || element.closest('[hidden],[inert]')) continue;
        if (parseFloat(css.letterSpacing) < 0) failures.push({ text: element.textContent.slice(0, 80), reason: 'negative tracking' });
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const style = getComputedStyle(node.parentElement);
          context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          context.fontKerning = 'none';
          let previous;
          for (let i = 0; i < node.textContent.length; i++) {
            const raw = node.textContent[i];
            const char = style.textTransform === 'uppercase' ? raw.toUpperCase() : style.textTransform === 'lowercase' ? raw.toLowerCase() : raw;
            if (!/[A-Za-z0-9]/.test(char)) { previous = null; continue; }
            const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
            const rect = range.getBoundingClientRect();
            if (!rect.width || !rect.height) continue;
            const ink = context.measureText(char);
            const left = rect.left - ink.actualBoundingBoxLeft;
            const right = rect.left + ink.actualBoundingBoxRight;
            // Ink bounds overlap for ordinary diagonal/rounded glyphs even when
            // their pixels are separate. Confirm actual raster collision first.
            if (previous && Math.abs(rect.top - previous.top) < 1 && left < previous.right && inkCollides(previous.char, char, rect.left - previous.left, context.font, parseFloat(style.fontSize))) failures.push({ text: node.textContent.trim().slice(0, 80), reason: 'adjacent rendered glyph pixels overlap', char });
            previous = { right, top: rect.top, left: rect.left, char }; samples++;
          }
        }
      }
      const mark = document.querySelector('.liquid-wordmark');
      const eyebrow = document.querySelector('.liquid-hero-copy .studio-eyebrow');
      if (mark && eyebrow && mark.getBoundingClientRect().bottom + 12 > eyebrow.getBoundingClientRect().top) failures.push({ reason: 'wordmark/eyebrow lacks vertical separation' });
      if (document.documentElement.scrollWidth > innerWidth + 1) failures.push({ reason: 'horizontal page overflow' });
      return { samples, failures };
    });
  }
  try {
    for (const width of [320, 390, 768, 1024, 1440, 1920, 2560]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        await page.goto(base + route); await page.locator('main').waitFor(); await page.evaluate(() => document.fonts.ready);
        const result = await inspect(); report.samples += result.samples;
        report.checks.push({ route, width, samples: result.samples });
        if (result.failures.length) report.failures.push({ route, width, failures: result.failures });
      }
      await page.goto(base); await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(output, `home-${width}.png`) });
      await page.evaluate(() => {
        const targets = [...document.querySelectorAll('h1,h2,h3,.liquid-wordmark,.liquid-wordmark span')].map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
        for (const [el, size] of targets) el.style.fontSize = size * 2 + 'px';
      });
      const large = await inspect(); report.samples += large.samples;
      report.checks.push({ route: '/', width, enlarged: true, samples: large.samples });
      if (large.failures.length) report.failures.push({ route: '/', width, enlarged: true, failures: large.failures });
    }
    assert.equal(report.failures.length, 0, JSON.stringify(report.failures.slice(0, 5)));
    assert.deepEqual(report.errors, []); report.passed = true;
  } finally {
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(`TYPOGRAPHY_PASS: ${report.checks.length} states, ${report.samples} glyph samples`);
})().catch(error => { console.error(error); process.exitCode = 1; });
