/* Rendered solid-surface text audit and reflow; synthetic read-only API fixtures.
   Complex artwork, gradients, browser zoom and assistive devices require separate review. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const output = path.resolve('.codex-runtime/qa/rendered-ui-d5');
const report = { checks: [], cases: [], errors: [], scope: 'Built local frontend; Edge; computed/rasterised solid text surfaces with alpha compositing; read-only synthetic public/team/entry fixtures. Gradients/artwork are explicitly manual review, not automatically accepted. Doubled text and resized viewports are not browser zoom or physical devices.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const themes = [['Dark', 'futuristic'], ['Light', 'clean'], ['Warm dark', 'classic'], ['Fresh light', 'fresh'], ['Warm light', 'summer-vibes']];

function auditText(options = {}) {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = value => {
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].map((n, i) => i === 3 ? n / 255 : n);
  };
  const over = (a, b) => {
    const alpha = a[3] + b[3] * (1 - a[3]);
    return alpha ? [...[0, 1, 2].map(i => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alpha), alpha] : [0, 0, 0, 0];
  };
  const luminance = colour => colour.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
  const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const walker = document.createTreeWalker(document.querySelector('.studio-shell'), NodeFilter.SHOW_TEXT);
  const failures = [], manual = [], seen = new Set(); let samples = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode, el = node.parentElement;
    if (options.modalOnly && !el?.closest('dialog:modal')) continue;
    if (!node.textContent.trim() || !el || seen.has(el) || el.closest('[aria-hidden="true"],script,style,option') || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) || !el.getBoundingClientRect().width || el.closest(':disabled')) continue;
    let visuallyClipped = false;
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.clipPath === 'inset(50%)' || s.clip === 'rect(0px, 0px, 0px, 0px)') visuallyClipped = true;
    }
    if (visuallyClipped) continue; // Screen-reader-only names have no visible text pixels.
    const range = document.createRange(); range.selectNodeContents(node);
    if (![...range.getClientRects()].some(r => r.width > 0 && r.height > 0)) continue;
    seen.add(el);
    const style = getComputedStyle(el), label = node.textContent.trim().slice(0, 100), textRect = range.getBoundingClientRect();
    let front = rgba(style.color), back = [0, 0, 0, 0], complex = false;
    for (let parent = el; parent; parent = parent.parentElement) {
      const s = getComputedStyle(parent), fill = rgba(s.backgroundColor), opacity = Number(s.opacity);
      if (s.backgroundImage !== 'none' && back[3] < .999) complex = true;
      if (back[3] < .999) {
        if (s.backdropFilter !== 'none') complex = true;
        for (const pseudo of ['::before', '::after']) {
          const p = getComputedStyle(parent, pseudo);
          if (p.content !== 'none' && p.content !== 'normal' && p.backgroundImage !== 'none') complex = true;
        }
        // An absolutely layered artwork sibling is not represented by ancestor
        // backgroundColor. Exclude overlapping image/canvas layers from a solid-only claim.
        for (const sibling of parent.children) {
          if (sibling.contains(el)) continue;
          const layer = getComputedStyle(sibling), box = sibling.getBoundingClientRect();
          if (['absolute', 'fixed'].includes(layer.position) && sibling.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && (sibling.matches('img,canvas') || sibling.querySelector('img,canvas') || layer.backgroundImage !== 'none') && box.left < textRect.right && box.right > textRect.left && box.top < textRect.bottom && box.bottom > textRect.top) complex = true;
        }
      }
      front = over(front, fill); back = over(back, fill);
      front[3] *= opacity; back[3] *= opacity;
    }
    if (complex) { manual.push({ label, className: el.className }); continue; }
    front = over(front, [255, 255, 255, 1]); back = over(back, [255, 255, 255, 1]);
    const minimum = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
    const contrast = ratio(front, back); samples++;
    if (contrast + .01 < minimum) failures.push({ label, className: el.className, foreground: style.color, contrast: +contrast.toFixed(3), minimum });
  }
  return { samples, failures, manual };
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  let team = false, client = false, owner = false;
  const member = 'd5000000-0000-4000-8000-000000000001', channel = 'd5000000-0000-4000-8000-000000000002';
  const permissions = ['READ_CHANNELS', 'SEND_MESSAGES'];
  const channels = [{ id: channel, name: 'design-review', category: 'Team', description: 'Read-only design fixture.', audience: 'TEAM', archived: false, version: 0, groupId: null }];
  await page.route('**/api/**', route => {
    assert.equal(route.request().method(), 'GET', 'No business writes');
    const endpoint = new URL(route.request().url()).pathname;
    const reply = json => route.fulfill({ json });
    if (endpoint === '/api/site/privacy/status') return reply({ ready: false });
    if (endpoint === '/api/site/privacy') return route.fulfill({ status: 404, json: { message: 'Operating facts remain undecided; no policy is published.' } });
    if (endpoint === '/api/projects') return reply([]);
    if (endpoint === '/api/team/auth/session') return reply(team ? { authenticated: true, member: { displayName: 'Alex Morgan', role: 'MEMBER' }, permissions } : { authenticated: false });
    if (endpoint === '/api/client/auth/session') return reply({ authenticated: client, client: client ? { id: member, workspaceId: channel, displayName: 'Alex Morgan' } : undefined });
    if (endpoint === '/api/admin/auth/session') return reply({ authenticated: owner, email: owner ? 'owner@example.invalid' : undefined, mfaRequired: false, enrolmentRequired: false, setupAvailable: false });
    if (endpoint === '/api/admin/projects') return reply([]);
    if (endpoint === '/api/client/projects/page') return reply({ clientId: member, workspaceId: channel, projects: [], nextCursor: null, total: 0 });
    if (endpoint === '/api/client/auth/preferences') return reply({ clientId: member, workspaceId: channel, contactPreference: 'PORTAL_ONLY', version: 0 });
    if (endpoint === '/api/client/billing/page') return reply({ accountId: member, workspaceId: channel, paymentsEnabled: true, managementEnabled: true, liveMode: false, bills: ['FULL', 'MONTHLY'].map((purpose, i) => ({ id: 'd5000000-0000-4000-8000-00000000000' + (i + 3), title: i ? 'Synthetic monthly support' : 'Synthetic website balance', purpose, amountPence: 2500, currency: 'GBP', terms: 'Synthetic agreed scope. Monthly support starts only with explicit consent.', paymentState: 'ISSUED', subscriptionState: 'NOT_STARTED', cancelAtPeriodEnd: false, periodEnd: null, invoiceState: null, invoiceUrl: null, checkoutState: 'AVAILABLE', issuedAt: '2026-10-19T10:00:00Z', withdrawalPending: false, withdrawn: false })), nextCursor: null, total: 2 });
    if (endpoint === '/api/team/workspace') return reply({ displayName: 'Alex Morgan', memberId: member, ownerId: null, permissions, channels, settings: { branding: { name: 'Read-only design team', tagline: 'Local visual fixture.', version: 0 }, preferences: { compact: false, unreadBadges: true, mentionAlerts: true, version: 0 }, displayName: 'Alex Morgan', editableName: true, channelPreferences: [] } });
    if (endpoint === '/api/team/unread') return reply([{ channelId: channel, count: 0, lastReadId: 0, latestId: 1 }]);
    if (endpoint === '/api/team/mentions') return reply({ mentions: [], nextCursor: null });
    if (endpoint.endsWith('/conversation')) return reply({ version: 0, unchanged: false, hasEarlier: false, hasLater: false, messages: [{ id: 1, author: 'Alex Morgan', authorTeamId: member, authorOwnerId: null, body: 'The next website revision is ready for review.', version: 0, createdAt: '2026-10-19T10:00:00Z', editedAt: null, pinned: false, replyToId: null, replyAuthor: null, replyBody: null }] });
    if (endpoint.endsWith('/mention-recipients') || endpoint.endsWith('/pins')) return reply([]);
    if (!endpoint.startsWith('/api/projects/')) report.errors.push('Unexpected fixture endpoint: ' + endpoint);
    return route.fulfill({ status: 404, json: { message: 'Not available in this read-only fixture.' } });
  });
  try {
    const routes = ['/', '/about', '/services', '/portfolio', '/portfolio/missing', '/contact', '/support', '/accessibility', '/privacy', '/missing-page', '/admin', '/team', '/client', '/team/activate', '/client/activate', 'team-conversation', 'owner-library', 'client-workspace', 'client-billing'];
    for (const route of routes) {
      team = route === 'team-conversation';
      owner = route === 'owner-library'; client = route.startsWith('client-');
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(base + (team ? '/team' : owner ? '/admin' : client ? '/client' : route));
      await page.locator(team ? '#team-message' : 'main h1').waitFor();
      if (owner) await page.locator('.admin-dashboard-heading').waitFor();
      if (client) await page.locator('.client-workspace').waitFor();
      if (route === 'client-billing') await page.locator('.client-billing .support-billing-list > li').first().waitFor();
      for (const [label, theme] of themes) {
        await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
        await page.getByRole('button', { name: label, exact: true }).click(); await page.keyboard.press('Escape');
        await page.waitForFunction(theme => document.body.dataset.theme === theme && !document.body.classList.contains('theme-changing'), theme);
        const result = await page.evaluate(auditText);
        report.cases.push({ route, theme, ...result });
      }
      if (['/contact', 'team-conversation', 'owner-library', 'client-billing'].includes(route)) {
        await page.emulateMedia({ contrast: 'more' });
        for (const [label, theme] of themes) {
          await page.getByRole('button', { name: 'Choose appearance', exact: true }).click();
          await page.getByRole('button', { name: label, exact: true }).click(); await page.keyboard.press('Escape');
          await page.waitForFunction(() => !document.body.classList.contains('theme-changing'));
          check(route + '/' + theme + ' stronger contrast roles applied', await page.locator('.studio-shell').evaluate(el => {
            const s = getComputedStyle(el), token = name => s.getPropertyValue('--studio-' + name).trim();
            return matchMedia('(prefers-contrast: more)').matches && token('line') === token('control-line') && token('panel-fill') === token('bg') && token('control-fill') === token('bg');
          }));
          report.cases.push({ route, theme: theme + '/more-contrast', ...await page.evaluate(auditText) });
        }
        await page.emulateMedia({ contrast: 'no-preference' });
      }
      for (const width of [320, 480, 768, 1024, 1440, 2560]) {
        await page.setViewportSize({ width, height: width === 1024 ? 480 : 1000 });
        check(route + '/' + width + ' normal document reflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.studio-shell').evaluate(root => {
        const sizes = [...root.querySelectorAll('p,h1,h2,h3,label,button,input,textarea,select,summary,a,small,dt,dd,time')].map(el => ({ el, size: parseFloat(getComputedStyle(el).fontSize) }));
        for (const { el, size } of sizes) el.style.fontSize = size * 2 + 'px';
      });
      const reflow = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, clipped: [...document.querySelectorAll('main button,main label')].filter(el => el.clientWidth && el.scrollWidth > el.clientWidth + 3).map(el => el.textContent.trim().slice(0, 80)) }));
      report.cases.push({ route, doubledText: reflow });
      if (reflow.overflow || reflow.clipped.length) await page.screenshot({ path: path.join(output, route.replace(/[^a-z0-9]/gi, '-') + '-reflow.png'), fullPage: true });
    }
    for (const item of report.cases) {
      if (item.theme) check(item.route + '/' + item.theme + ' rendered solid text contrast (' + item.samples + ' samples): ' + JSON.stringify(item.failures), item.samples > 0 && item.failures.length === 0);
      else check(item.route + ' doubled text reflows: ' + JSON.stringify(item.doubledText), !item.doubledText.overflow && item.doubledText.clipped.length === 0);
    }
    check('No unhandled browser or fixture errors', report.errors.length === 0);
    console.log('RENDERED_UI_PASS:', report.checks.length, 'checks;', report.cases.filter(c => c.theme).reduce((n, c) => n + c.samples, 0), 'text samples');
  } catch (error) { report.failure = String(error); throw error; }
  finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
}
module.exports = { auditText };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
