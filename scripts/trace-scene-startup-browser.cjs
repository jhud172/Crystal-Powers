/* Diagnostic startup attribution; no accounts, API mutations or dependency installation. */
const { createRequire } = require('node:module');
const fs = require('node:fs/promises');
const path = require('node:path');
const modulePath = process.env.CRYSTAL_PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error('Set CRYSTAL_PLAYWRIGHT_MODULE to the existing Playwright runtime.');
const { chromium } = createRequire(path.join(modulePath, 'package.json'))(modulePath);
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8085';
const width = Number(process.env.CRYSTAL_QA_WIDTH || 390);
if (![390, 1440].includes(width)) throw new Error('Trace viewport must be 390 or 1440 CSS pixels.');
if (!/^http:\/\/127\.0\.0\.1:(8084|8085|5175)$/.test(base)) throw new Error('Startup tracing is restricted to local QA.');
const output = path.resolve(__dirname, '../.codex-runtime/qa/render-cost-pc');

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    await context.addInitScript(() => {
      window.__sceneStartup = { calls: [], longTasks: [] };
      const shaderSources = new WeakMap();
      const programSources = new WeakMap();
      const proto = WebGL2RenderingContext.prototype;
      const shaderSource = proto.shaderSource;
      proto.shaderSource = function (shader, source) {
        shaderSources.set(shader, source);
        return shaderSource.call(this, shader, source);
      };
      const attachShader = proto.attachShader;
      proto.attachShader = function (program, shader) {
        const sources = programSources.get(program) || [];
        sources.push(shaderSources.get(shader) || '');
        programSources.set(program, sources);
        return attachShader.call(this, program, shader);
      };
      new PerformanceObserver(list => {
        window.__sceneStartup.longTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration })));
      }).observe({ type: 'longtask', buffered: true });
      for (const method of ['compileShader', 'linkProgram', 'getProgramInfoLog', 'getShaderInfoLog', 'getProgramParameter', 'getShaderParameter', 'getUniformLocation', 'getActiveUniform', 'texImage2D', 'texSubImage2D', 'drawElements', 'drawArrays']) {
        const original = WebGL2RenderingContext.prototype[method];
        WebGL2RenderingContext.prototype[method] = function (...args) {
          const start = performance.now();
          try { return original.apply(this, args); }
          finally {
            const duration = performance.now() - start;
            if (duration >= 1) {
              const defines = method === 'getProgramInfoLog' ? (programSources.get(args[0]) || [])
                .map(source => source.split('\n').filter(line => /^#define (SHADER_NAME|USE_TRANSMISSION|DOUBLE_SIDED|FLIP_SIDED|TONE_MAPPING|ENVMAP_TYPE)/.test(line))) : [];
              window.__sceneStartup.calls.push({ method, start, duration, defines });
            }
          }
        };
      }
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.url().startsWith(base + '/api/') && request.method() !== 'GET') errors.push('Unexpected API mutation');
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
    await cdp.send('Profiler.start');
    const response = await page.goto(base, { waitUntil: 'domcontentloaded' });
    if (response.status() !== 200) throw new Error('Home did not return HTTP 200.');
    await page.locator('.crystal-opening[data-ready="true"]').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(500);
    const { profile } = await cdp.send('Profiler.stop');
    const measurements = await page.evaluate(() => window.__sceneStartup);
    const hits = new Map();
    for (let index = 0; index < profile.samples.length; index++) {
      const id = profile.samples[index];
      hits.set(id, (hits.get(id) || 0) + profile.timeDeltas[index]);
    }
    const report = {
      recordedAt: new Date().toISOString(), base, viewportWidth: width,
      scope: 'Instrumented cold desktop Edge; sampled CPU attribution and synchronous GL call duration, not production or interaction acceptance.',
      ...measurements, errors,
      hottestFrames: profile.nodes.map(node => ({ sampledMs: (hits.get(node.id) || 0) / 1000, ...node.callFrame }))
        .sort((a, b) => b.sampledMs - a.sampledMs).slice(0, 20),
    };
    await fs.writeFile(path.join(output, 'startup-trace.json'), JSON.stringify(report, null, 2));
    await fs.writeFile(path.join(output, 'startup-trace.cpuprofile'), JSON.stringify(profile));
    console.log(JSON.stringify({ base, longTasks: report.longTasks, slowestCalls: report.calls.sort((a, b) => b.duration - a.duration).slice(0, 10), errors }));
    if (errors.length) throw new Error(errors.join('; '));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
