/* Synthetic local presentation checks. Never attaches to a real owner session. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8083';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8083|8084)$/);
const output = path.resolve('.codex-runtime/qa/owner-design');
const report = { checks: [], errors: [], scope: 'Synthetic local owner dashboard, members and role layout; no real account writes' };
function check(name, value) { assert.ok(value, name); report.checks.push(name); }
const member = { id: 'synthetic-member', displayName: 'Example publisher with a longer display name', email: 'publisher@example.invalid', role: 'ADMIN', state: 'INVITED', credentialsVersion: 1 };
const permissions = ['READ_CHANNELS', 'EDIT_PROJECTS', 'PUBLISH_PROJECTS'];
const profile = { id: 'synthetic-profile', name: 'Example restricted publisher', baseRole: 'ADMIN', permissions, archived: false, version: 0 };
const content = { title: 'Example project with a longer descriptive title', category: 'WEBSITE', summary: 'Synthetic layout evidence only.', overview: '', approach: '', outcome: '', liveUrl: '', technologies: [], displayDevice: 'laptop', coverMediaId: null, coverAlt: '', gallery: [] };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()).pathname;
    let body = {};
    if (url === '/api/admin/auth/session') body = { authenticated: true, email: 'owner@example.invalid' };
    else if (url === '/api/admin/projects') body = [{ id: 'synthetic-project', slug: 'example-project', featured: false, sortOrder: 0, content, version: 1, publishedVersion: null, archived: false, updatedAt: '2026-10-29T12:00:00Z' }];
    else if (url === '/api/team/members/management') body = { actorScope: 'OWNER', members: [{ member, manageable: true }], creatableRoles: ['ADMIN','MODERATOR','SUPPORT','MEMBER'] };
    else if (url === '/api/team/roles') body = { profiles: [profile], assignments: [{ memberId: member.id, profileId: profile.id, credentialsVersion: 1 }], bases: { ADMIN: permissions, MEMBER: ['READ_CHANNELS'], SUPPORT: ['READ_CHANNELS'], MODERATOR: ['READ_CHANNELS'] }, managementGrants: permissions, manageableMembers: [member.id], editableProfiles: [profile.id] };
    else if (url === '/api/admin/auth/csrf') body = { token: 'synthetic', headerName: 'X-CSRF-TOKEN' };
    else if (url === '/api/team/auth/session') body = { authenticated: true, member: {displayName:'Synthetic owner',role:'OWNER'}, permissions:['READ_CHANNELS','MANAGE_MEMBERS','MANAGE_ROLES'] };
    else if (url === '/api/team/workspace') body = { displayName:'Synthetic owner',memberId:null,ownerId:'90000000-0000-4000-8000-000000000001',permissions:['READ_CHANNELS','MANAGE_MEMBERS','MANAGE_ROLES'],channels:[],settings:{branding:{name:'Synthetic workspace',tagline:'',version:0},preferences:{compact:false,unreadBadges:false,mentionAlerts:false,version:0},displayName:'Synthetic owner',editableName:false,channelPreferences:[]} };
    else if (url === '/api/team/unread') body=[];
    else if (url === '/api/team/mentions') body={mentions:[],nextCursor:null};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  async function layout(name) {
    const result = await page.evaluate(() => {
      const nav = Array.from(document.querySelectorAll('.admin-workspace-nav button')).map(el => el.getBoundingClientRect());
      const collisions = nav.some((a,i) => nav.slice(i+1).some(b => Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));
      const panel = document.querySelector('.admin-panel');
      return { fits: document.documentElement.scrollWidth <= innerWidth + 1, collisions, targets: nav.every(r=>r.height>=44), gap: panel ? parseFloat(getComputedStyle(panel).rowGap) : 24 };
    });
    check(`${name}: no overflow, overlapping navigation or squeezed targets`, result.fits && !result.collisions && result.targets && result.gap >= 20);
  }
  try {
    for (const theme of ['futuristic','classic','clean','fresh','summer-vibes']) {
      await page.context().addCookies([{ name: 'crystal_theme', value: theme, url: base }]);
      await page.goto(base + '/admin');
      await page.getByRole('heading', { name: /Your work/ }).waitFor();
      check(`${theme}: requested appearance actually applied`, await page.locator('body').getAttribute('data-theme') === theme);
      for (const width of [320,390,768,1024,1440,1920]) { await page.setViewportSize({width,height:1000}); await layout(`${theme} dashboard ${width}`); }
      await page.getByRole('button',{name:'Team members',exact:true}).click();
      await page.getByRole('button',{name:'Manage custom role profiles'}).waitFor({state:'visible'});
      for (const width of [320,390,768,1024,1440,1920]) { await page.setViewportSize({width,height:1000}); await layout(`${theme} members ${width}`); }
      await page.setViewportSize({width:1440,height:1000});
      check(`${theme}: invitation fields and submit have breathing room`, await page.locator('.admin-form-fields').evaluate(el=>getComputedStyle(el).display==='grid' && parseFloat(getComputedStyle(el).rowGap)>=20));
      if(theme==='futuristic') await page.screenshot({path:path.join(output,'members-desktop.png'),fullPage:true});
      await page.getByRole('button',{name:'Manage custom role profiles'}).click();
      await page.getByRole('button',{name:'Edit Example restricted publisher',exact:true}).waitFor();
      for (const width of [320,390,768,1024,1440,1920]) { await page.setViewportSize({width,height:1000}); await layout(`${theme} roles ${width}`); }
      if(theme==='futuristic') { await page.setViewportSize({width:390,height:844}); await page.screenshot({path:path.join(output,'roles-mobile.png'),fullPage:true}); }
      await page.getByRole('button',{name:'Account security',exact:true}).click();
      for (const action of ['Password','Authenticator','Recovery codes']) {
        await page.getByRole('button',{name:action,exact:true}).click();
        for (const width of [320,390,768,1024,1440,1920]) { await page.setViewportSize({width,height:1000}); await layout(`${theme} security ${action} ${width}`); }
      }
      check(`${theme}: security panel centred and choice cards rounded`, await page.locator('.admin-account-settings').evaluate(el=>{const r=el.getBoundingClientRect();return Math.abs(r.left-(innerWidth-r.right))<18 && parseFloat(getComputedStyle(el.querySelector('.admin-security-choices button')).borderRadius)>=12;}));
      if(theme==='futuristic') { await page.setViewportSize({width:1440,height:1000}); await page.screenshot({path:path.join(output,'security-desktop.png'),fullPage:true}); await page.setViewportSize({width:390,height:844}); await page.screenshot({path:path.join(output,'security-mobile.png'),fullPage:true}); }
      await page.getByRole('button',{name:'← All projects',exact:true}).click();
      await page.getByRole('button',{name:'Team members',exact:true}).click();
      await page.getByRole('button',{name:'Manage custom role profiles',exact:true}).click();
      await page.getByRole('button',{name:'New profile',exact:true}).waitFor();
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    check('Reduced motion disables panel animation and control transitions', await page.locator('.admin-panel').evaluate(el => getComputedStyle(el).animationName === 'none' && getComputedStyle(el.querySelector('button')).transitionDuration === '0s'));
    await page.getByRole('button',{name:'New profile',exact:true}).focus();
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    check('Keyboard focus remains visible', await page.getByRole('button',{name:'New profile',exact:true}).evaluate(el=>el.matches(':focus-visible') && parseFloat(getComputedStyle(el).outlineWidth)>=2));
    await page.goto(base+'/team');
    await page.getByRole('button',{name:'Team members',exact:true}).click();
    await page.getByRole('button',{name:'Create invitation',exact:true}).waitFor();
    for (const width of [320,390,768,1024,1440,1920]) { await page.setViewportSize({width,height:1000}); await layout(`embedded team members ${width}`); }
    check('Embedded team panel has the same spaced fieldset',await page.locator('.team-conversation .admin-form-fields').evaluate(el=>parseFloat(getComputedStyle(el).rowGap)>=20));
    await page.setViewportSize({width:1440,height:1000}); await page.screenshot({path:path.join(output,'embedded-members-desktop.png'),fullPage:true});
    check('No uncaught runtime errors', report.errors.length===0);
    await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
    console.log('OWNER_DESIGN_PASS:',report.checks.length);
  } catch(error) { report.failure=String(error); await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)); throw error; }
  finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
