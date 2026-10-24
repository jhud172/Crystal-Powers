/* Existing-feature returning-visitor cold-context measurements; Companion acceptance excluded by James.
   Local cold-context measurements; not hosted, throttled or physical-device certification. */
const { createRequire } = require('node:module');
const fs = require('node:fs/promises');
const path = require('node:path');
const modulePath = process.env.CRYSTAL_PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error('Set CRYSTAL_PLAYWRIGHT_MODULE to the existing Playwright runtime.');
const { chromium } = createRequire(path.join(modulePath, 'package.json'))(modulePath);
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
if (!/^http:\/\/127\.0\.0\.1:(8084|8085|5175|18084)$/.test(base)) throw new Error('Measurements are restricted to the disposable/local runtime.');
const routes = ['/', '/services', '/about', '/portfolio', '/support', '/contact', '/accessibility', '/privacy', '/admin', '/team', '/client', '/qa-missing'];
const report = { candidateSha256:process.env.CRYSTAL_QA_CANDIDATE_SHA256, base, recordedAt: new Date().toISOString(), environment: 'Installed Edge, headless desktop PC; cold context/cache, no network/CPU throttling; anonymous local data', samples: [] };

(async () => {
  const policyResponse = await fetch(base + '/api/site/privacy/status');
  if (!policyResponse.ok) throw new Error('Use a packaged backend with the privacy-status API for this profile.');
  const policy = await policyResponse.json();
  const browser = await chromium.launch({ executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE, headless: true });
  try {
    for (const width of [390, 1440]) for (const reduced of [false, true]) for (const profile of routes.map(route => ({route, visitor: 'returning'}))) {
      const {route, visitor} = profile;
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference', serviceWorkers: 'block' });
      let closingContext = false;
      const teardownRequests = [];
      try {
        await context.addInitScript(({value, visitor}) => {
          if (visitor === 'returning') localStorage.setItem('crystal_prism_visit_v1', JSON.stringify({status:'completed',version:1}));
          localStorage.setItem('crystal_reduce_effects', String(value));
          window.__crystalMeasurements = { lcp: null, shifts: 0, longTasks: [] };
          for (const [type, receive] of [
            ['largest-contentful-paint', entries => { window.__crystalMeasurements.lcp = entries.at(-1)?.startTime ?? null; }],
            ['layout-shift', entries => { for (const entry of entries) if (!entry.hadRecentInput) window.__crystalMeasurements.shifts += entry.value; }],
            ['longtask', entries => { window.__crystalMeasurements.longTasks.push(...entries.map(entry => entry.duration)); }],
          ]) {
            try { new PerformanceObserver(list => receive(list.getEntries())).observe({ type, buffered: true }); } catch { /* Unsupported observations are reported as unavailable. */ }
          }
        }, {value: reduced, visitor});
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
        // Initial-load profiles do not activate optional 3D. Interactions are measured separately.
        if (route === '/') await page.locator('.crystal-opening').waitFor();
        await page.waitForTimeout(2000);
        const measured = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          const resources = performance.getEntriesByType('resource').map(entry => ({ url: entry.name, initiator: entry.initiatorType, durationMs: entry.duration, transferBytes: entry.transferSize, encodedBytes: entry.encodedBodySize, decodedBytes: entry.decodedBodySize }));
          return { domContentLoadedMs: nav.domContentLoadedEventEnd, navigationTransferBytes: nav.transferSize, resourceTransferBytes: resources.reduce((total, entry) => total + entry.transferBytes, 0), firstContentfulPaintMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null, ...window.__crystalMeasurements, modelReady: document.querySelector('.crystal-opening')?.getAttribute('data-ready') === 'true', canvases: document.querySelectorAll('canvas:not(.prism-stars)').length, decorativeCanvases: document.querySelectorAll('canvas.prism-stars').length, documentWidth: document.documentElement.scrollWidth, resources };
        });
        const { metrics } = await cdp.send('Performance.getMetrics');
        const readMetric = name => metrics.find(item => item.name === name)?.value ?? null;
        const completedStreamCancellations = [];
        const unresolvedRequests = [...failedRequests];
        report.samples.push({ route, visitor, width, reduceEffects: reduced, httpStatus: response.status(), expectedHttpStatus: route === '/qa-missing' || (route === '/privacy' && !policy.ready) ? 404 : 200, transferredBytes, scriptDurationSeconds: readMetric('ScriptDuration'), taskDurationSeconds: readMetric('TaskDuration'), jsHeapUsedBytes: readMetric('JSHeapUsedSize'), failedRequests: [...failedRequests], completedStreamCancellations, unresolvedRequests, teardownRequests, pageErrors: [...pageErrors], ...measured });
        console.log(`${route} ${width} ${reduced ? 'reduced' : 'standard'}: ${Math.round(measured.resourceTransferBytes / 1024)} KiB resources, ${measured.resources.length} resources, ${measured.canvases} canvas, ${pageErrors.length} page errors`);
      } finally { closingContext = true; await context.close(); }
    }
  } finally { await browser.close(); }
  const folder = path.resolve(__dirname, '../.codex-runtime/qa/performance-pc');
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, 'report.json'), JSON.stringify(report, null, 2));
  const incorrectCanvas = report.samples.filter(sample => sample.canvases > 0 || sample.resources.some(resource => /\.(?:glb|gltf)(?:\?|$)/.test(resource.url)));
  const failures = report.samples.filter(sample => sample.httpStatus !== sample.expectedHttpStatus || sample.pageErrors.length || sample.unresolvedRequests.length || sample.documentWidth > sample.width || sample.shifts > 0.1);
  console.log(JSON.stringify({ samples: report.samples.length, failures: failures.length, unexpectedCanvas: incorrectCanvas.length }));
  if (failures.length || incorrectCanvas.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
