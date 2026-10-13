/* Labelled shader-driver fault fixtures; real local scenes, routes and native controls. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8084|5175)$/);
const report = { base, checks: [], errors: [], scope: 'Local Edge, labelled delayed/failed/missing parallel-compile capability; emulated widths, not physical-device certification.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE, headless: true });
  try {
    for (const width of [390, 1440]) for (const mode of ['delayed', 'cancel', 'failure', 'linkfailure', 'unavailable', 'quality']) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(mode => {
        window.__startupFixture = { mode, hold: mode === 'delayed' || mode === 'cancel', polls: 0, deletedPrograms: 0, disposedQueries: 0 };
        const proto = WebGL2RenderingContext.prototype;
        const deleteProgram = proto.deleteProgram;
        proto.deleteProgram = function (program) { window.__startupFixture.deletedPrograms++; return deleteProgram.call(this, program); };
        const getExtension = proto.getExtension;
        proto.getExtension = function (name) {
          if (name === 'KHR_parallel_shader_compile' && window.__startupFixture.mode === 'unavailable') return null;
          return getExtension.call(this, name);
        };
        const getParameter = proto.getProgramParameter;
        proto.getProgramParameter = function (...args) {
          if (!this.isProgram(args[0])) window.__startupFixture.disposedQueries++;
          if (args[1] === this.LINK_STATUS && window.__startupFixture.mode === 'linkfailure' && window.__startupFixture.polls > 0) return false;
          if (args[1] === 0x91B1) {
            window.__startupFixture.polls++;
            if (window.__startupFixture.mode === 'failure') throw new Error('Labelled shader completion query failure');
            if (window.__startupFixture.hold) return false;
          }
          return getParameter.apply(this, args);
        };
      }, mode);
      const page = await context.newPage();
      const errors = [], writes = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (request.url().startsWith(base + '/api/') && request.method() !== 'GET') writes.push(request.method());
      });
      try {
        await page.goto(base, { waitUntil: 'domcontentloaded' });
        const stage = page.locator('.crystal-opening');
        const label = `${width} ${mode}`;
        if (mode === 'delayed' || mode === 'cancel') {
          await page.waitForFunction(() => window.__startupFixture.polls >= 2);
          check(`${label}: live readiness waits for shaders`, await stage.getAttribute('data-ready') === 'false');
          check(`${label}: still artwork remains visible`, await stage.locator('.opening-poster').evaluate(node => Number(getComputedStyle(node).opacity) === 1));
          check(`${label}: unready pulse control stays disabled`, await page.getByRole('button', { name: 'Pulse light', exact: true }).isDisabled());
          if (mode === 'delayed') {
            await page.evaluate(() => { window.__startupFixture.hold = false; });
            await stage.locator('canvas').waitFor();
            await page.locator('.crystal-opening[data-ready="true"]').waitFor();
            check(`${label}: completed shaders expose one actual canvas`, await page.locator('canvas').count() === 1);
            check(`${label}: pulse becomes usable after the first live draw`, await page.getByRole('button', { name: 'Pulse light', exact: true }).isEnabled());
          } else {
            await page.locator('footer a[href="/about"]').first().click();
            await page.waitForURL(base + '/about');
            await page.waitForTimeout(150);
            const polls = await page.evaluate(() => window.__startupFixture.polls);
            await page.waitForTimeout(250);
            check(`${label}: unmount stops shader polling`, polls === await page.evaluate(() => window.__startupFixture.polls));
            check(`${label}: navigation releases the canvas`, await page.locator('canvas').count() === 0);
          }
        } else if (mode === 'quality') {
          await page.locator('.crystal-opening[data-ready="true"]').waitFor();
          const canvas = await stage.locator('canvas').elementHandle();
          await page.evaluate(() => { window.__startupFixture.hold = true; });
          await page.getByRole('button', { name: 'Choose appearance' }).click();
          await page.getByLabel('3D detail').selectOption('high');
          await page.keyboard.press('Escape');
          await stage.locator('canvas[data-preparing="true"]').waitFor({ state: 'attached' });
          check(`${label}: quality preparation retains the existing canvas`, await stage.locator('canvas').evaluate((node, previous) => node === previous, canvas));
          check(`${label}: detail change restores visible still artwork`, await stage.locator('.opening-poster').evaluate(node => Number(getComputedStyle(node).opacity) === 1));
          check(`${label}: cleared drawing buffer stays hidden`, await canvas.evaluate(node => getComputedStyle(node).visibility === 'hidden'));
          check(`${label}: preparation does not reset parent readiness`, await stage.getAttribute('data-ready') === 'true');
          await page.evaluate(() => { window.__startupFixture.hold = false; });
          await stage.locator('canvas[data-preparing="false"]').waitFor();
          check(`${label}: first replacement draw restores live visibility`, await stage.locator('canvas').evaluate(node => getComputedStyle(node).visibility === 'visible'));
          check(`${label}: replacement draw hides the fallback`, await stage.locator('.opening-poster').evaluate(node => Number(getComputedStyle(node).opacity) === 0));
          check(`${label}: quality change retires old native programs`, await page.evaluate(() => window.__startupFixture.deletedPrograms > 0));
          check(`${label}: no status query touches a disposed native program`, await page.evaluate(() => window.__startupFixture.disposedQueries === 0));
          await canvas.dispose();
        } else if (mode === 'failure' || mode === 'linkfailure') {
          await page.getByRole('button', { name: 'Retry 3D', exact: true }).waitFor();
          check(`${label}: failed shader query returns to readable fallback`, await stage.getAttribute('data-ready') === 'false' && await page.locator('canvas').count() === 0);
          await page.evaluate(() => { window.__startupFixture.mode = 'normal'; window.__startupFixture.hold = false; });
          await page.getByRole('button', { name: 'Retry 3D', exact: true }).click();
          await page.locator('.crystal-opening[data-ready="true"]').waitFor();
          check(`${label}: native retry recovers a live scene`, await page.locator('canvas').count() === 1);
        } else {
          await page.locator('.crystal-opening[data-ready="true"]').waitFor();
          check(`${label}: unsupported parallel compilation still renders`, await page.locator('canvas').count() === 1);
          check(`${label}: unsupported capability performs no completion polling`, await page.evaluate(() => window.__startupFixture.polls) === 0);
        }
        check(`${label}: no uncaught browser errors`, errors.length === 0);
        check(`${label}: no API mutation`, writes.length === 0);
      } finally { report.errors.push(...errors); await context.close(); }
    }
    console.log(`SCENE_STARTUP_BROWSER_PASS: ${report.checks.length} checks`);
  } finally {
    await browser.close();
    const output = path.resolve('.codex-runtime/qa/startup-pc');
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
