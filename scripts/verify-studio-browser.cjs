/* Run with an existing Playwright installation; no dependencies are installed. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:5175';
const output = path.resolve('.codex-runtime/qa/studio-pc');
const report = { base, checks: [], errors: [], runtime: 'installed Edge, emulated viewports' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CRYSTAL_BROWSER_EXECUTABLE ? { executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE } : { channel: 'msedge' }) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => report.errors.push(error.message));
    for (const route of ['/about', '/']) {
      await page.goto(base + route);
      await page.locator('h1').waitFor();
      const selector = page.getByRole('group', { name: 'Explore the project stages' });
      for (const title of ['Discover', 'Create', 'Refine', 'Launch']) {
        const button = selector.getByRole('button', { name: new RegExp(title) });
        await button.focus(); await page.keyboard.press('Enter');
        check(`${route} keyboard selects ${title}`, await button.getAttribute('aria-pressed') === 'true');
        check(`${route} ${title} shows deliverable and feedback`, await page.locator('.collaboration-output').isVisible() && (await page.locator('.collaboration-chapter').innerText()).includes('Where feedback fits'));
      }
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        check(`${route} fits at ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
        await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
        await page.getByRole('button', { name: theme, exact: true }).click();
        check(`${route} ${theme} fits`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
    }
    await page.goto(base + '/about');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('.founder-art').scrollIntoViewIfNeeded();
      check(`Selected Liquid Light still loads at ${width}`, await page.locator('.founder-art img').evaluate(image => image.complete && image.naturalWidth > 0));
      check(`Studio identifies the selected original artwork at ${width}`, (await page.locator('.founder-art figcaption').innerText()).includes('Liquid Light'));
      await page.screenshot({ path: path.join(output, `about-${width}.png`), fullPage: true });
    }
    await page.getByRole('link', { name: 'Meet me with an idea ↗', exact: true }).click();
    await page.getByRole('button', { name: 'General question', exact: true }).and(page.locator('[aria-pressed="true"]')).waitFor();
    check('Founder conversation opens general intent', await page.getByRole('button', { name: 'General question', exact: true }).getAttribute('aria-pressed') === 'true');
    await page.goto(base + '/about');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    check('Studio uses no canvas with reduced motion', await page.locator('canvas').count() === 0);
    check('No uncaught browser errors', report.errors.length === 0);
    console.log('STUDIO_BROWSER_PASS:', report.checks.length, 'checks; evidence:', output);
  } catch (error) { report.failure = String(error); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
