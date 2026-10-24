/* Uses installed Playwright only. Portfolio responses are labelled browser fixtures; models are real local assets. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8080';
assert.ok(/^http:\/\/127\.0\.0\.1:(8080|8083|8084|5175)$/.test(base), 'Use an isolated loopback runtime');
const output = path.resolve('.codex-runtime/qa/home-pc');
const report = { base, checks: [], errors: [], layouts: [], runtime: 'installed Edge; emulated viewports; labelled approved-Clare browser data/image fixtures; real local WebGL assets' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const project = { id: 'home-clare-fixture', slug: 'home-clare-fixture', featured: true, sortOrder: 0, content: { title: 'Clare’s Life Celebrations · local preview', category: 'WEBSITE', summary: 'A personal website for Clare’s celebrant services, with ceremony information and an enquiry journey.', overview: 'A clear way to explore ceremonies.', approach: 'Responsive ceremony pages and a focused enquiry.', outcome: 'A delivered website. No commercial metrics are claimed.', liveUrl: 'https://clareslifecelebrations.com', technologies: ['Java', 'Spring Boot'], displayDevice: 'laptop', coverMediaId: 'home-clare-desktop-fixture', coverAlt: 'Approved Clare homepage desktop capture', gallery: [], screens: { desktop: { mediaId: 'home-clare-desktop-fixture', alt: 'Clare homepage on desktop' }, mobile: { mediaId: 'home-clare-mobile-fixture', alt: 'Clare homepage on mobile' } } } };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  const capture = await fs.readFile(path.resolve('frontend/design/approved-clare.jpg'));
  let debugPage;
  async function context(reducedMotion = 'no-preference') {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion });
    let mode = 'ready', calls = 0, imageFailure = false;
    await ctx.route('**/api/projects', async route => {
      calls++; await route.fulfill({ status: mode === 'error' ? 503 : 200, contentType: 'application/json', body: JSON.stringify(mode === 'error' ? { message: 'Synthetic portfolio outage' } : mode === 'empty' ? [] : [project]) });
    });
    await ctx.route('**/api/media/home-clare-*', route => imageFailure ? route.abort() : route.fulfill({ status: 200, contentType: 'image/jpeg', body: capture }));
    const page = await ctx.newPage(); const requests = [];
    page.on('request', request => requests.push(request.url())); page.on('pageerror', error => report.errors.push(error.message));
    return {ctx,page,requests,calls:()=>calls,setMode:value=>{mode=value;},failImage:value=>{imageFailure=value;}};
  }
  try {
    const reduced = await context('reduce'); const page=reduced.page; debugPage=page;
    await page.goto(base + '/'); await page.locator('.liquid-reveal h2').filter({hasText:project.content.title}).waitFor();
    check('Opening and featured work share one initial published-project read',reduced.calls()===1);
    check('Selected opening is DOM light artwork without automatic Three or WebGL',await page.locator('canvas').count()===0 && !reduced.requests.some(url=>/vendor-three|ModelCanvas|observatory\.glb/.test(url)));
    check('Closed opening still offers project details and the primary contact action',await page.locator('.liquid-reveal-copy a').getAttribute('href')==='/portfolio/'+project.slug && await page.locator('.liquid-primary').getAttribute('href')==='/contact?intent=general');
    for(const width of [320,390,768,1024,1440,1920]) {
      await page.setViewportSize({width,height:900});
      check('Home '+width+' has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      check('Home '+width+' offer and meaningful contact action remain visible',await page.locator('#hero-title').isVisible() && await page.locator('.liquid-primary').isVisible());
      if(width<=390)check('Home '+width+' contact action fits the first phone screen',await page.locator('.liquid-primary').evaluate(element=>element.getBoundingClientRect().bottom<=844));
    }
    await page.setViewportSize({width:390,height:844});
    const opener=page.getByRole('button',{name:'Explore the work',exact:true});await opener.focus();await page.keyboard.press('Enter');
    check('Keyboard opens the selected project preview',await page.locator('.liquid-reveal-detail').isVisible() && await page.locator('.liquid-reveal-media img').getAttribute('src')==='/api/media/home-clare-desktop-fixture');
    check('Reduced opening has no owned animation or replay control',await page.locator('.liquid-light-veil').evaluate(element=>element.getAnimations().length===0) && await page.getByRole('button',{name:'Replay opening',exact:true}).count()===0);
    await page.locator('.liquid-reveal-detail').getByRole('button',{name:'Close preview',exact:true}).focus();await page.keyboard.press('Escape');
    check('Escape closes the preview and restores its opener',await page.locator('.liquid-reveal-detail').isHidden() && await page.getByRole('button',{name:'Explore the work',exact:true}).evaluate(element=>element===document.activeElement));
    await reduced.ctx.close();

    const live=await context();const art=live.page;debugPage=art;await art.goto(base+'/');await art.locator('.liquid-light-art img').waitFor();
    await art.locator('.liquid-light-art img').evaluate(image=>image.decode());
    check('Live light uses the smaller WebP delivery',await art.locator('.liquid-light-art img').getAttribute('src')==='/renders/liquid-light/hero.webp');
    await art.getByRole('button',{name:'Explore the work',exact:true}).click();
    check('Opening starts exactly one veil timeline',await art.locator('.liquid-light-veil').evaluate(element=>element.getAnimations().length===1));
    await art.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.liquid-light-veil')).opacity)<.18);
    check('Owned opening reaches its revealed light endpoint',await art.locator('.liquid-reveal-detail').isVisible());
    await art.getByRole('button',{name:'Replay opening',exact:true}).click();
    check('Replay preserves the preview and the replay button focus',await art.locator('.liquid-reveal-detail').isVisible() && await art.getByRole('button',{name:'Replay opening',exact:true}).evaluate(element=>element===document.activeElement));
    for(let index=0;index<5;index++){await art.getByRole('button',{name:index%2===0 ? 'Close the experience' : 'Explore the work',exact:true}).click();}
    check('Repeated reversal leaves a usable closed preview and no extra veil',await art.locator('.liquid-reveal-detail').isHidden() && await art.locator('.liquid-light-veil').count()===1);
    for(const theme of ['Dark','Light','Warm dark','Fresh light','Warm light']){
      await art.getByRole('button',{name:'Choose appearance',exact:true}).click();await art.getByRole('button',{name:theme,exact:true}).click(); await art.keyboard.press('Escape');
      const contrast=await art.locator('.liquid-primary').evaluate(element=>{
        const style=getComputedStyle(element);
        const luminance=colour=>{const channels=colour.match(/[\d.]+/g).slice(0,3).map(value=>{const v=Number(value)/255;return v<=.04045 ? v/12.92 : ((v+.055)/1.055)**2.4;});return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
        const fg=luminance(style.color),bg=luminance(style.backgroundColor);return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
      });
      check(theme+' primary contact label contrasts with its solid button surface',contrast>=4.5);
      for(const width of [390,1440]){await art.setViewportSize({width,height:900});check(theme+' '+width+' opening reflows',await art.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
      await art.screenshot({path:path.join(output,'liquid-'+theme.replaceAll(' ','-')+'.png'),fullPage:true});
    }
    await live.ctx.close();

    const failed=await context();debugPage=failed.page;failed.failImage(true);await failed.page.goto(base+'/');await failed.page.getByRole('button',{name:'Explore the work',exact:true}).click();
    const reload=failed.page.getByRole('button',{name:'Reload preview',exact:true});await reload.waitFor();
    check('Failed screenshot retains project link and explicit retry',await failed.page.locator('.liquid-reveal-copy a').isVisible() && await reload.isVisible());
    failed.failImage(false);await reload.focus();await reload.click();await failed.page.locator('.project-artwork-status').filter({hasText:'Preview loaded.'}).waitFor();
    check('Successful retry keeps its keyboard target mounted',await reload.evaluate(element=>element===document.activeElement));await failed.ctx.close();

    for(const broken of ['webp','both']){
      const fallback=await context();debugPage=fallback.page;await fallback.ctx.route('**/renders/liquid-light/hero.webp',route=>route.abort());if(broken==='both')await fallback.ctx.route('**/renders/liquid-light/hero.png',route=>route.abort());
      await fallback.page.goto(base+'/');
      if(broken==='webp'){await fallback.page.waitForFunction(()=>document.querySelector('.liquid-light-art img')?.getAttribute('src')==='/renders/liquid-light/hero.png');check('WebP failure retries the original PNG',await fallback.page.locator('.liquid-light-art img').isVisible());}
      else{await fallback.page.locator('.liquid-light-art[data-failed="true"]').waitFor();check('Total art failure preserves offer and contact without a running veil',await fallback.page.locator('#hero-title').isVisible() && await fallback.page.locator('.liquid-primary').isVisible() && await fallback.page.locator('.liquid-light-veil').count()===0);}
      await fallback.ctx.close();
    }
    for(const mode of ['empty','error']){const state=await context('reduce');debugPage=state.page;state.setMode(mode);await state.page.goto(base+'/');await state.page.locator('#selected-work').waitFor();check(mode+' portfolio keeps offer and contact',await state.page.locator('#hero-title').isVisible() && await state.page.locator('.liquid-primary').isVisible());if(mode==='error'){const retry=state.page.getByRole('button',{name:'Try again',exact:true});await retry.waitFor();state.setMode('ready');await retry.click();await state.page.locator('.liquid-reveal h2').filter({hasText:project.content.title}).waitFor();check('Portfolio API retry restores selected work',await state.page.locator('.liquid-reveal-copy a').getAttribute('href')==='/portfolio/'+project.slug);}await state.ctx.close();}
    check('No uncaught homepage browser errors',report.errors.length===0);
    console.log('HOME_BROWSER_PASS:',report.checks.length,'checks; evidence:',output);
  }catch(error){report.failure=String(error);if(debugPage && !debugPage.isClosed())await debugPage.screenshot({path:path.join(output,'failure.png')});throw error;}
  finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
