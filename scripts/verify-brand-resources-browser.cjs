/* Returning-visitor feature regression; first-visit Companion is verified separately. */
/* Repeated real WebGL acquisition/retirement; read-only local API fixtures.
   Counters observe native calls without retaining GPU objects/canvases or adding a render loop. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.match(base, /^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const output = path.resolve('.codex-runtime/qa/brand-resources-studio-20261024');
const report = { candidateSha256:process.env.CRYSTAL_QA_CANDIDATE_SHA256, checks: [], cycles: [], errors: [], scope: 'Installed Edge, repeated actual liquid/original WebGL opens, changes, idle and retirement in one document. Native allocation/deletion/context-loss observations; not GPU-driver memory/thermal or physical-device certification.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    localStorage.setItem('crystal_prism_visit_v1', JSON.stringify({status:'completed',version:1}));
    const observed = new WeakSet(), tracked = new WeakSet();
    const state = { records: [], peakCanvases: 0 }; window.__brandResources = state;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      const gl = getContext.apply(this, args);
      if (!gl || !['webgl', 'webgl2', 'experimental-webgl'].includes(args[0]) || observed.has(gl)) return gl;
      observed.add(gl);
      const record = { id: state.records.length, lost: false, draws: 0, created: {}, deleted: {} }; state.records.push(record);
      this.addEventListener('webglcontextlost', () => { record.lost = true; });
      for (const kind of ['Buffer', 'Texture', 'Program', 'Shader', 'Framebuffer', 'Renderbuffer', 'VertexArray']) {
        record.created[kind] = 0; record.deleted[kind] = 0;
        for (const verb of ['create', 'delete']) {
          const name = verb + kind, original = gl[name]; if (typeof original !== 'function') continue;
          gl[name] = function (...values) {
            const result = original.apply(this, values);
            if (verb === 'create' && result) { tracked.add(result); record.created[kind]++; }
            if (verb === 'delete' && values[0] && tracked.has(values[0])) { tracked.delete(values[0]); record.deleted[kind]++; }
            return result;
          };
        }
      }
      for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
        const original = gl[name]; if (typeof original !== 'function') continue;
        gl[name] = function (...values) { record.draws++; return original.apply(this, values); };
      }
      return gl;
    };
    new MutationObserver(() => { state.peakCanvases = Math.max(state.peakCanvases, document.querySelectorAll('canvas').length); }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET');
    const endpoint = new URL(route.request().url()).pathname;
    return route.fulfill({ json: endpoint === '/api/site/privacy/status' ? { ready: false } : [] });
  });
  const snapshot = () => page.evaluate(() => structuredClone(window.__brandResources));
  try {
    await page.goto(base + '/about'); await page.locator('main h1').waitFor();
    const header = page.locator('header'), trigger = header.locator('.brand-crystal-button');
    for (let cycle = 0; cycle < 12; cycle++) {
      await trigger.click(); await page.waitForFunction(() => document.querySelector('header .brand-scene')?.dataset.ready === 'true');
      if (cycle % 3 === 2) {
        await header.getByRole('button', { name: 'Original crystal', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('header .brand-scene')?.dataset.ready === 'true');
      } else {
        await header.getByRole('button', { name: 'Liquid Light', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('header .brand-scene')?.dataset.ready === 'true');
        await header.getByRole('button', { name: cycle % 2 ? 'Rose' : 'Pearl', exact: true }).click();
        const range = header.getByRole('slider', { name: 'Rotate the crystal', exact: true });
        await range.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Home');
      }
      const action = header.getByRole('button', { name: /^(Bring it together|Unfold the crystal)$/ });
      await action.click(); await action.click();
      check('Cycle' + cycle + ' owns one visible canvas', await page.locator('canvas').count() === 1);
      await page.waitForFunction(() => window.__brandResources.records.some(item => !item.lost && item.draws > 0));
      // No timing benchmark: wait for the actual demand-render loop to become idle.
      await page.waitForFunction(() => {
        const state = window.__brandResources, draws = state.records.reduce((n, r) => n + r.draws, 0), now = performance.now();
        if (!state.lastIdle || state.lastIdle.draws !== draws) { state.lastIdle = { draws, since: now }; return false; }
        return now - state.lastIdle.since >= 350;
      }, undefined, { timeout: 7000 });
      check('Cycle' + cycle + ' reaches demand-render idle', true);
      await header.getByRole('button', { name: 'Close logo experience', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('canvas').length === 0 && window.__brandResources.records.every(item => item.lost), undefined, { timeout: 7000 });
      const state = await snapshot(); report.cycles.push({ cycle, ...state });
      check('Cycle' + cycle + ' releases native contexts and retains trigger focus', state.records.every(item => item.lost) && await trigger.evaluate(el => el === document.activeElement));
    }
    report.final = await snapshot();
    check('No overlapping expensive canvas during repeated variant changes', report.final.peakCanvases <= 1);
    check('Both geometry and program allocations were observed', report.final.records.some(r => r.created.Buffer > 0 && r.created.Program > 0));
    check('Explicit GPU object deletions observed', report.final.records.some(r => r.deleted.Buffer > 0 && r.deleted.Program > 0));
    check('All acquired contexts retired and browser errors empty', report.final.records.length >= 12 && report.final.records.every(r => r.lost) && report.errors.length === 0);
    console.log('BRAND_RESOURCES_PASS:', report.checks.length, 'checks;', report.final.records.length, 'retired contexts');
  } catch (error) { report.failure = String(error); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
