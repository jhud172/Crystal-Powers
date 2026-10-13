/* Requires an explicitly isolated loopback owner database and synthetic credentials supplied in memory. */
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
function totp(secret) {
  let bits = '';
  for (const letter of secret.replace(/=/g, '').toUpperCase()) bits += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(letter).toString(2).padStart(5, '0');
  const bytes = Buffer.from(bits.match(/.{8}/g).map(value => parseInt(value, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = crypto.createHmac('sha1', bytes).update(counter).digest();
  return String((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}
async function freshSyntheticTotp(secret) {
  const step = Math.floor(Date.now() / 30000);
  if (globalThis.crystalPortfolioQaMfaStep === step) {
    await new Promise(resolve => setTimeout(resolve, 30100 - Date.now() % 30000));
  }
  globalThis.crystalPortfolioQaMfaStep = Math.floor(Date.now() / 30000);
  return totp(secret);
}
exports.runPortfolioQa = async ({ chromium, executablePath, base, password, setupToken, secret, onSecret }) => {
  assert.ok(/^http:\/\/127\.0\.0\.1:(8083|8084)$/.test(base), 'Use only the isolated portfolio QA runtime');
  assert.ok(password && setupToken, 'Synthetic credentials must be supplied, never written to reports');
  const output = path.resolve('.codex-runtime/qa/portfolio-pc');
  await fs.mkdir(output, { recursive: true });
  const report = { base, checks: [], errors: [], runtime: 'installed Edge, isolated local owner, real uploads/publication' };
  const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
  const browser = await chromium.launch({ headless: true, executablePath });
  let debugPage;
  let ownerContext, testProjectId;
  async function unpublishFixture(id) {
    const csrf = await (await ownerContext.request.get(base + '/api/admin/auth/csrf')).json();
    const result = await ownerContext.request.post(base + '/api/admin/projects/' + id + '/unpublish', { headers: { [csrf.headerName]: csrf.token } });
    assert.equal(result.status(), 200, 'Synthetic publication cleanup succeeds');
  }
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    ownerContext = context;
    const page = await context.newPage();
    debugPage = page;
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base + '/admin');
    await page.getByRole('heading', { name: 'Welcome back.', exact: true }).waitFor();
    const firstSetup = !!await page.getByRole('button', { name: 'First time here? Set up your owner account', exact: true }).count();
    if (firstSetup) {
      await page.getByRole('button', { name: 'First time here? Set up your owner account', exact: true }).click();
      await page.getByLabel('Owner setup token').fill(setupToken);
    }
    await page.getByLabel('Email address', { exact: true }).fill('synthetic-portfolio-owner@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill(password);
    if (firstSetup) await page.getByLabel('Confirm password', { exact: true }).fill(password);
    await page.getByRole('button', { name: firstSetup ? 'Create owner account ↗' : 'Sign in ↗', exact: true }).click();
    await page.getByLabel('Authenticator or recovery code', { exact: true }).waitFor();
    if (await page.locator('.admin-enrolment code').count()) { secret = await page.locator('.admin-enrolment code').innerText(); onSecret?.(secret); }
    assert.ok(secret, 'The test requires its synthetic authenticator secret in memory');
    await page.getByLabel('Authenticator or recovery code', { exact: true }).fill(await freshSyntheticTotp(secret));
    await page.getByRole('button', { name: 'Verify and continue ↗', exact: true }).click();
    if (firstSetup) {
      await page.getByRole('heading', { name: 'Keep these safe.', exact: true }).waitFor();
      check('Initial recovery codes require acknowledgement before entering the studio', await page.getByRole('button', { name: 'Open the studio ↗', exact: true }).isDisabled());
      check('Initial enrolment clears the authenticator key before showing recovery codes', await page.locator('.admin-enrolment').count() === 0);
      check('Setup progress identifies the recovery-code step', await page.locator('.owner-steps [aria-current="step"]').innerText().then(value => value.includes('Recovery codes')));
      const codeDownload = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download recovery codes', exact: true }).click();
      const downloaded = await codeDownload;
      check('Initial codes download uses the expected private filename', downloaded.suggestedFilename() === 'crystal-powers-recovery-codes.txt');
      await downloaded.delete();
      await page.getByRole('checkbox', { name: 'I’ve stored my recovery codes somewhere private.', exact: true }).check();
      await page.getByRole('button', { name: 'Open the studio ↗', exact: true }).click();
    }
    await page.getByRole('button', { name: 'New project +', exact: true }).waitFor();
    check('Real owner setup/sign-in/MFA reaches the workspace', true);
    const staleFixtures = await (await context.request.get(base + '/api/admin/projects')).json();
    for (const fixture of staleFixtures.filter(project => project.slug.startsWith('clare-local-qa-') && project.content.title === 'Clare’s Life Celebrations · local QA' && project.publishedVersion !== null)) await unpublishFixture(fixture.id);
    await page.getByRole('button', { name: 'New project +', exact: true }).click();
    const slug = 'clare-local-qa-' + Date.now();
    await page.getByLabel('Project title', { exact: true }).fill('Clare’s Life Celebrations · local QA');
    await page.getByLabel('Project address').fill(slug);
    await page.getByRole('button', { name: 'Create private draft ↗', exact: true }).click();
    await page.getByLabel('Short introduction').waitFor();
    testProjectId = (await (await context.request.get(base + '/api/admin/projects')).json()).find(project => project.slug === slug).id;
    const anonymousBefore = await browser.newContext();
    check('Private project address is absent from the public API', (await anonymousBefore.request.get(base + '/api/projects/' + slug)).status() === 404);
    const privateDocument = await anonymousBefore.request.get(base + '/portfolio/' + slug);
    check('Private case document is HTML 404/noindex without draft content', privateDocument.status() === 404 && privateDocument.headers()['x-robots-tag'] === 'noindex, nofollow' && !(await privateDocument.text()).includes('Clare’s Life Celebrations · local QA'));
    await anonymousBefore.close();
    await page.getByLabel('Short introduction').fill('Approved Clare website screenshots, used only for isolated local acceptance.');
    await page.getByRole('button', { name: 'Story', exact: true }).click();
    await page.getByLabel(/^The idea/).fill('A clear way to explore Clare’s ceremonies and ask about a celebration.');
    await page.getByLabel(/^The approach/).fill('Considered ceremony pages, responsive layouts and a focused enquiry journey.');
    await page.getByLabel(/^The outcome/).fill('A delivered website with ceremony information and an enquiry form. No measured commercial outcomes are claimed.');
    await page.getByRole('button', { name: 'Images', exact: true }).click();
    const input = page.locator('.admin-upload input[type="file"]');
    await input.setInputFiles(path.resolve('.codex-runtime/qa/approved-clare/desktop.jpg'));
    await page.locator('.admin-image-library article').first().waitFor();
    await input.and(page.locator(':enabled')).waitFor({ state: 'attached' });
    await input.setInputFiles(path.resolve('.codex-runtime/qa/approved-clare/mobile.jpg'));
    await page.locator('.admin-image-library article').nth(1).waitFor();
    await page.getByLabel('Desktop screenshot', { exact: true }).locator('option').filter({ hasText: '390' }).waitFor({ state: 'attached' });
    const images = await page.getByLabel('Desktop screenshot', { exact: true }).locator('option').evaluateAll(options => options.filter(option => option.value).map(option => ({ id: option.value, text: option.textContent })));
    const desktop = images.find(image => image.text.includes('1440')), mobile = images.find(image => image.text.includes('390'));
    report.uploadOptions = images;
    check('Uploaded image IDs appear once in the library', new Set(images.map(image => image.id)).size === images.length);
    check('Real upload preserves separate desktop/mobile dimensions', !!desktop && !!mobile);
    await page.getByLabel('Cover image description').fill('Approved Clare homepage on desktop');
    await page.getByLabel('Desktop screenshot', { exact: true }).selectOption(desktop.id);
    await page.getByLabel('Mobile screenshot', { exact: true }).selectOption(mobile.id);
    check('Publishing requires screenshot descriptions', await page.getByRole('button', { name: 'Publish project ↗', exact: true }).isDisabled());
    await page.getByLabel('Desktop screenshot description').fill('Clare homepage desktop layout');
    await page.getByLabel('Mobile screenshot description').fill('Clare homepage mobile layout');
    await page.locator('.admin-image-library article').filter({ has: page.locator(`img[src$="/${desktop.id}"]`) }).getByRole('checkbox').check();
    await page.locator('.admin-image-library article').filter({ has: page.locator(`img[src$="/${mobile.id}"]`) }).getByRole('checkbox').check();
    await page.getByLabel('Gallery image 1 description').fill('Clare homepage desktop layout');
    await page.getByLabel('Gallery image 2 description').fill('Clare homepage mobile layout');
    const anon = await browser.newContext();
    for (const image of [desktop, mobile]) check('Draft device image is anonymous 404', (await anon.request.get(base + '/api/media/' + image.id)).status() === 404);
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('Draft saved. The public version stays as it was until you publish.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const privatePreview = page.frameLocator('.admin-preview-frame');
    check('Private preview uses the owner media URL', (await privatePreview.locator('.stage-project-device img').getAttribute('src')).startsWith('/api/admin/media/'));
    check('Private preview remains noindex', await page.locator('meta[name="robots"]').first().getAttribute('content') === 'noindex, nofollow');
    check('Private preview share images never expose owner media', !(await page.locator('meta[property="og:image"]').getAttribute('content')).includes('/api/admin/media/'));
    await page.waitForFunction(() => { const image = document.querySelector('.admin-preview-frame')?.contentDocument.querySelector('.stage-project-device img'); return image?.complete && image.naturalWidth > 0; });
    check('Actual private preview images load with the owner session', await privatePreview.locator('.stage-project-device img').evaluate(image => image.complete && image.naturalWidth > 0));
    for (const [label, width] of [['Desktop', 1440], ['Tablet', 768], ['Phone', 390]]) {
      await page.getByRole('group', { name: 'Preview viewport', exact: true }).getByRole('button', { name: label, exact: true }).click();
      await page.waitForFunction(width => document.querySelector('.admin-preview-frame')?.contentWindow.innerWidth === width, width);
      check(`Actual ${label} preview uses the real viewport and private presentation`, await privatePreview.locator('html').evaluate((element, width) => element.ownerDocument.defaultView.innerWidth === width && element.scrollWidth <= width + 1, width));
    }
    await privatePreview.getByRole('button', { name: 'Mobile', exact: true }).click();
    check('Private preview switches to the actual mobile screenshot', (await privatePreview.locator('.stage-project-device img').getAttribute('src')).includes(mobile.id));
    await privatePreview.getByRole('button', { name: 'Explore this project in 3D', exact: false }).click();
    await privatePreview.locator('.model-stage[data-ready="true"] canvas').waitFor({ timeout: 20000 });
    check('Actual private preview renders one authenticated live device inside the frame', await privatePreview.locator('canvas').count() === 1 && await page.locator('canvas').count() === 0);
    await privatePreview.getByRole('region', { name: 'phone 3D view. Use left and right arrow keys to rotate. Press Escape to close.', exact: true }).focus();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Escape');
    await privatePreview.locator('canvas').waitFor({ state: 'detached' });
    check('Actual framed 3D keyboard close disposes the canvas and returns launch focus', await privatePreview.locator('canvas').count() === 0 && await privatePreview.getByRole('button', { name: 'Explore this project in 3D', exact: false }).evaluate(button => button === button.ownerDocument.activeElement));
    await page.getByRole('button', { name: '← Back to editor', exact: true }).click();
    await page.getByRole('button', { name: 'Publish project ↗', exact: true }).click();
    await page.getByRole('dialog', { name: /Publish saved revision/ }).waitFor();
    await page.getByRole('checkbox', { name: 'I have permission to share this project, its images and the claims in its story.', exact: true }).check();
    await page.getByRole('button', { name: /^Publish revision [0-9]+ ↗$/ }).click();
    await page.getByText('Published. Existing pages refresh automatically while visible and connected.', { exact: true }).waitFor();
    await page.getByRole('button', { name: '← All projects', exact: true }).click();
    const dashboardProject = page.locator('.admin-projects article').filter({ hasText: '/portfolio/' + slug });
    const featuredResponse = page.waitForResponse(response => response.url().endsWith('/presentation') && response.request().method() === 'PATCH');
    await dashboardProject.getByRole('checkbox', { name: 'Featured', exact: true }).click();
    check('Featured selection is acknowledged by the actual server', (await featuredResponse).status() === 200);
    await dashboardProject.getByRole('checkbox', { name: 'Featured', exact: true }).and(page.locator(':checked')).waitFor({ state: 'attached' });
    await dashboardProject.getByRole('checkbox', { name: 'Featured', exact: true }).and(page.locator(':enabled')).waitFor({ state: 'attached' });
    check('Real owner can select the published project for Home', await dashboardProject.getByRole('checkbox', { name: 'Featured', exact: true }).isChecked());
    await dashboardProject.getByRole('button', { name: 'Edit project ↗', exact: true }).click();
    const publicPage = await anon.newPage();
    publicPage.on('pageerror', error => report.errors.push(error.message));
    await publicPage.goto(base + '/');
    await publicPage.locator('.home-project h3').waitFor();
    check('Home uses the actual isolated published featured revision', await publicPage.locator('.home-project h3').innerText() === 'Clare’s Life Celebrations · local QA');
    await publicPage.getByRole('group', { name: 'Choose project device', exact: true }).getByRole('button', { name: 'Mobile', exact: true }).click();
    check('Published Home selects its owned responsive screenshot', (await publicPage.locator('.home-project .stage-project-device img').getAttribute('src')).includes(mobile.id));
    await publicPage.getByRole('link', { name: 'Explore the project ↗', exact: true }).click();
    await publicPage.locator('.case-study').waitFor();
    check('Real Home project link reaches the matching case address', new URL(publicPage.url()).pathname === '/portfolio/' + slug);
    await publicPage.goto(base + '/portfolio/' + slug);
    await publicPage.locator('.stage-project-device img').waitFor();
    check('Published preview starts with the real desktop screenshot', (await publicPage.locator('.stage-project-device img').getAttribute('src')).includes(desktop.id));
    await publicPage.route('**/api/projects/' + slug, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic temporary project outage' }) }));
    const temporaryDocument = await publicPage.reload();
    await publicPage.getByRole('heading', { name: 'The project couldn’t load.', exact: true }).waitFor();
    check('A published document stays HTTP 200 while a fixture API outage offers recovery', temporaryDocument.status() === 200 && await publicPage.getByRole('button', { name: 'Try again', exact: true }).isVisible() && await publicPage.locator('.recovery-page').count() === 0);
    await publicPage.unroute('**/api/projects/' + slug);
    await publicPage.getByRole('button', { name: 'Try again', exact: true }).click();
    await publicPage.locator('.case-study').waitFor();
    check('Published project retry restores its actual story', true);
    const html = await (await anon.request.get(base + '/portfolio/' + slug)).text();
    check('Direct HTML includes the public cover in both share-card formats', html.includes('property="og:image" content="http://localhost:8080/api/media/' + desktop.id) && html.includes('name="twitter:image" content="http://localhost:8080/api/media/' + desktop.id));
    check('Hydrated share card matches public cover', (await publicPage.locator('meta[property="og:image"]').getAttribute('content')).endsWith('/api/media/' + desktop.id) && (await publicPage.locator('meta[name="twitter:image"]').getAttribute('content')).endsWith('/api/media/' + desktop.id));
    await publicPage.getByRole('navigation', { name: 'Explore this case study' }).getByRole('link', { name: /The approach/ }).click();
    check('Case chapter navigation reaches the actual approach section', new URL(publicPage.url()).hash === '#project-approach' && await publicPage.locator('#project-approach').isVisible());
    for (const galleryWidth of [320, 390, 768, 1024, 1440, 1920]) {
      await publicPage.setViewportSize({ width: galleryWidth, height: 900 });
      const firstImage = publicPage.getByRole('button', { name: 'Open image 1: Clare homepage desktop layout', exact: true });
      await firstImage.click();
      const gallery = publicPage.getByRole('dialog', { name: 'Project images', exact: true });
      await gallery.waitFor();
      check(`Gallery ${galleryWidth} fits the viewport`, await gallery.evaluate(dialog => { const box = dialog.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; }));
      await gallery.press('ArrowRight');
      await gallery.getByText('Image 2 of 2', { exact: true }).waitFor();
      check(`Gallery ${galleryWidth} keyboard advances to mobile image`, (await gallery.locator('img').getAttribute('src')).includes(mobile.id));
      await gallery.press('ArrowLeft');
      await gallery.getByText('Image 1 of 2', { exact: true }).waitFor();
      await gallery.press('Escape');
      check(`Gallery ${galleryWidth} Escape closes and restores focus`, !await gallery.isVisible() && await firstImage.evaluate(button => button === document.activeElement));
    }
    await publicPage.getByRole('link', { name: 'Discuss a project like this ↗', exact: true }).click();
    await publicPage.getByText('Inspired by', { exact: false }).waitFor();
    check('Case enquiry retains the project reference and correct purpose', await publicPage.getByText('Clare’s Life Celebrations · local QA', { exact: true }).isVisible() && new URL(publicPage.url()).searchParams.get('intent') === 'website');
    check('Project reference is absent from the enquiry URL', !publicPage.url().includes(slug) && !publicPage.url().includes('Clare'));
    await publicPage.getByRole('button', { name: 'Remove project reference', exact: true }).click();
    check('Project reference can be explicitly removed', await publicPage.locator('.enquiry-project-interest').count() === 0);
    await publicPage.goto(base + '/portfolio?category=WEBSITE');
    await publicPage.getByRole('link', { name: 'Explore Clare’s Life Celebrations · local QA', exact: true }).click();
    await publicPage.locator('.case-study').waitFor();
    check('Work filter survives project navigation', new URL(publicPage.url()).searchParams.get('category') === 'WEBSITE');
    check('Internal navigation sets the correct case share card', (await publicPage.locator('meta[property="og:image"]').getAttribute('content')).endsWith('/api/media/' + desktop.id));
    await publicPage.getByRole('link', { name: '← All projects', exact: true }).click();
    await publicPage.getByRole('group', { name: 'Filter projects' }).waitFor();
    check('Case returns to its original Work category', new URL(publicPage.url()).searchParams.get('category') === 'WEBSITE');
    check('Leaving the case restores the brand share card', (await publicPage.locator('meta[property="og:image"]').getAttribute('content')).endsWith('/renders/observatory-dark.png'));
    await publicPage.getByRole('button', { name: /^App/ }).click();
    await publicPage.getByRole('heading', { name: 'A different starting point?', exact: true }).waitFor();
    await publicPage.getByRole('button', { name: 'Show all work', exact: true }).click();
    check('Empty category reset restores all projects', !new URL(publicPage.url()).search && await publicPage.locator('.work-grid article').count() === 1);
    await publicPage.getByRole('link', { name: 'Explore Clare’s Life Celebrations · local QA', exact: true }).click();
    await publicPage.locator('.stage-project-device img').waitFor();
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await publicPage.setViewportSize({ width, height: 900 });
      for (const device of ['Laptop', 'Desktop', 'Mobile']) {
        await publicPage.getByRole('button', { name: device, exact: true }).click();
        const img = publicPage.locator('.stage-project-device img');
        check(`${device} ${width} uses the correct screenshot`, (await img.getAttribute('src')).includes(device === 'Mobile' ? mobile.id : desktop.id));
        check(`${device} ${width} keeps the whole screenshot`, await img.evaluate(image => getComputedStyle(image).objectFit === 'contain'));
        check(`${device} ${width} controls do not obscure the screenshot`, await publicPage.evaluate(() => document.querySelector('.stage-project-device img').getBoundingClientRect().bottom <= document.querySelector('.stage-controls').getBoundingClientRect().top));
        check(`${device} ${width} fits without horizontal overflow`, await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      if (width === 390 || width === 1440) await publicPage.screenshot({ path: path.join(output, 'case-' + width + '.png'), fullPage: true });
    }
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await publicPage.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      await publicPage.getByRole('button', { name: theme, exact: true }).click();
      check(`${theme} populated case fits`, await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    check('Inactive device uses no canvas', await publicPage.locator('canvas').count() === 0);
    check('Unfocused skip link is outside the viewport', await publicPage.locator('.studio-skip').evaluate(link => link.getBoundingClientRect().bottom <= 0));
    await publicPage.getByRole('button', { name: 'Explore this project in 3D', exact: true }).click();
    await publicPage.locator('.model-stage[data-ready="true"]').waitFor();
    check('Published mobile screenshot also loads in the optional 3D device', await publicPage.locator('canvas').count() === 1);
    await publicPage.locator('.stage-canvas').press('ArrowRight');
    await publicPage.screenshot({ path: path.join(output, 'mobile-live-3d.png') });
    const contextLossSupported = await publicPage.locator('canvas').evaluate(canvas => { const gl = canvas.getContext('webgl2'); const extension = gl?.getExtension('WEBGL_lose_context'); if (extension) extension.loseContext(); return !!extension; });
    check('Runtime permits an actual forced WebGL loss test', contextLossSupported);
    await publicPage.getByText('3D is unavailable on this device. The rendered view is still available.', { exact: true }).waitFor();
    check('Context loss restores the project-specific screenshot', await publicPage.locator('.stage-project-device img').isVisible() && await publicPage.locator('canvas').count() === 0);
    await publicPage.getByRole('button', { name: 'Close 3D view', exact: true }).click();
    await publicPage.getByRole('button', { name: 'Explore this project in 3D', exact: true }).and(publicPage.locator(':focus')).waitFor();
    check('Closing a failed 3D view returns keyboard focus', true);
    for (const image of [desktop, mobile]) check('Published device image is readable anonymously', (await anon.request.get(base + '/api/media/' + image.id)).status() === 200);
    // Additional project volume and failure states are explicitly browser fixtures, not client publications.
    const realProject = await (await anon.request.get(base + '/api/projects/' + slug)).json();
    const fixtures = [realProject, { ...realProject, id: 'local-fixture-app', slug: 'local-fixture-app', content: { ...realProject.content, title: 'Local app navigation fixture', category: 'APP' } }, { ...realProject, id: 'local-fixture-system', slug: 'local-fixture-system', content: { ...realProject.content, title: 'Local system navigation fixture', category: 'SYSTEM' } }];
    const fixtureContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const fixturePage = await fixtureContext.newPage();
    fixturePage.on('pageerror', error => report.errors.push(error.message));
    let listMode = 'ready', releaseLoading;
    await fixtureContext.route('**/api/projects', async route => {
      if (listMode === 'loading') await new Promise(resolve => { releaseLoading = resolve; });
      await route.fulfill({ status: listMode === 'error' ? 503 : 200, contentType: 'application/json', body: JSON.stringify(listMode === 'error' ? { message: 'Synthetic outage' } : listMode === 'empty' ? [] : fixtures) });
    });
    await fixtureContext.route('**/api/projects/local-fixture-*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixtures.find(project => route.request().url().endsWith(project.slug))) }));
    listMode = 'loading';
    await fixturePage.goto(base + '/portfolio');
    await fixturePage.getByRole('status', { name: 'Loading project previews', exact: true }).waitFor();
    check('Fixture delayed response has a reserved, named loading preview', await fixturePage.locator('.work-loading > div').evaluate(element => element.getBoundingClientRect().height > 100));
    listMode = 'ready'; releaseLoading();
    await fixturePage.locator('.work-grid article').nth(2).waitFor();
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await fixturePage.setViewportSize({ width, height: 900 });
      check(`Fixture Work ${width} displays all summaries without overflow`, await fixturePage.locator('.work-grid article p').count() === 6 && await fixturePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await fixturePage.setViewportSize({ width: 1440, height: 900 });
    const imageLink = fixturePage.getByRole('link', { name: 'Explore Local app navigation fixture', exact: true });
    await imageLink.focus();
    check('Keyboard project preview exposes the same visible description and image as pointer/touch', await imageLink.evaluate(link => link === document.activeElement && !!link.querySelector('img') && getComputedStyle(link.querySelector('span')).visibility === 'visible') && await fixturePage.getByText(realProject.content.summary, { exact: true }).nth(1).isVisible());
    await imageLink.press('Enter');
    await fixturePage.getByRole('heading', { name: 'Local app navigation fixture', exact: true }).waitFor();
    await fixturePage.getByRole('region', { name: 'More work', exact: true }).getByRole('link').filter({ hasText: realProject.content.title }).click();
    await fixturePage.getByRole('heading', { name: realProject.content.title, exact: true }).waitFor();
    await fixturePage.getByRole('region', { name: 'More work', exact: true }).getByRole('link').filter({ hasText: 'Local app navigation fixture' }).click();
    await fixturePage.getByRole('heading', { name: 'Local app navigation fixture', exact: true }).waitFor();
    check('Fixture previous and next project links reach their matching stories', true);
    await fixturePage.getByRole('link', { name: 'Discuss a project like this ↗', exact: true }).click();
    await fixturePage.getByLabel('Name', { exact: true }).fill('Synthetic');
    await fixturePage.getByLabel('Email', { exact: true }).fill('case-fixture@example.invalid');
    await fixturePage.getByLabel('Preferred contact point', { exact: true }).selectOption('Email');
    await fixturePage.locator('#message').fill('Synthetic payload check only; no email should be sent.');
    await fixturePage.getByRole('button', { name: 'Review enquiry →', exact: true }).click();
    await fixturePage.locator('.enquiry-review').waitFor();
    check('Project reference is present in the enquiry review', await fixturePage.locator('.enquiry-review').getByText('Local app navigation fixture', { exact: true }).isVisible());
    let submitted;
    await fixturePage.route('**/api/contact', async route => { submitted = route.request().postData(); await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Synthetic delivery outage; no email sent.' }) }); });
    await fixturePage.getByRole('button', { name: 'Send enquiry ↗', exact: true }).click();
    await fixturePage.getByRole('alert').waitFor();
    check('Fixture enquiry submission carries project reference and app purpose', submitted.includes('name="projectInterest"\r\n\r\nLocal app navigation fixture') && submitted.includes('name="intent"\r\n\r\napp'));
    check('Failed fixture submission retains project reference and typed message', await fixturePage.locator('.enquiry-project-interest').isVisible() && (await fixturePage.locator('#message').inputValue()).startsWith('Synthetic payload'));
    listMode = 'error'; await fixturePage.goto(base + '/portfolio');
    await fixturePage.getByRole('heading', { name: 'The showcase is taking a moment.', exact: true }).waitFor();
    check('Fixture API error exposes retry and contact recovery', await fixturePage.getByRole('button', { name: 'Try again', exact: true }).isVisible() && await fixturePage.getByRole('link', { name: 'Start a conversation ↗', exact: true }).isVisible());
    listMode = 'ready'; await fixturePage.getByRole('button', { name: 'Try again', exact: true }).click();
    await fixturePage.locator('.work-grid article').nth(2).waitFor();
    check('Fixture retry replaces the error with the recovered showcase', true);
    for (const theme of ['Dark', 'Light', 'Warm dark', 'Fresh light', 'Warm light']) {
      await fixturePage.getByRole('button', { name: 'Choose appearance', exact: true }).click();
      await fixturePage.getByRole('button', { name: theme, exact: true }).click();
      check(`${theme} fixture Work fits`, await fixturePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await fixturePage.screenshot({ path: path.join(output, 'work-fixtures-desktop.png'), fullPage: true });
    listMode = 'empty'; await fixturePage.reload();
    await fixturePage.getByRole('heading', { name: 'The next chapter is taking shape.', exact: true }).waitFor();
    check('Fixture genuinely empty portfolio offers a conversation without invented projects', await fixturePage.locator('.work-grid article').count() === 0);
    await fixtureContext.close();
    page.on('dialog', dialog => dialog.accept());
    const beforeCompetingDraft = await (await context.request.get(base + '/api/admin/projects/' + testProjectId)).json();
    const competingCsrf = await (await context.request.get(base + '/api/admin/auth/csrf')).json();
    const competingSave = await context.request.put(base + '/api/admin/projects/' + testProjectId, { headers: { [competingCsrf.headerName]: competingCsrf.token }, data: { expectedVersion: beforeCompetingDraft.version, content: { ...beforeCompetingDraft.content, summary: beforeCompetingDraft.content.summary + ' Synthetic competing local draft.' } } });
    assert.equal(competingSave.status(), 200, 'Synthetic second-session draft saves successfully');
    await page.getByRole('button', { name: 'Details', exact: true }).click();
    await page.locator('#project-summary').fill('Synthetic unsaved content retained after an actual conflict.');
    const draftConflictResponse = page.waitForResponse(response => response.url().endsWith('/api/admin/projects/' + testProjectId) && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    const draftConflict = await draftConflictResponse; await page.getByRole('alert').waitFor();
    check('Actual stale draft receives 409 while retaining inputs and disabling save', draftConflict.status() === 409 && await page.locator('#project-summary').inputValue() === 'Synthetic unsaved content retained after an actual conflict.' && await page.getByRole('button', { name: 'Save draft', exact: true }).isDisabled());
    check('Actual private competing draft does not change the published content', (await (await anon.request.get(base + '/api/projects/' + slug)).json()).content.summary === beforeCompetingDraft.content.summary);
    await page.getByRole('button', { name: 'Reload saved draft', exact: true }).click();
    await page.getByText('Latest draft loaded.', { exact: true }).waitFor();
    check('Actual confirmed reload replaces unsaved input with the newer private draft', await page.locator('#project-summary').inputValue() === beforeCompetingDraft.content.summary + ' Synthetic competing local draft.');
    await page.getByRole('button', { name: 'History', exact: true }).click();
    const historicRow = page.locator('.admin-revisions article').filter({ has: page.getByRole('heading', { name: `Revision ${beforeCompetingDraft.publishedVersion} · Published`, exact: true }) });
    await historicRow.getByRole('button', { name: 'Restore as draft', exact: true }).click();
    await page.getByText(`Revision ${beforeCompetingDraft.publishedVersion} restored as draft ${beforeCompetingDraft.version + 2}. Review it before publishing.`, { exact: true }).waitFor();
    const restoredHistory = await (await context.request.get(base + '/api/admin/projects/' + testProjectId)).json();
    check('Actual historic restore creates a newer private revision without changing publication', restoredHistory.version === beforeCompetingDraft.version + 2 && restoredHistory.publishedVersion === beforeCompetingDraft.publishedVersion && restoredHistory.content.summary === beforeCompetingDraft.content.summary);
    await page.getByRole('button', { name: 'Archive project', exact: true }).click();
    await page.getByText('Project archived.', { exact: true }).waitFor();
    const archivedFixture = await (await context.request.get(base + '/api/admin/projects/' + testProjectId)).json();
    check('Actual archive preserves the published revision but hides the public project', archivedFixture.archived && archivedFixture.publishedVersion !== null && (await anon.request.get(base + '/api/projects/' + slug)).status() === 404);
    for (const image of [desktop, mobile]) check('Archived actual screenshot is inaccessible anonymously', (await anon.request.get(base + '/api/media/' + image.id)).status() === 404);
    await page.getByRole('button', { name: 'Restore project', exact: true }).click();
    await page.getByText('Project restored.', { exact: true }).waitFor();
    check('Actual restore makes the prior published revision visible again', (await anon.request.get(base + '/api/projects/' + slug)).status() === 200);
    await page.getByRole('button', { name: 'Unpublish project', exact: true }).click();
    await page.getByText('Unpublished. Your draft and images are still here.', { exact: true }).waitFor();
    for (const image of [desktop, mobile]) check('Unpublished device image returns to anonymous 404', (await anon.request.get(base + '/api/media/' + image.id)).status() === 404);
    check('Unpublished and missing project APIs return 404', (await anon.request.get(base + '/api/projects/' + slug)).status() === 404 && (await anon.request.get(base + '/api/projects/missing-local-project')).status() === 404);
    await publicPage.reload();
    await publicPage.getByRole('heading', { name: 'A little off course.', exact: true }).waitFor();
    check('Unpublished case study gives recovery without private content', await publicPage.locator('.studio-project').count() === 0 && await publicPage.locator('meta[name="robots"]').first().getAttribute('content') === 'noindex, nofollow');
    await page.getByRole('button', { name: 'All projects', exact: false }).click();
    await page.getByRole('button', { name: 'New project +', exact: true }).click();
    const orderingSlug = 'clare-ordering-qa-' + Date.now();
    const orderingTitle = 'Clare’s Life Celebrations · ordering QA';
    await page.getByLabel('Project title', { exact: true }).fill(orderingTitle);
    await page.getByLabel('Project address', { exact: true }).fill(orderingSlug);
    await page.getByRole('button', { name: 'Create private draft ↗', exact: true }).click();
    await page.locator('.admin-editor').waitFor();
    await page.getByRole('button', { name: 'All projects', exact: false }).click();
    const beforeOrdering = await (await context.request.get(base + '/api/admin/projects')).json();
    const orderingProject = beforeOrdering.find(project => project.slug === orderingSlug);
    const orderedResponse = page.waitForResponse(response => response.url().endsWith('/api/admin/projects/ordering'));
    await page.getByRole('button', { name: `Move ${orderingTitle} down`, exact: true }).focus(); await page.keyboard.press('Enter');
    const reorderedResponse = await orderedResponse;
    const afterOrdering = await reorderedResponse.json();
    check('Actual keyboard ordering transaction succeeds and preserves private revision metadata', reorderedResponse.status() === 200 && afterOrdering.find(project => project.id === orderingProject.id).sortOrder === 1 && afterOrdering.find(project => project.id === orderingProject.id).version === orderingProject.version && afterOrdering.find(project => project.id === orderingProject.id).publishedVersion === null);
    const staleCsrf = await (await context.request.get(base + '/api/admin/auth/csrf')).json();
    const staleOrdering = await context.request.post(base + '/api/admin/projects/ordering', { headers: { [staleCsrf.headerName]: staleCsrf.token }, data: { items: [{ id: orderingProject.id, expectedUpdatedAt: orderingProject.updatedAt, sortOrder: 9 }] } });
    check('Actual server rejects stale ordering without partially changing the collection', staleOrdering.status() === 409 && (await (await context.request.get(base + '/api/admin/projects/' + orderingProject.id)).json()).sortOrder === 1);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByRole('heading', { name: 'Welcome back.', exact: true }).waitFor();
    await page.getByLabel('Email address', { exact: true }).fill('synthetic-portfolio-owner@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('synthetic-wrong-password');
    const rejectedLogin = page.waitForResponse(r => r.url().endsWith('/api/admin/auth/login'));
    await page.getByRole('button', { name: 'Sign in ↗', exact: true }).click();
    const loginRejected = await rejectedLogin; await page.getByRole('alert').waitFor();
    check('Actual server rejects a wrong password without advancing sign-in', loginRejected.status() === 401 && await page.getByRole('heading', { name: 'Welcome back.', exact: true }).isVisible());
    check('Actual password rejection receives focus and retains the correction fields', await page.getByRole('alert').evaluate(e => document.activeElement === e) && await page.getByLabel('Email address', { exact: true }).inputValue() === 'synthetic-portfolio-owner@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in ↗', exact: true }).click();
    await page.getByLabel('Authenticator or recovery code', { exact: true }).fill('NOT-A-VALID-RECOVERY-CODE');
    const rejectedMfa = page.waitForResponse(r => r.url().endsWith('/api/admin/auth/verify'));
    await page.getByRole('button', { name: 'Verify and continue ↗', exact: true }).click();
    const mfaRejected = await rejectedMfa; await page.getByRole('alert').waitFor();
    check('Actual server rejects an invalid MFA/recovery code and keeps verification usable', mfaRejected.status() >= 400 && await page.getByLabel('Authenticator or recovery code', { exact: true }).isEnabled());
    await page.getByLabel('Authenticator or recovery code', { exact: true }).fill(await freshSyntheticTotp(secret));
    await page.getByRole('button', { name: 'Verify and continue ↗', exact: true }).click();
    await page.getByRole('button', { name: 'New project +', exact: true }).waitFor();
    check('Fresh actual password and MFA recover from both server rejections', true);
    await require('./session-server-journey.cjs').verifyActualSessionExpiry({page,context,anonymous:anon,base,projectId:testProjectId,slug,password,secret,freshCode:freshSyntheticTotp,check});
    check('No uncaught browser errors', report.errors.length === 0);
    console.log('PORTFOLIO_BROWSER_PASS:', report.checks.length, 'checks; evidence:', output);
    return report;
  } catch (error) {
    report.failure = String(error);
    if (debugPage) {
      report.libraryLabels = await debugPage.locator('.admin-image-library article p').allTextContents();
      report.screenOptions = await debugPage.locator('.admin-screen-fields select').allTextContents();
      if (await debugPage.locator('.admin-editor').count()) await debugPage.locator('.admin-editor').screenshot({ path: path.join(output, 'failure-editor.png') });
    }
    throw error;
  }
  finally {
    try { if (testProjectId) await unpublishFixture(testProjectId); }
    finally { await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
  }
};
