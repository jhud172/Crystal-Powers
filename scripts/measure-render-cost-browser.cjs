/* Read-only packaged comparison. GPU elapsed queries are not frame cadence or mobile/thermal proof. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const before = process.env.CRYSTAL_RENDER_BEFORE || 'http://127.0.0.1:8084';
const after = process.env.CRYSTAL_RENDER_AFTER || 'http://127.0.0.1:8085';
for (const base of [before, after]) assert.match(base, /^http:\/\/127\.0\.0\.1:808[45]$/);
assert.notEqual(before, after, 'Use distinct retained/current packages.');
const output = path.resolve('.codex-runtime/qa/render-cost-pc');
const report = { recordedAt: new Date().toISOString(), before, after, samples: [], errors: [],
  scope: 'Installed Edge/D3D11 on desktop; emulated viewport/DPR2, warm-shader operations, bounded GPU elapsed queries. CPU callback duration includes instrumentation. No phone, thermal, full-frame/INP or production proof.' };
const summary = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: sorted.length, median: sorted[Math.floor(sorted.length / 2)] ?? null,
    p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))] ?? null };
};

function installMeasurements(quality) {
  localStorage.setItem('crystal_render_quality', quality);
  const state = window.__renderCost = { active: false, gl: null, ext: null, draws: 0, rows: [], pending: [], disjoint: 0, limit: 160 };
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...args) {
    const context = getContext.apply(this, args);
    if (args[0] === 'webgl2' && context && !state.gl) {
      state.gl = context;
      state.ext = context.getExtension('EXT_disjoint_timer_query_webgl2');
    }
    return context;
  };
  for (const method of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
    const original = WebGL2RenderingContext.prototype[method];
    WebGL2RenderingContext.prototype[method] = function (...args) {
      if (this === state.gl) state.draws++;
      return original.apply(this, args);
    };
  }
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => raf(time => {
    const { gl, ext } = state;
    const measure = state.active && gl && ext && state.rows.length + state.pending.length < state.limit && !gl.getQuery(ext.TIME_ELAPSED_EXT, gl.CURRENT_QUERY);
    const query = measure ? gl.createQuery() : null;
    const draws = state.draws, start = performance.now();
    if (query) gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    try { callback(time); }
    finally {
      if (query) {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        const work = state.draws - draws;
        if (work) state.pending.push({ query, draws: work, cpuCallbackMs: performance.now() - start });
        else gl.deleteQuery(query);
      }
    }
  });
  // Poll only after returning to the browser. Never block on unavailable GPU results.
  setInterval(() => {
    const { gl, ext } = state;
    if (!gl || !ext || !state.pending.length) return;
    if (gl.getParameter(ext.GPU_DISJOINT_EXT)) {
      state.disjoint++;
      for (const item of state.pending) gl.deleteQuery(item.query);
      state.pending = []; state.rows = []; state.active = false;
      return;
    }
    state.pending = state.pending.filter(item => {
      if (!gl.getQueryParameter(item.query, gl.QUERY_RESULT_AVAILABLE)) return true;
      const gpuMs = gl.getQueryParameter(item.query, gl.QUERY_RESULT) / 1e6;
      state.rows.push({ gpuMs, cpuCallbackMs: item.cpuCallbackMs, draws: item.draws });
      gl.deleteQuery(item.query);
      return false;
    });
  }, 20);
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const screen = await fs.readFile('frontend/public/renders/studio-screen.png');
  const browser = await chromium.launch({ executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE, headless: true });
  try {
    const profiles = [['before', before, 'automatic'], ['after', after, 'automatic'], ['after', after, 'low'], ['after', after, 'high']];
    for (const [version, base, quality] of profiles) for (const width of [390, 1440]) {
      if (quality !== 'automatic' && width !== 1440) continue;
      for (const model of ['opening', 'laptop', 'monitor', 'phone']) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
        await context.addInitScript(installMeasurements, quality);
        const project = { id: 'qa-render-cost', slug: 'qa-render-cost', featured: false, sortOrder: 0,
          content: { title: 'Rendering measurement fixture', category: 'WEBSITE', summary: 'Local synthetic measurement, not a client publication.', overview: '', approach: '', outcome: '', liveUrl: '', technologies: [], displayDevice: model === 'opening' ? 'laptop' : model, coverMediaId: 'qa-render-screen', coverAlt: 'Original studio interface used for measurement', gallery: [] } };
        await context.route('**/api/projects**', route => route.fulfill({ json: route.request().url().endsWith('/qa-render-cost') ? project : [] }));
        await context.route('**/api/media/qa-render-screen', route => route.fulfill({ contentType: 'image/png', body: screen }));
        const page = await context.newPage(), errors = [], mutations = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => { if (request.url().includes('/api/') && request.method() !== 'GET') mutations.push(request.method()); });
        try {
          await page.goto(base + (model === 'opening' ? '/' : '/portfolio/qa-render-cost'));
          const stage = page.locator(model === 'opening' ? '.crystal-opening' : '.studio-device-stage');
          if (model !== 'opening') await stage.getByRole('button', { name: /Explore this project in 3D/ }).click();
          await stage.locator('canvas').waitFor({ timeout: 20000 });
          if (model === 'opening') await page.locator('.crystal-opening[data-ready="true"]').waitFor();
          else await stage.getByRole('button', { name: 'Rotate left', exact: true }).and(page.locator(':enabled')).waitFor();
          await stage.scrollIntoViewIfNeeded();
          const operation = async () => {
            if (model === 'opening') { await stage.locator('.opening-surface').focus(); await page.keyboard.press('Enter'); }
            else if (model === 'laptop') await stage.getByRole('button', { name: 'Animate', exact: true }).click();
            else for (let index = 0; index < 24; index++) { await stage.getByRole('button', { name: index % 2 ? 'Rotate right' : 'Rotate left', exact: true }).click(); await page.waitForTimeout(40); }
          };
          // Warm each actual operation before recording; never interpret shader compilation as steady-state cost.
          await operation();
          if (model === 'opening') { await page.locator('.crystal-opening[data-phase="open"]').waitFor(); await stage.locator('.opening-surface').focus(); await page.keyboard.press('Enter'); await page.locator('.crystal-opening[data-phase="closed"]').waitFor(); }
          else if (model === 'laptop') { await page.waitForTimeout(2800); await stage.getByRole('button', { name: 'Reset', exact: true }).click(); }
          await page.evaluate(() => { const state = window.__renderCost; if (!state.ext) throw Error('GPU elapsed queries unavailable'); state.gl.getParameter(state.ext.GPU_DISJOINT_EXT); state.rows = []; state.draws = 0; state.active = true; });
          await operation();
          if (model === 'opening' || model === 'laptop') await page.waitForTimeout(2800);
          await page.evaluate(() => { window.__renderCost.active = false; });
          await page.waitForFunction(() => window.__renderCost.pending.length === 0, null, { timeout: 10000 });
          const data = await page.evaluate(() => {
            const state = window.__renderCost, gl = state.gl, debug = gl.getExtension('WEBGL_debug_renderer_info'), canvas = gl.canvas;
            return { rows: state.rows, disjoint: state.disjoint, glError: gl.getError(), renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
              canvasCount: document.querySelectorAll('canvas').length, width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight, tier: canvas.dataset.renderTier ?? 'legacy', heap: performance.memory?.usedJSHeapSize ?? null };
          });
          assert.equal(data.disjoint, 0, 'Disjoint GPU results must be rejected');
          assert.equal(data.glError, 0); assert.ok(data.rows.length >= 12, 'Require actual draw-bearing GPU queries');
          assert.ok(data.rows.every(row => row.gpuMs > 0 && Number.isFinite(row.gpuMs)));
          assert.equal(data.canvasCount, 1); assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
          const sample = { version, quality, viewportWidth: width, model, ...data, gpuMs: summary(data.rows.map(row => row.gpuMs)), cpuCallbackMs: summary(data.rows.map(row => row.cpuCallbackMs)), drawsPerCallback: summary(data.rows.map(row => row.draws)) };
          report.samples.push(sample);
          console.log(`${version} ${width} ${quality} ${model}: GPU ${sample.gpuMs.median.toFixed(3)}ms median / ${sample.gpuMs.p95.toFixed(3)}ms p95, ${sample.gpuMs.count} valid queries`);
          await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
        } finally { await context.close(); }
      }
    }
  } catch (error) { report.errors.push(String(error)); throw error; }
  finally { await browser.close(); await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); }
  console.log(JSON.stringify({ samples: report.samples.length, errors: report.errors.length }));
})().catch(error => { console.error(error); process.exitCode = 1; });
