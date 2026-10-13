/* Original workflow studies: real routes, keyboard selection and labelled local browser evidence. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:5175';
assert.ok(/^http:\/\/127\.0\.0\.1:(5175|8084)$/.test(base), 'Only an explicit local QA runtime is allowed');
const output = path.resolve('.codex-runtime/qa/illustrations-pc');
const report = { base, runtime: 'Installed Edge; six emulated widths, five appearances, native keyboard and synthetic enlarged text', checks: [], errors: [] };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const studies = [
  { route: '/about', selector: '.workspace-layers', name: 'Studio workspace' },
  { route: '/support', selector: '.support-map', name: 'Support map' },
  { route: '/services?intent=website', selector: '.service-example', name: 'Website example' },
  { route: '/services?intent=app', selector: '.service-example', name: 'App example' },
  { route: '/services?intent=system', selector: '.service-example', name: 'System example' },
];
function luminance(colour) { return colour.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [ .2126, .7152, .0722 ][index], 0); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(error.message));
    const writes = []; page.on('request', request => { if (request.method() !== 'GET' && request.url().includes('/api/')) writes.push(request.url()); });
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.goto(base + '/about'); await page.locator('main h1').waitFor();
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      await page.getByRole('button', { name: theme, exact: true }).click();
      for (const study of studies) {
        await page.goto(base + study.route); await page.locator(study.selector).waitFor();
        for (const width of [320, 390, 768, 1024, 1440, 1920]) {
          await page.setViewportSize({ width, height: 900 });
          check(`${theme} / ${study.name} / ${width}px normal-flow readable bounds`, await page.locator(study.selector).evaluate(root => {
            const box = root.getBoundingClientRect();
            return document.documentElement.scrollWidth <= innerWidth + 1 && box.left >= -1 && box.right <= innerWidth + 1 && [...root.querySelectorAll('h2,h3,p,figcaption,li')].every(node => { const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.left >= -1 && rect.right <= innerWidth + 1 && node.scrollWidth <= node.clientWidth + 1; });
          }));
          check(`${theme} / ${study.name} / ${width}px static HTML without fake controls or canvas`, await page.locator(study.selector).evaluate(root => root.querySelectorAll('canvas,video,button,input,select,a,[tabindex]').length === 0 && [...root.querySelectorAll('*')].every(node => getComputedStyle(node).animationName === 'none')) && await page.locator('canvas').count() === 0);
          // The fixed global header would overlap an auto-scrolled element capture.
          // Hide it in diagram-only exports; all layout/keyboard checks use the real header.
          if (['Dark', 'Light'].includes(theme) && [390, 1440].includes(width)) await page.locator(study.selector).screenshot({ path: path.join(output, `${study.name.replaceAll(' ', '-')}-${theme}-${width}.png`), style: '.studio-header { visibility: hidden; }' });
        }
        const colours = await page.locator(study.selector).evaluate(root => [...root.querySelectorAll('h2,h3,p,figcaption,.workspace-detail,.workspace-number,.workflow-node,.interface-kicker,.interface-chrome,.interface-pages > span,.interface-app li b,.interface-system li b')].map(node => {
          let parent = node, background = 'rgba(0, 0, 0, 0)';
          while (parent) { background = getComputedStyle(parent).backgroundColor; if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') break; parent = parent.parentElement; }
          return { colour: getComputedStyle(node).color, background, text: node.textContent.trim().slice(0, 50) };
        }));
        const contrast = colours.map(pair => { const a = luminance(pair.colour), b = luminance(pair.background); return { text: pair.text, ratio: (Math.max(a,b)+.05)/(Math.min(a,b)+.05) }; });
        check(`${theme} / ${study.name} text contrast at least 4.5:1`, contrast.every(pair => pair.ratio >= 4.5));
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await page.goto(base + '/services?intent=website');
    await page.locator('#packageSelection').selectOption('Basic');
    const services = page.getByRole('group', { name: 'Choose a service', exact: true });
    for (const [name, kind] of [['App','app'], ['Bespoke system','system'], ['Website','website']]) {
      const button = services.getByRole('button', { name, exact: true }); await button.focus(); await page.keyboard.press('Space');
      await page.locator(`.service-interface-${kind}`).waitFor();
      check(`Native keyboard selects ${name} and its explanatory example`, await button.getAttribute('aria-pressed') === 'true' && (await page.locator('.service-interface figcaption').innerText()).includes(`Illustrative ${kind} flow`));
    }
    check('Service example switching preserves the real website starting-point selection', await page.locator('#packageSelection').inputValue() === 'Basic');
    check('Examples explicitly limit client/package claims', (await page.locator('.service-example-note').innerText()).includes('not a client project or a list of package inclusions'));
    await page.goto(base + '/support');
    check('Support map uses a real three-step list and limits ticket/response claims', await page.locator('.support-map ol > li').count() === 3 && (await page.locator('.support-map figcaption').innerText()).includes('rather than a live ticket status'));
    await page.getByRole('link', { name: 'Request support ↗', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Existing-client support', exact: true }).waitFor();
    check('Support diagram retains the original enquiry path and intent', await page.getByRole('button', { name: 'Existing-client support', exact: true }).getAttribute('aria-pressed') === 'true');
    for (const study of studies) {
      await page.goto(base + study.route); await page.locator(study.selector).waitFor(); await page.setViewportSize({ width: 320, height: 900 });
      await page.locator(study.selector).evaluate(root => { const nodes = [...root.querySelectorAll('*')].filter(node => [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim())); const sizes = nodes.map(node => getComputedStyle(node).fontSize); nodes.forEach((node,index) => node.style.fontSize = `${parseFloat(sizes[index])*2}px`); });
      check(`${study.name} synthetic doubled text remains readable and bounded at 320`, await page.locator(study.selector).evaluate(root => document.documentElement.scrollWidth <= innerWidth + 1 && [...root.querySelectorAll('h2,h3,p,figcaption,li')].every(node => node.scrollWidth <= node.clientWidth + 1)));
    }
    await page.goto(base + '/services?intent=system'); await page.emulateMedia({ reducedMotion: 'no-preference' });
    check('Illustrations stay static with full system motion', await page.locator('.service-example').evaluate(root => [...root.querySelectorAll('*')].every(node => getComputedStyle(node).animationName === 'none')));
    await page.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await page.getByRole('checkbox', { name: 'Reduce effects', exact: true }).check();
    check('App Reduce effects retains the entire static example', await page.locator('.service-example').isVisible() && await page.locator('.service-interface-system').isVisible());
    check('No API writes or uncaught browser errors', writes.length === 0 && report.errors.length === 0);
    console.log(`ILLUSTRATIONS_BROWSER_PASS: ${report.checks.length} checks; ${output}`);
  } catch (error) { report.failure = String(error); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
