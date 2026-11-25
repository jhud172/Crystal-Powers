/* Run against a local website using synthetic sign-in, report and support responses. */
const assert = require('node:assert/strict');
const { chromium, expect } = require(process.env.CRYSTAL_PLAYWRIGHT_TEST_MODULE || 'playwright/test');

const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:5198';
assert.match(base, /^http:\/\/127\.0\.0\.1:(5198|8084|18084)$/);

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  try {
    for (const mode of ['rejected', 'timer', 'google']) {
      const context = await browser.newContext({viewport: {width:390,height:844}, reducedMotion:'reduce'});
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        if (mode === 'timer') await page.clock.install();
        let signedIn = 0;
        let rejectLog = false;
        let deferReport;
        let lateReportFinished = false;
        let deviceRemovals = 0;
        let reports = 0;
        let lastBearer;
        let expiresAt;
        const activeToken = () => (signedIn === 1 ? 'a' : 'b').repeat(43);
        await page.route('**/api/**', async route => {
          const path = new URL(route.request().url()).pathname;
          const json = (value, status = 200) => route.fulfill({json:value,status});
          if (path === '/api/docks/auth/email' || path === '/api/docks/auth/google') return json({enabled:true});
          if (path.endsWith('/auth/email/request')) return json({},202);
          if (path.endsWith('/auth/email/exchange') || path.endsWith('/auth/google/exchange')) {
            if (route.request().postDataJSON()?.code === 'x'.repeat(43)) return json({},401);
            signedIn++;
            const now = mode === 'timer' ? await page.evaluate(() => Date.now()) : Date.now();
            expiresAt = new Date(now + (mode === 'timer' ? 60_000 : 3_600_000)).toISOString();
            return json({accessToken:activeToken(),expiresAt});
          }
          if (!path.startsWith('/api/docks/')) return json({}, 404);
          lastBearer = route.request().headers().authorization;
          if (path === '/api/docks/devices') return json([
            {id:'one',installationId:'12345678-0000-0000-0000-000000000000',label:'Windows PC',enrolledAt:'2026-11-23T12:00:00Z'},
            {id:'two',installationId:'9abcdef0-0000-0000-0000-000000000000',label:'Windows PC',enrolledAt:'2026-11-24T12:00:00Z'}
          ]);
          if (path === '/api/docks/devices/one' && route.request().method() === 'DELETE') {
            deviceRemovals++;
            return route.fulfill({status:204});
          }
          if (path === '/api/docks/reports') {
            reports++;
            const label = signedIn === 1 ? 'Old private device' : 'New private device';
            if (mode === 'rejected' && reports === 2) await new Promise(resolve => { deferReport = resolve; });
            try {
              return await json({enabled:true,reports:[{deviceId:'one',deviceLabel:label,
                checkedAt:'2026-11-25T15:00:00Z',cpuPercent:14,memoryPercent:null}]});
            } catch { return; }
            finally { if (label === 'Old private device' && reports >= 2) lateReportFinished = true; }
          }
          if (path.endsWith('/diagnostic-log') && rejectLog) return json({},401);
          if (path.endsWith('/diagnostic-log') || path.endsWith('/support-access'))
            return json({grant:deviceRemovals ? null : {reference:'private-support-reference',expiresAt},activity:[]});
          if (path.endsWith('/auth/google/desktop-code')) return json({code:'g'.repeat(43)});
          if (path.endsWith('/auth/sign-out')) return route.fulfill({status:204});
          return json({});
        });
        await page.goto(base + '/docks/reports' + (mode === 'google' ? '?google=ready' : ''));
        const email = page.getByRole('textbox',{name:'Email address'});
        const send = page.getByRole('button',{name:'Send sign-in code',exact:true});
        const code = page.getByLabel('Sign-in code',{exact:true});
        const signIn = page.getByRole('button',{name:'Sign in',exact:true});
        const signInEmail = async invalidFirst => {
          await email.fill('customer@example.invalid');
          await send.click();
          if (invalidFirst) {
            await code.fill('x'.repeat(43));
            await signIn.click();
            await expect(page.getByRole('alert')).toHaveText(/code is invalid or expired/);
            await expect(code).toBeVisible();
          }
          await code.fill('c'.repeat(43));
          await signIn.click();
        };
        if (mode !== 'google') await signInEmail(mode === 'rejected');
        await expect(page.getByRole('heading',{name:'Old private device'})).toBeVisible();
        await expect(page.getByLabel('Diagnostic log reference')).toHaveValue('private-support-reference');
        await page.getByRole('button',{name:'Get a Windows sign-in code'}).click();
        await expect(page.getByLabel('Windows sign-in code')).toHaveValue('g'.repeat(43));
        assert.equal(lastBearer, 'Bearer ' + 'a'.repeat(43));
        if (mode === 'rejected') {
          await page.getByRole('button',{name:'Refresh reports'}).click();
          await expect.poll(() => Boolean(deferReport)).toBe(true);
          rejectLog = true;
          await page.getByRole('button',{name:'Refresh diagnostic log activity'}).click();
          await expect(email).toBeEnabled();
          rejectLog = false;
        } else if (mode === 'timer') {
          await page.clock.fastForward(61_000);
        } else {
          assert(!new URL(page.url()).searchParams.has('google'));
          await page.getByText('Manage enrolled devices',{exact:true}).click();
          const remove = page.getByRole('button',{name:'Remove Windows PC · 12345678'});
          const otherDevice = page.getByRole('button',{name:'Remove Windows PC · 9ABCDEF0'});
          await expect(otherDevice).toBeVisible();
          page.once('dialog', dialog => dialog.dismiss());
          await remove.click();
          assert.equal(deviceRemovals, 0);
          let confirmation;
          page.once('dialog', async dialog => { confirmation = dialog.message(); await dialog.accept(); });
          await remove.click();
          await expect(page.getByRole('status').filter({hasText:'Device removed'})).toBeVisible();
          assert.match(confirmation, /deletes its uploaded summary and diagnostic log\. Saved checks stay/);
          assert.equal(deviceRemovals, 1);
          await expect(remove).toHaveCount(0);
          await expect(otherDevice).toBeVisible();
          await expect(page.getByRole('heading',{name:'Your enrolled devices'})).toBeFocused();
          await expect(page.getByRole('heading',{name:'Old private device'})).toHaveCount(0);
          await expect(page.getByLabel('Diagnostic log reference')).toHaveCount(0);
          await page.getByRole('button',{name:'Sign out'}).click();
        }
        await expect(email).toBeVisible();
        if (mode !== 'google') {
          await expect(page.getByRole('alert')).toHaveText(/Your Crystal Docks session ended/);
          await expect(page.getByRole('heading',{name:'Crystal Docks reports',exact:true})).toBeFocused();
        }
        await expect(page.getByRole('heading',{name:'Old private device'})).toHaveCount(0);
        await expect(page.getByLabel('Diagnostic log reference')).toHaveCount(0);
        await expect(page.getByLabel('Windows sign-in code')).toHaveCount(0);
        await signInEmail(false);
        await expect(page.getByRole('heading',{name:'New private device'})).toBeVisible();
        if (deferReport) {
          deferReport();
          await expect.poll(() => lateReportFinished).toBe(true);
        }
        await expect(page.getByRole('heading',{name:'Old private device'})).toHaveCount(0);
        assert.equal(lastBearer, 'Bearer ' + 'b'.repeat(43));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),true);
        assert.deepEqual(errors,[]);
        console.log(mode + ': verified sign-in, session clearing and fresh account in Chrome');
      } finally { await context.close(); }
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
