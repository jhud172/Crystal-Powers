/* Returning-visitor feature regression; first-visit Companion is verified separately. */
/* Local built frontend only; synthetic GETs, no business or provider writes. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const output = path.resolve('.codex-runtime/qa/prism-depth-20261024');
const report = { candidateSha256:process.env.CRYSTAL_QA_CANDIDATE_SHA256, checks: [], errors: [], scope: 'Installed Edge, built preview, synthetic privacy/empty portfolio GETs; viewport emulation, not physical-device performance or deployment acceptance.' };
function check(name, result) { assert.ok(result, name); report.checks.push(name); }
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => {
    const locations = new WeakMap();
    const locate = WebGL2RenderingContext.prototype.getUniformLocation;
    const write = WebGL2RenderingContext.prototype.uniform1f;
    WebGL2RenderingContext.prototype.getUniformLocation = function(program, name) {
      const location = locate.call(this, program, name);
      if (location && name === 'prismPulse') locations.set(location, name);
      return location;
    };
    WebGL2RenderingContext.prototype.uniform1f = function(location, value) {
      if (locations.has(location)) window.__prismOpticalPulse = value;
      return write.call(this, location, value);
    };
    localStorage.setItem('crystal_prism_visit_v1', JSON.stringify({status:'completed',version:1}));
    // Observe actual canvas draw positions without exposing particle state in production.
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains('prism-stars')) { window.__prismDrawnStars = []; window.__prismDrawCount = (window.__prismDrawCount || 0) + 1; }
      return clear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.arc = function (x, y, ...args) {
      if (this.canvas.classList.contains('prism-stars')) window.__prismDrawnStars?.push({ x, y });
      return arc.call(this, x, y, ...args);
    };
  });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET');
    return route.fulfill({ json: new URL(route.request().url()).pathname === '/api/projects' ? [] : { ready: false } });
  });
  const phase = value => page.waitForFunction(value => document.querySelector('.crystal-opening')?.dataset.phase === value, value);
  const gate = page.locator('.crystal-opening');
  const trigger = gate.locator('.opening-actions button').first();
  try {
    await page.goto(base);
    check('Wave stays viewport-fixed throughout arrival and fast scrolling', await page.evaluate(async () => {
      const wave = document.querySelector('.liquid-light-art');
      if (!wave) return false;
      for (let index = 0; index < 12; index++) {
        window.scrollTo({ top: index < 6 ? 300 : 600, behavior: 'instant' });
        await new Promise(requestAnimationFrame);
        if (getComputedStyle(wave).position !== 'fixed' || Math.abs(wave.getBoundingClientRect().top) > 1) return false;
      }
      return true;
    }));
    await gate.scrollIntoViewIfNeeded();
    check('Prism is available alongside the retained Liquid Light hero', await page.locator('.liquid-hero').count() === 1);
    const wave = page.locator('.liquid-light-art');
    check('Wave is fixed behind the scrolling page', await wave.evaluate(el => getComputedStyle(el).position === 'fixed' && Math.abs(el.getBoundingClientRect().top) < 1));
    const bounds = await gate.boundingBox();
    check('Prism spans the page width and at least one viewport', bounds.width > 1400 && bounds.height >= 1000);
    const stars = gate.locator('canvas.prism-stars');
    await page.waitForFunction(() => Number(document.querySelector('canvas.prism-stars')?.getAttribute('data-visible-stars')) > 0);
    check('Bounded animated star population is visible at rest', Number(await stars.getAttribute('data-stars')) === 240);
    const observedFrames = await page.evaluate(() => window.__prismDrawCount);
    await page.waitForFunction(before => window.__prismDrawCount > before + 3, observedFrames);
    const resting = await page.evaluate(() => window.__prismDrawnStars);
    await page.waitForTimeout(700);
    const drifting = await page.evaluate(() => window.__prismDrawnStars);
    const movement = resting.map(from => {
      const to = drifting.reduce((closest, point) => Math.hypot(point.x-from.x, point.y-from.y) < Math.hypot(closest.x-from.x, closest.y-from.y) ? point : closest, drifting[0]);
      return { x: to.x-from.x, y: to.y-from.y, distance: Math.hypot(to.x-from.x,to.y-from.y) };
    }).filter(step => step.distance > .1 && step.distance < 8);
    report.drift = { sampled: resting.length, moving: movement.length, frames: await page.evaluate(() => window.__prismDrawCount) };
    check('Ambient stars move slowly without pointer input', movement.length > 10);
    check('Stars drift independently in multiple directions', movement.some(step=>step.x>.1) && movement.some(step=>step.x<-.1) && movement.some(step=>step.y>.1) && movement.some(step=>step.y<-.1));
    const field = await stars.boundingBox();
    await page.mouse.move(field.x + field.width * .4, field.y + Math.min(350, field.height * .4));
    await page.waitForFunction(() => Number(document.querySelector('canvas.prism-stars')?.getAttribute('data-repelled')) > 0);
    check('Mouse repulsion reaches real star particles without intercepting controls', true);
    check('Still artwork loads before opt-in WebGL' , await gate.locator('img').evaluate(el => el.complete && el.naturalWidth > 0) && await page.locator('.opening-canvas canvas').count() === 0);
    const initialSurface = gate.locator('.opening-surface');
    const initialBounds = await initialSurface.boundingBox();
    await page.mouse.move(initialBounds.x + initialBounds.width * .18, initialBounds.y + initialBounds.height * .4);
    await page.mouse.down();
    await page.mouse.move(initialBounds.x + initialBounds.width * .18 + 60, initialBounds.y + initialBounds.height * .4 + 20, { steps: 8 });
    check('Initial drag visibly transforms the artwork before WebGL is ready', await gate.locator('.opening-poster').evaluate(node => node.style.transform.includes('rotateY(0.42')));
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('.crystal-opening')?.dataset.ready === 'true');
    check('Initial drag prepares a visible closed scene without opening the projector', await gate.getAttribute('data-phase') === 'closed' && await page.locator('.opening-canvas canvas').count() === 1);
    await gate.screenshot({ path: path.join(output, 'initial-drag.png') });
    await trigger.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.crystal-opening')?.dataset.ready === 'true');
    await phase('opening');
    await page.waitForFunction(() => {
      const progress = Number(document.querySelector('canvas.prism-stars')?.getAttribute('data-progress'));
      return progress > .15 && progress < .8;
    });
    await gate.screenshot({ path: path.join(output, 'hyperjump-out.png') });
    await trigger.click(); await phase('closing');
    await trigger.click(); await phase('opening');
    await phase('open');
    check('Opening can reverse twice without losing its authored pose or readiness', await gate.getAttribute('data-ready') === 'true');
    const jumpStarted = Date.now();
    await page.waitForFunction(() => {
      const field = document.querySelector('canvas.prism-stars');
      return Number(field?.dataset.progress) > .6 && Number(field?.dataset.distantStars) > 5;
    });
    check('Distant stars are still rushing after the projector has opened', true);
    await gate.screenshot({ path: path.join(output, 'distant-rush.png') });
    await page.waitForFunction(() => document.querySelector('canvas.prism-stars')?.getAttribute('data-progress') === '1.000');
    check('Layered hyperjump continues beyond the crystal animation', Date.now() - jumpStarted > 1500);
    check('Hyperjump clears the field while projector is open', await stars.getAttribute('data-visible-stars') === '0');
    check('Only one active WebGL canvas' , await page.locator('.opening-canvas canvas').count() === 1);
    const interactive = gate.locator('.opening-surface');
    await interactive.scrollIntoViewIfNeeded();
    const hit = await interactive.boundingBox();
    await page.waitForTimeout(700);
    const projectedBefore = await gate.locator('.prism-projection').boundingBox();
    await page.mouse.move(hit.x + hit.width * .15, hit.y + hit.height / 2);
    await page.mouse.down(); await page.mouse.move(hit.x + hit.width * .15 + 70, hit.y + hit.height / 2 + 20, { steps: 12 }); await page.mouse.up();
    check('Glass canvas composites above the stationary hologram without intercepting input', await gate.evaluate(node => {
      const canvas = node.querySelector('.opening-canvas'), projection = node.querySelector('.prism-projection');
      return +getComputedStyle(canvas).zIndex > +getComputedStyle(projection).zIndex && getComputedStyle(canvas).pointerEvents === 'none';
    }));
    check('Hologram stays screen-aligned while the glass rotates', await gate.locator('.prism-projection').evaluate((node, before) => {
      const after = node.getBoundingClientRect(); const matrix = new DOMMatrix(getComputedStyle(node).transform); return Math.abs(after.x-before.x)<1 && Math.abs(after.y-before.y)<1 && matrix.a === 1 && matrix.d === 1 && matrix.b === 0 && matrix.c === 0;
    }, projectedBefore));
    check('Dragging the crystal keeps it open beneath the decorative stars', await gate.getAttribute('data-phase') === 'open');
    await page.waitForFunction(() => document.querySelector('.crystal-opening')?.dataset.ready === 'true');
    check('Dragged view retains the actual live WebGL stage', await page.locator('.opening-canvas canvas').count() === 1);
    await interactive.screenshot({ path: path.join(output, 'liquid-glass-angled.png') });
    await interactive.click({ position: { x: 30, y: 80 } });
    await phase('closing');
    const outgoingProgress = Number(await stars.getAttribute('data-progress'));
    await page.waitForTimeout(350);
    check('Closing reverses the existing depth journey without restarting it', Number(await stars.getAttribute('data-progress')) < outgoingProgress);
    check('Closing retains an inert hologram with an intermediate morph and fade', await gate.locator('.prism-projection').evaluate(node => node.inert && +getComputedStyle(node).opacity > 0 && +getComputedStyle(node).opacity < 1));
    await gate.screenshot({ path: path.join(output, 'closing-morph.png') });
    await phase('closed');
    check('Clicking the crystal closes and reverses the journey', true);
    await trigger.click(); await phase('open');
    await gate.getByRole('button', { name: 'Apps', exact: true }).click();
    check('Hologram is inside the scene rather than below it', await gate.locator('.opening-scene-frame').evaluate(frame => { const a=frame.getBoundingClientRect(), b=frame.querySelector('.prism-projection').getBoundingClientRect(); return b.top>a.top && b.bottom<a.bottom && b.left>a.left && b.right<a.right; }));
    check('Projected services remain interactive', await gate.getByRole('heading', { name: 'Ideas, made interactive.' }).isVisible());
    const surface = gate.locator('.opening-surface');
    await surface.focus(); await page.keyboard.press('ArrowRight');
    await gate.getByRole('button', { name: 'Reset view', exact: true }).click();
    await gate.getByRole('button', { name: 'Pulse light', exact: true }).click();
    await page.waitForFunction(() => parseFloat(document.querySelector('.opening-canvas canvas')?.style.getPropertyValue('--prism-pulse') || '0') > .5);
    check('Cyan pulse reaches the actual optical glass shader and visible glow', await gate.locator('.opening-canvas canvas').evaluate(canvas => window.__prismOpticalPulse > .45 && canvas.style.filter.includes('drop-shadow')));
    await gate.screenshot({ path: path.join(output, 'cyan-pulse.png') });
    await page.waitForFunction(() => document.querySelector('.opening-canvas canvas')?.style.getPropertyValue('--prism-pulse') === '0.0000');
    check('Pulse lights rise and fully settle', true);
    await gate.screenshot({ path: path.join(output, 'desktop-open.png') });
    await gate.locator('.prism-hologram').hover();
    const scrollBefore = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 150);
    await page.waitForFunction(before => scrollY > before + 50, scrollBefore);
    check('Page scrolls naturally while hovering the hologram', true);
    await surface.hover({ position: { x: 30, y: 80 } });
    const surfaceScrollBefore = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 100);
    await page.waitForFunction(before => scrollY > before + 30, surfaceScrollBefore);
    check('Page scrolls naturally while hovering the glass interface', true);
    await gate.getByRole('button', { name: 'Systems', exact: true }).focus();
    await page.keyboard.press('Escape'); await phase('closed');
    check('Escape releases WebGL and returns focus', await page.locator('.opening-canvas canvas').count() === 0 && await trigger.evaluate(el => el === document.activeElement));
    await page.waitForTimeout(250);
    await page.waitForFunction(() => document.querySelector('canvas.prism-stars')?.getAttribute('data-progress') === '0.000');
    check('Reverse jump restores nearby and distant stars without population growth', Number(await stars.getAttribute('data-visible-stars')) > 0 && Number(await stars.getAttribute('data-distant-stars')) > 0 && await stars.getAttribute('data-stars') === '240');
    check('Pause and resume stars controls are removed', await gate.getByRole('button', { name: /Pause stars|Resume stars/ }).count() === 0);
    const framesBefore = await page.evaluate(() => window.__prismDrawCount);
    await page.waitForFunction(before => window.__prismDrawCount > before + 3, framesBefore);
    check('Stars continue animating without a pause button', true);
    check('Dismissed stage does not reactivate itself' , await page.locator('.opening-canvas canvas').count() === 0);
    await trigger.click(); await phase('open');
    const contextLost = await gate.locator('.opening-canvas canvas').evaluate(canvas => {
      const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      extension.loseContext(); return true;
    });
    check('Browser exposes real WebGL context-loss simulation', contextLost);
    await gate.getByRole('button', { name: 'Retry 3D', exact: true }).waitFor();
    check('Lost context keeps accessible information and releases its canvas', await page.locator('.opening-canvas canvas').count() === 0 && await gate.getByRole('navigation', { name: 'Explore studio services' }).isVisible());
    await gate.getByRole('button', { name: 'Retry 3D', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.crystal-opening')?.dataset.ready === 'true');
    await phase('open');
    check('Explicit retry rebuilds one working canvas', await page.locator('.opening-canvas canvas').count() === 1);
    await page.keyboard.press('Escape'); await phase('closed');
    for (const label of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      await page.locator('#appearance-panel').getByRole('button', { name: label, exact: true }).click(); await page.keyboard.press('Escape');
      await gate.scrollIntoViewIfNeeded();
      check(label + ': page has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await gate.screenshot({ path: path.join(output, label.replaceAll(' ', '-') + '.png') });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await trigger.click(); await phase('open');
    check('Reduced motion keeps information without creating a canvas', await page.locator('.opening-canvas canvas').count() === 0 && await gate.getByRole('navigation', { name: 'Explore studio services' }).isVisible());
    await page.keyboard.press('Escape'); await phase('closed');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await trigger.click(); await phase('open');
      check(width + 'px: hologram remains within the viewport', await gate.locator('.prism-hologram').evaluate(node => { const b=node.getBoundingClientRect(); return b.left>=0 && b.right<=innerWidth+1 && node.scrollHeight>=node.clientHeight; }));
      check(width + 'px: information and controls fit', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (width < 768) check(width + 'px: compact policy uses still artwork', await page.locator('.opening-canvas canvas').count() === 0);
      await gate.screenshot({ path: path.join(output, 'width-' + width + '.png') });
      await page.keyboard.press('Escape'); await phase('closed');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await trigger.click(); await phase('open');
    check('Doubled text remains accessible without page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    check('No browser runtime errors', report.errors.length === 0);
    report.passed = true;
  } catch (error) {
    report.failure = error.message;
    report.gate = await gate.getAttribute('data-phase').catch(() => null);
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log('PRISM_BROWSER_PASS: ' + report.checks.length + ' checks');
})().catch(error => { console.error(error); process.exitCode = 1; });
