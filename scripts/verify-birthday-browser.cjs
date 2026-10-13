/* Personal route regression. Synthetic browser clocks/history test both date branches;
   no gift purchase, account link or real platform availability is verified or performed. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.ok(/^http:\/\/127\.0\.0\.1:(8080|8084|5175)$/.test(base));
const output = path.resolve('.codex-runtime/qa/birthday-pc');
const report = { base, checks: [], errors: [], runtime: 'installed Edge; synthetic before/after-birthday/expiry clocks; native keyboard and emulated widths' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true }); const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  try {
    for (const [branch, time, root] of [['birthday', '2026-08-11T10:00:00Z', '#birthday-main'], ['after', '2026-10-10T10:00:00Z', '#after-main']]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); page.on('pageerror', error => report.errors.push(error.message));
      await page.clock.setFixedTime(new Date(time)); await page.goto(base + '/birthday/mission-vi/'); await page.locator(root).waitFor();
      check(branch + ' date branch keeps its personal story and separate shell', await page.locator('main h1').count() === 1 && await page.locator('.studio-shell, .studio-header, .studio-footer, canvas').count() === 0 && (await page.locator('main').innerText()).includes('Dad'));
      check(branch + ' has one private robots element', await page.locator('meta[name="robots"]').count() === 1 && (await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
      check(branch + ' countdown is readable without per-second live announcements', await page.getByRole('timer', { name: 'Countdown to the scheduled release date', exact: true }).getAttribute('aria-live') === 'off');
      for (const width of [320, 390, 768, 1024, 1440, 1920]) { await page.setViewportSize({ width, height: 900 }); check(branch + ' ' + width + 'px keeps a bounded personal layout', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
      await page.setViewportSize({ width: 390, height: 844 });
      const skip = page.getByRole('link', { name: branch === 'birthday' ? 'Skip to your birthday mission' : 'Skip to mission status', exact: true }); await skip.focus(); await page.keyboard.press('Enter');
      check(branch + ' skip link gives keyboard focus to the mission', await page.locator(root).evaluate(element => element === document.activeElement));
      check(branch + ' reduced motion keeps content and suppresses decorative movement', await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto') && await page.locator('main h1').isVisible());
      if (branch === 'birthday') {
        const slider = page.getByRole('slider', { name: 'Drag to reveal your purchased birthday gift', exact: true }); await slider.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Escape');
        check('Birthday keyboard Escape cancels a partial reveal', await slider.getAttribute('aria-valuenow') === '0');
        await page.keyboard.press('Enter'); await page.locator('#birthday-main[data-state="unlocked"]').waitFor();
        check('Birthday gift story has a keyboard equivalent to dragging', await page.locator('#birthday-main').getAttribute('data-state') === 'unlocked');
      } else {
        await page.getByRole('button', { name: 'Start the night drive', exact: true }).focus(); await page.keyboard.press('Enter');
        check('Night-drive keyboard action focuses the destination section', await page.locator('#secured').evaluate(element => element === document.activeElement) && await page.locator('#after-main').getAttribute('class').then(value => value.includes('is-driving')));
        const toggle = page.getByRole('button', { name: 'Switch off night drive', exact: true }); await toggle.focus(); await page.keyboard.press('Space');
        check('Night drive can be switched off from the keyboard', await page.getByRole('button', { name: 'Switch on night drive', exact: true }).getAttribute('aria-pressed') === 'false');
        await page.clock.setFixedTime(new Date('2026-11-19T00:00:01Z'));
        await page.getByText('The scheduled launch date has arrived. Check Rockstar Games for the current launch status.', { exact: true }).waitFor();
        check('Expiry clamps all countdown values to zero and avoids claiming platform availability', (await page.getByRole('timer').locator('strong').allTextContents()).every(value => Number(value) === 0));
      }
      check(branch + ' official launch link points directly to Rockstar and opens safely', await page.getByRole('link', { name: 'Official launch information', exact: true }).getAttribute('href') === 'https://www.rockstargames.com/VI' && (await page.getByRole('link', { name: 'Official launch information', exact: true }).getAttribute('rel')).includes('noopener'));
      await page.screenshot({ path: path.join(output, branch + '-mobile.png') }); await page.close();
    }
    const cutover = await browser.newPage({ reducedMotion: 'reduce' }); cutover.on('pageerror', error => report.errors.push(error.message));
    await cutover.clock.install({ time: new Date('2026-08-11T22:59:40Z') }); await cutover.goto(base + '/birthday/mission-vi'); await cutover.locator('#birthday-main').waitFor();
    await cutover.clock.pauseAt(new Date('2026-08-11T22:59:59.500Z'));
    await cutover.locator('#birthday-main').waitFor(); check('Synthetic clock starts on the original birthday side of the cutover', await cutover.locator('#after-main').count() === 0);
    await cutover.clock.runFor(1200); await cutover.locator('#after-main').waitFor();
    check('The exact British birthday cutover switches cleanly to the after experience', await cutover.locator('#birthday-main').count() === 0 && await cutover.locator('meta[name="robots"]').count() === 1);
    await cutover.close();
    // Feature absence must preserve the story, not render the router error screen.
    for (const [branch, time, root, reveals] of [
      ['birthday', '2026-08-11T10:00:00Z', '#birthday-main', '.birthday-promise__copy, .birthday-terms, .birthday-countdown__intro, .birthday-countdown__clock, .birthday-finale__content'],
      ['after', '2026-10-10T10:00:00Z', '#after-main', '[data-after-reveal]']
    ]) {
      for (const width of [390, 1440]) for (const motion of ['reduce', 'no-preference']) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: motion });
        const failures = [];
        page.on('pageerror', error => failures.push(error.message));
        page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
        await page.addInitScript(() => { window.IntersectionObserver = undefined; });
        await page.clock.setFixedTime(new Date(time));
        await page.goto(base + '/birthday/mission-vi');
        await page.locator(root).waitFor();
        const label = `${branch} ${width}px ${motion} without IntersectionObserver`;
        check(label + ': one readable personal story', await page.locator('main h1').count() === 1 && (await page.locator(root).innerText()).includes('Dad'));
        await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(element => {
          let current = element;
          while (current) {
            const style = getComputedStyle(current);
            if (Number(style.opacity) < .99 || style.visibility !== 'visible' || style.display === 'none') return false;
            current = current.parentElement;
          }
          return true;
        }), reveals);
        check(label + ': revealed sections stay visible', await page.locator(reveals).count() > 0);
        check(label + ': no inaccurate tracked chapter marker', await page.locator('main [aria-current]').count() === 0 && await page.locator(root).getAttribute('data-active-chapter') === null);
        if (branch === 'birthday') {
          await page.getByRole('slider', { name: 'Drag to reveal your purchased birthday gift', exact: true }).focus();
          await page.keyboard.press('Enter');
          await page.locator('#birthday-main[data-state="unlocked"]').waitFor();
          check(label + ': keyboard still reveals the gift', await page.locator(root).getAttribute('data-state') === 'unlocked');
        } else {
          await page.getByRole('button', { name: 'Start the night drive', exact: true }).focus();
          await page.keyboard.press('Enter');
          check(label + ': keyboard still enters the story', await page.locator('#secured').evaluate(element => element === document.activeElement));
        }
        check(label + ': no browser or handled application error', failures.length === 0);
        await page.close();
      }
    }
    const lifecycle = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); lifecycle.on('pageerror', error => report.errors.push(error.message));
    await lifecycle.clock.setFixedTime(new Date('2026-10-10T10:00:00Z')); await lifecycle.goto(base + '/accessibility'); await lifecycle.locator('.access-guide').waitFor();
    await lifecycle.getByRole('button', { name: 'Choose appearance', exact: true }).click(); await lifecycle.getByRole('button', { name: 'Warm light', exact: true }).click();
    // A labelled same-document history fixture exercises App/Layout cleanup; no public link to the personal route is added.
    await lifecycle.evaluate(() => { history.pushState({ ...history.state, idx: (history.state?.idx ?? 0) + 1, key: 'synthetic-mission-route' }, '', '/birthday/mission-vi'); dispatchEvent(new PopStateEvent('popstate', { state: history.state })); });
    await lifecycle.locator('#after-main').waitFor(); await lifecycle.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(5, 8, 9)');
    check('Personal styling stays dark when entered from a light public appearance', await lifecycle.evaluate(() => getComputedStyle(document.body).backgroundColor === 'rgb(5, 8, 9)'));
    await lifecycle.goBack(); await lifecycle.locator('.access-guide').waitFor();
    check('Returning to the public route clears personal classes/variables and restores appearance', await lifecycle.evaluate(() => !document.body.classList.contains('after-route-active') && !document.documentElement.classList.contains('after-route-active-root') && document.documentElement.style.getPropertyValue('--after-scroll') === '' && document.body.dataset.theme === 'summer-vibes'));
    check('Returning restores a single public robots element and route metadata', await lifecycle.locator('meta[name="robots"]').count() === 1 && await lifecycle.locator('meta[name="robots"]').getAttribute('content') === 'index, follow' && await lifecycle.title() === 'Accessibility | Crystal Powers');
    const direct = await lifecycle.request.get(base + '/birthday/mission-vi/'); check('Personal direct/trailing route remains HTTP 200/noindex', direct.status() === 200 && direct.headers()['x-robots-tag'] === 'noindex, nofollow');
    check('No uncaught birthday/browser lifecycle errors', report.errors.length === 0); await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log('BIRTHDAY_BROWSER_PASS:', report.checks.length, 'checks; evidence:', output);
  } catch (error) { report.failure = String(error); await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
