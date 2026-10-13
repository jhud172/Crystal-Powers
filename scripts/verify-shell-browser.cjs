/* Local public-shell/accessibility acceptance; real metadata, no private account or enquiry writes. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs/promises'); const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.ok(/^http:\/\/127\.0\.0\.1:(8080|8084|5175)$/.test(base));
const output = path.resolve('.codex-runtime/qa/shell-pc');
const report = { base, checks: [], errors: [], runtime: 'installed Edge; local HTTP/client metadata, six emulated widths, five appearances and native keyboard' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
  await fs.mkdir(output, { recursive: true }); const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); page.on('pageerror', error => report.errors.push(error.message));
  const footer = page.getByRole('navigation', { name: 'Footer navigation', exact: true });
  const expected = ['Work', 'Services', 'Studio', 'Support', 'Contact', 'Accessibility', 'Client workspace', 'Team sign-in'];
  try {
    for (const route of ['/', '/about', '/services', '/portfolio', '/support', '/contact', '/accessibility']) {
      await page.goto(base + route); await page.locator('main h1').waitFor();
      check(route + ' footer offers every public journey and accessibility', (await footer.getByRole('link').allTextContents()).map(value => value.replace('↗', '').trim()).join(',') === expected.join(','));
      check(route + ' contains no unready privacy footer link', await footer.locator('a[href="/privacy"]').count() === 0);
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 }); await footer.scrollIntoViewIfNeeded();
        check(route + ' ' + width + 'px has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        check(route + ' ' + width + 'px footer links remain readable and touch sized', await footer.getByRole('link').evaluateAll(links => links.every(link => { const rect = link.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= innerWidth + 1; })));
        check(route + ' ' + width + 'px header retains a visible project entry', await page.locator('.studio-header').getByRole('link', { name: 'Start a project', exact: true }).evaluate(link => { const rect = link.getBoundingClientRect(); return rect.height >= 44 && rect.width >= 44 && rect.left >= 0 && rect.right <= innerWidth + 1; }));
      }
    }
    await page.goto(base + '/accessibility/'); await page.locator('main h1').waitFor();
    check('Accessibility trailing alias has canonical public metadata', await page.title() === 'Accessibility | Crystal Powers' && await page.locator('meta[name="robots"]').getAttribute('content') === 'index, follow' && (await page.locator('link[rel="canonical"]').getAttribute('href')).endsWith('/accessibility'));
    check('Accessibility guide has one main heading and no WebGL/media requirements', await page.locator('main h1').count() === 1 && await page.locator('canvas, video').count() === 0);
    check('Accessibility copy limits claims to real controls and ongoing review', (await page.locator('main').innerText()).includes('does not claim a completed independent audit') && (await page.locator('main').innerText()).includes('Space also activates a focused button'));
    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.locator('.studio-menu-button'); await menu.focus(); await page.keyboard.press('Space');
    await page.getByRole('navigation', { name: 'Mobile navigation', exact: true }).waitFor(); await page.keyboard.press('Tab');
    check('Mobile menu opens from keyboard and Tab enters its links', await page.evaluate(() => !!document.activeElement.closest('#studio-mobile-menu')) && await menu.getAttribute('aria-expanded') === 'true');
    await page.keyboard.press('Escape');
    check('Escape closes mobile navigation and restores its trigger focus', await page.locator('#studio-mobile-menu').count() === 0 && await page.getByRole('button', { name: 'Menu', exact: true }).evaluate(element => element === document.activeElement));
    for (const [name, route] of [['Work', '/portfolio'], ['Services', '/services'], ['Studio', '/about'], ['Support', '/support'], ['Contact', '/contact']]) {
      await menu.click(); await page.locator('#studio-mobile-menu a[href="' + route + '"]').click(); await page.waitForURL(base + route); await page.locator('main h1').waitFor();
      await page.waitForFunction(() => document.activeElement?.id === 'main-content');
      check('Mobile ' + name + ' navigation closes its panel, focuses content and marks the active route', await page.locator('#studio-mobile-menu').count() === 0 && await footer.getByRole('link', { name, exact: true }).getAttribute('aria-current') === 'page');
    }
    await page.setViewportSize({ width: 1440, height: 900 }); const desktop = page.getByRole('navigation', { name: 'Primary navigation', exact: true });
    check('Desktop shell retains the five agreed navigation labels and Contact active state', (await desktop.getByRole('link').allTextContents()).join(',') === expected.slice(0, 5).join(',') && await desktop.getByRole('link', { name: 'Contact', exact: true }).getAttribute('aria-current') === 'page');
    await footer.getByRole('link', { name: 'Accessibility', exact: true }).click(); await page.locator('.access-guide').waitFor(); await page.setViewportSize({ width: 390, height: 844 });
    const appearance = page.getByRole('button', { name: 'Choose appearance', exact: true }); await appearance.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
    check('Appearance keyboard flow reaches a theme choice', await page.evaluate(() => !!document.activeElement.closest('#appearance-panel')));
    await page.keyboard.press('Escape'); check('Appearance Escape closes and restores focus', await page.locator('#appearance-panel').count() === 0 && await appearance.evaluate(element => element === document.activeElement));
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await appearance.click(); await page.getByRole('button', { name: theme, exact: true }).click();
      check(theme + ' guide and footer preserve responsive content', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && await page.locator('.access-keyboard kbd').count() === 8);
      await page.screenshot({ path: path.join(output, 'access-' + theme.replaceAll(' ', '-') + '.png'), fullPage: true });
    }
    await appearance.click(); await page.getByRole('checkbox', { name: 'Reduce effects', exact: true }).check(); await page.keyboard.press('Escape'); await page.emulateMedia({ reducedMotion: 'no-preference' });
    check('App Reduce effects remains applied independently of system preference', await page.locator('.studio-shell').getAttribute('data-reduced-effects') === 'true' && await page.locator('canvas').count() === 0);
    await page.reload(); await page.locator('main h1').waitFor(); check('Appearance and effects preferences survive refresh', await page.evaluate(() => document.body.dataset.theme === 'summer-vibes') && await page.locator('.studio-shell').getAttribute('data-reduced-effects') === 'true');
    await page.keyboard.press('Tab'); await page.getByRole('link', { name: 'Skip to content', exact: true }).focus(); await page.keyboard.press('Enter');
    check('Skip link moves keyboard focus into main content', await page.locator('#main-content').evaluate(element => element === document.activeElement));
    await page.getByRole('link', { name: 'Report an access problem', exact: false }).click(); await page.getByRole('button', { name: 'General question', exact: true }).and(page.locator('[aria-pressed="true"]')).waitFor();
    check('Access feedback enters General enquiry without website-package requirements', new URL(page.url()).search === '?intent=general' && await page.locator('input[name="packageSelection"]').count() === 0);
    await footer.getByRole('link', { name: 'Accessibility', exact: true }).click(); await page.locator('main h1').waitFor();
    check('Footer accessibility navigation sets active state and route focus', await footer.getByRole('link', { name: 'Accessibility', exact: true }).getAttribute('aria-current') === 'page' && await page.locator('#main-content').evaluate(element => element === document.activeElement));
    await page.goBack(); await page.locator('.enquiry-page').waitFor(); await page.goForward(); await page.locator('.access-guide').waitFor();
    check('Public accessibility/enquiry Back and Forward remain usable', await page.title() === 'Accessibility | Crystal Powers');
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => {
      const fields = [...document.querySelectorAll('.access-guide h1, .access-guide h2, .access-guide p, .access-guide dt, .access-guide dd, .access-guide kbd, .studio-footer a, .studio-footer p')].map(element => [element, parseFloat(getComputedStyle(element).fontSize)]);
      for (const [element, size] of fields) element.style.fontSize = size * 2 + 'px';
    });
    check('Guide and footer reflow with a synthetic doubling of rendered text sizes', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.evaluate(() => document.querySelectorAll('.access-guide [style], .studio-footer [style]').forEach(element => element.style.removeProperty('font-size')));
    const direct = await page.request.get(base + '/accessibility'); const html = await direct.text();
    check('Direct HTTP returns 200 and accessibility share metadata', direct.status() === 200 && html.includes('<title>Accessibility | Crystal Powers</title>') && html.includes('index, follow') && !direct.headers()['x-robots-tag']);
    const sitemap = await (await page.request.get(base + '/sitemap.xml')).text(); check('Sitemap includes ready accessibility and excludes unready privacy', sitemap.includes('/accessibility</loc>') && !sitemap.includes('/privacy</loc>'));
    await page.goto(base + '/admin'); await page.locator('.owner-shell').waitFor(); check('Owner shell retains private footer without public footer navigation', await page.locator('.owner-footer').count() === 1 && await footer.count() === 0);
    check('No uncaught shell/accessibility browser errors', report.errors.length === 0);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log('SHELL_BROWSER_PASS:', report.checks.length, 'checks; evidence:', output);
  } catch (error) { report.failure = String(error); await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
