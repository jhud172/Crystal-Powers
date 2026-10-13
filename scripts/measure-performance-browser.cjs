/* Local cold-context measurements; not hosted, throttled or physical-device certification. */
const { createRequire } = require('node:module');
const fs = require('node:fs/promises');
const path = require('node:path');
const modulePath = process.env.CRYSTAL_PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error('Set CRYSTAL_PLAYWRIGHT_MODULE to the existing Playwright runtime.');
const { chromium } = createRequire(path.join(modulePath, 'package.json'))(modulePath);
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
if (!/^http:\/\/127\.0\.0\.1:(8084|8085|5175)$/.test(base)) throw new Error('Measurements are restricted to the disposable/local runtime.');
const routes = ['/', '/services', '/about', '/portfolio', '/support', '/contact', '/accessibility'];
const report = { base, recordedAt: new Date().toISOString(), environment: 'Installed Edge, headless desktop PC; cold context/cache, no network/CPU throttling; anonymous local data', samples: [] };

(async () => {
  const modelBytes = (await fs.stat(path.resolve(__dirname, '../frontend/public/models/observatory.glb'))).size;
  const browser = await chromium.launch({ executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE, headless: true });
  try {
    for (const width of [390, 1440]) for (const reduced of [false, true]) for (const route of routes) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference', serviceWorkers: 'block' });
      let closingContext = false;
      const teardownRequests = [];
      try {
        await context.addInitScript(value => {
          localStorage.setItem('crystal_reduce_effects', String(value));
          window.__crystalMeasurements = { lcp: null, shifts: 0, longTasks: [] };
          for (const [type, receive] of [
            ['largest-contentful-paint', entries => { window.__crystalMeasurements.lcp = entries.at(-1)?.startTime ?? null; }],
            ['layout-shift', entries => { for (const entry of entries) if (!entry.hadRecentInput) window.__crystalMeasurements.shifts += entry.value; }],
            ['longtask', entries => { window.__crystalMeasurements.longTasks.push(...entries.map(entry => entry.duration)); }],
          ]) {
            try { new PerformanceObserver(list => receive(list.getEntries())).observe({ type, buffered: true }); } catch { /* Unsupported observations are reported as unavailable. */ }
          }
        }, reduced);
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Performance.enable');
        let transferredBytes = 0;
        const failedRequests = [], pageErrors = [];
        cdp.on('Network.loadingFinished', event => { transferredBytes += event.encodedDataLength; });
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('requestfailed', request => (closingContext ? teardownRequests : failedRequests).push({ url: request.url(), reason: request.failure()?.errorText }));
        const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.locator('main h1').waitFor();
        if (route === '/' && !reduced) await page.locator('.crystal-opening[data-ready="true"]').waitFor({ timeout: 20_000 });
        await page.waitForTimeout(2000);
        const measured = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          const resources = performance.getEntriesByType('resource').map(entry => ({ url: entry.name, initiator: entry.initiatorType, durationMs: entry.duration, transferBytes: entry.transferSize, encodedBytes: entry.encodedBodySize, decodedBytes: entry.decodedBodySize }));
          return { domContentLoadedMs: nav.domContentLoadedEventEnd, navigationTransferBytes: nav.transferSize, resourceTransferBytes: resources.reduce((total, entry) => total + entry.transferBytes, 0), firstContentfulPaintMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null, ...window.__crystalMeasurements, modelReady: document.querySelector('.crystal-opening')?.getAttribute('data-ready') === 'true', canvases: document.querySelectorAll('canvas').length, documentWidth: document.documentElement.scrollWidth, resources };
        });
        const { metrics } = await cdp.send('Performance.getMetrics');
        const readMetric = name => metrics.find(item => item.name === name)?.value ?? null;
        // Edge can flag the stream as aborted after all bytes were consumed and parsed.
        // Retain the diagnostic; only a complete known payload plus actual ready scene qualifies.
        const completedStreamCancellations = failedRequests.filter(request => request.reason === 'net::ERR_ABORTED' && request.url === base + '/models/observatory.glb?v=aurora-02' && measured.modelReady && measured.resources.some(resource => resource.url === request.url && resource.decodedBytes === modelBytes && resource.encodedBytes === modelBytes && resource.transferBytes > 0));
        const unresolvedRequests = failedRequests.filter(request => !completedStreamCancellations.includes(request));
        report.samples.push({ route, width, reduceEffects: reduced, httpStatus: response.status(), transferredBytes, scriptDurationSeconds: readMetric('ScriptDuration'), taskDurationSeconds: readMetric('TaskDuration'), jsHeapUsedBytes: readMetric('JSHeapUsedSize'), failedRequests: [...failedRequests], completedStreamCancellations, unresolvedRequests, teardownRequests, pageErrors: [...pageErrors], ...measured });
        console.log(`${route} ${width} ${reduced ? 'reduced' : 'standard'}: ${Math.round(measured.resourceTransferBytes / 1024)} KiB resources, ${measured.resources.length} resources, ${measured.canvases} canvas, ${pageErrors.length} page errors`);
      } finally { closingContext = true; await context.close(); }
    }
  } finally { await browser.close(); }
  const folder = path.resolve(__dirname, '../.codex-runtime/qa/performance-pc');
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, 'report.json'), JSON.stringify(report, null, 2));
  const incorrectCanvas = report.samples.filter(sample => (sample.reduceEffects || sample.route !== '/') && sample.canvases > 0);
  const failures = report.samples.filter(sample => sample.httpStatus !== 200 || sample.pageErrors.length || sample.unresolvedRequests.length || sample.documentWidth > sample.width);
  console.log(JSON.stringify({ samples: report.samples.length, failures: failures.length, unexpectedCanvas: incorrectCanvas.length }));
  if (failures.length || incorrectCanvas.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
