/* Actual saved local project and normal authenticated team session. No API mocks. */
const {chromium} = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const {authenticate, origin} = require('./local/codex-session.cjs');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const output = '.codex-runtime/qa/clare-local';
const report = {checks: [], errors: [], failedResponses: [], scope: 'Actual local publication, public responsive pages and normal limited Codex team session. No production or provider actions.'};
function check(name, value) {assert.ok(value, name); report.checks.push(name);}
(async () => {
  await fs.mkdir(output, {recursive: true});
  const browser = await chromium.launch({headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  await context.addInitScript(() => localStorage.setItem('crystal_prism_visit_v1', 'completed'));
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {if (response.status() >= 400 && /\/api\/(projects|media)/.test(response.url())) report.failedResponses.push({url: response.url(), status: response.status()});});
  let client;
  try {
    const project = await (await page.request.get(origin + '/api/projects/clares-life-celebrations')).json();
    check('Only approved Clare project is publicly listed', (await (await page.request.get(origin + '/api/projects')).json()).every(item => item.slug === project.slug));
    check('Desktop and mobile screenshots have distinct real media IDs', project.content.coverMediaId === project.content.screens.desktop.mediaId && project.content.screens.mobile.mediaId !== project.content.coverMediaId);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({width, height: 1000});
      await page.goto(origin + '/portfolio');
      const link = page.getByRole('link', {name: 'Explore ' + project.content.title, exact: true});
      await link.waitFor();
      check(width + ' portfolio displays approved project', await link.isVisible());
      await page.getByRole('button', {name: 'Website', exact: true}).click();
      await link.waitFor();
      await link.click();
      await page.getByRole('heading', {level: 1, name: project.content.title}).waitFor();
      check(width + ' public case study has correct content', (await page.locator('#project-outcome').innerText()).includes(project.content.outcome));
      check(width + ' live website link is correct', await page.getByRole('link', {name: /Visit live website/}).getAttribute('href') === 'https://clareslifecelebrations.com');
      for (const [label, slot] of [['Laptop', 'desktop'], ['Desktop', 'desktop'], ['Mobile', 'mobile']]) {
        const button = page.getByRole('button', {name: label, exact: true});
        await button.click();
        await page.waitForFunction(node => node.getAttribute('aria-pressed') === 'true', await button.elementHandle());
        // Verify actual DOM image pixels, including image switching rather than just tab state.
        const mediaId = project.content.screens[slot].mediaId;
        await page.waitForFunction(id => [...document.querySelectorAll('.project-device-preview img')].some(img => img.src.includes(id) && img.complete && img.naturalWidth > 0), mediaId);
        check(width + ' ' + label + ' loads real screenshot', true);
      }
      check(width + ' no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check(width + ' cover loads actual desktop pixels', await page.locator('.studio-project-cover img').evaluate(img => img.complete && img.naturalWidth === 1440));
      await page.screenshot({path: `${output}/case-${width}.png`, fullPage: true});
      await page.reload(); await page.getByRole('heading', {level: 1, name: project.content.title}).waitFor();
      check(width + ' direct route reload works', true);
    }
    await page.goto(origin + '/');
    await page.locator(`a[href*="/portfolio/${project.slug}"]`).first().waitFor();
    check('Home features Clare with a working case study link', true);
    client = await authenticate();
    await context.addCookies(client.cookies());
    await page.setViewportSize({width: 1440, height: 1000});
    await page.goto(origin + '/team');
    await page.getByRole('button', {name: 'Business projects', exact: true}).waitFor();
    await page.getByRole('button', {name: 'Business projects', exact: true}).click();
    await page.getByText(project.content.title, {exact: true}).first().waitFor();
    check('Codex normal team UI opens published business project', true);
    await page.screenshot({path: `${output}/codex-projects.png`});
    check('No browser runtime errors', report.errors.length === 0);
    check('No failed public project/media requests', report.failedResponses.length === 0);
    report.passed = true;
  } catch (error) {report.failure = error.stack; await page.screenshot({path: `${output}/failure.png`, fullPage: true}).catch(() => {}); throw error;}
  finally {
    if (client) await client.mutate('/api/team/auth/logout', 'POST', {});
    await fs.writeFile(`${output}/browser-report.json`, JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log('CLARE_LOCAL_BROWSER_PASS:', report.checks.length);
})().catch(error => {console.error(error); process.exitCode = 1;});
