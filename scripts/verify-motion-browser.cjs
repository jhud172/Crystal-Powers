/* Returning-visitor feature regression; first-visit Companion is verified separately. */
/* Local read-only browser QA. Visibility signals are deterministic emulation, explicitly labelled. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'); const path = require('node:path'); const assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.match(base, /^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const output = path.resolve('.codex-runtime/qa/motion-pc');
const report = { candidateSha256:process.env.CRYSTAL_QA_CANDIDATE_SHA256, base, checks: [], errors: [], samples: [], scope: 'Existing features only; the excluded Companion has a separately recorded one-listener allowance. Built local native routes/preferences/canvas; read-only labelled project fixture. Headless emulated viewports. Hidden-state dispatch is deterministic document visibility emulation, not native tab acceptance.' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const project = { id: 'qa-motion', slug: 'qa-motion', featured: true, sortOrder: 0, content: { title: 'LOCAL QA — motion lifecycle fixture', category: 'WEBSITE', summary: 'Synthetic acceptance fixture, never published client work.', overview: '', approach: '', outcome: '', liveUrl: '', technologies: [], displayDevice: 'laptop', coverMediaId: 'qa-motion-screen', coverAlt: 'Own studio artwork for local QA', gallery: [], screens: { desktop: { mediaId: 'qa-motion-screen', alt: 'Own desktop screen' }, mobile: { mediaId: 'qa-motion-screen', alt: 'Own screen for lifecycle testing' } } } };
(async () => {
  await fs.mkdir(output, { recursive: true });
  const screen = await fs.readFile('frontend/public/renders/studio-screen.png');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    await context.addInitScript(() => {
    localStorage.setItem('crystal_prism_visit_v1', JSON.stringify({status:'completed',version:1}));
      const targets = new WeakMap(); const counts = {};
      const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
      function key(target, type) { return target === document && type === 'visibilitychange' ? 'visibility' : typeof target.media === 'string' && type === 'change' ? target.media : null; }
      EventTarget.prototype.addEventListener = function (type, listener, options) {
        const name = key(this, type);
        if (name) { let listeners = targets.get(this); if (!listeners) targets.set(this, listeners = new Set()); if (!listeners.has(listener)) { listeners.add(listener); counts[name] = (counts[name] || 0) + 1; } }
        return add.call(this, type, listener, options);
      };
      EventTarget.prototype.removeEventListener = function (type, listener, options) {
        const name = key(this, type); if (name && targets.get(this)?.delete(listener)) counts[name]--;
        return remove.call(this, type, listener, options);
      };
      window.__motionCounts = counts; window.__motionDraws = 0;
      for (const Constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) for (const method of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const original = Constructor?.prototype[method]; if (original) Constructor.prototype[method] = function (...args) { window.__motionDraws++; return original.apply(this, args); };
      }
    });
    await context.route('**/api/site/privacy/status',route=>route.fulfill({json:{ready:false}}));
    await context.route('**/api/projects**', route => route.fulfill({ json: route.request().url().includes('/qa-motion') ? project : [project] }));
    await context.route('**/api/media/qa-motion-screen', route => route.fulfill({ contentType: 'image/png', body: screen }));
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    const writes = []; page.on('request', request => { if (request.url().includes('/api/') && request.method() !== 'GET') writes.push(request.url()); });
    const shell = page.locator('.studio-shell'); const hero=page.locator('.liquid-hero');
    async function detail(value){
      await page.getByRole('button',{name:'Choose appearance',exact:true}).click();await page.locator('.studio-quality-trigger').click();
      await page.getByRole('radio',{name:{automatic:'Automatic',low:'Lighter',standard:'Balanced',high:'Detailed'}[value],exact:true}).check();
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
    }
    async function reduced(value){await page.getByRole('button',{name:'Choose appearance',exact:true}).click();await page.getByLabel('Reduce effects',{exact:true}).setChecked(value);await page.keyboard.press('Escape');}
    async function visible(value){await page.evaluate(value=>{if(value)delete document.visibilityState;else Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));},value);}
    async function policy(mode){await page.waitForFunction(mode=>document.querySelector('.studio-shell')?.dataset.motion===mode,mode);}
    async function listeners(label,expected){
      // The excluded dock owns one usePublishedProjects visibility subscription.
      // Keep the existing scene count exact and assert that the total never grows across cycles.
      const companionAllowance=await page.locator('.prism-companion').count();
      assert.ok(companionAllowance<=1);const existingExpected=expected;expected+=companionAllowance;
      report.samples.push({label,existingExpected,companionAllowance,observedBeforeWait:await page.evaluate(()=>window.__motionCounts)});
      await page.waitForFunction(expected=>window.__motionCounts.visibility===expected,expected);
      const counts=await page.evaluate(()=>window.__motionCounts);report.samples.push({label,counts});
      check(label+' shared visibility listeners stay bounded',counts.visibility===expected);
      check(label+' owns one system-motion subscription',counts['(prefers-reduced-motion: reduce)']===1);
      check(label+' owns one compact-motion subscription',counts['(max-width: 480px)']===1);
    }
    await page.goto(base+'/');await hero.waitFor();await listeners('initial Home',2);
    check('Home starts with artwork and no automatic canvas',await page.locator('canvas:not(.prism-stars)').count()===0);
    check('Section content is readable before any cue',await page.locator('[data-reveal]').evaluate(node=>Number(getComputedStyle(node).opacity)>=.95));
    for(const width of [390,768,1440]){
      await page.setViewportSize({width,height:1000});
      if(width>=768)await detail('automatic');
      await policy(width<=480?'light':'full');
      check(width+' preserves readable content and native reflow',await page.locator('main h1').isVisible() && await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(width>=768){
        await detail('low');await policy('light');
        const animations=await shell.evaluate(root=>root.getAnimations({subtree:true}).map(animation=>({kind:animation.constructor.name,name:animation.animationName || '',target:animation.effect?.target?.className || ''})));
        report.samples.push({label:width+' Lighter animation audit',animations});
        await page.waitForFunction(()=>document.querySelector('.studio-shell').getAnimations({subtree:true}).filter(animation=>animation.constructor.name!=='CSSTransition' && !animation.effect?.target?.classList?.contains('liquid-light-flow') && !animation.effect?.target?.closest?.('.prism-companion')).length===0);
        check(width+' Lighter stops decorative animation while retaining native feedback',await hero.locator('.liquid-light-flow').evaluate(node=>getComputedStyle(node).animationName==='liquid-light-flow'));
        await detail('standard');await policy('full');
      }else{await page.getByRole('button',{name:'Choose appearance',exact:true}).click();check('Phone has no ineligible 3D detail selector',await page.locator('.studio-quality-trigger').count()===0);await page.keyboard.press('Escape');}
      await page.emulateMedia({reducedMotion:'reduce'});await policy('reduced');
      await hero.getByRole('button',{name:'Explore the work',exact:true}).click();
      check(width+' reduced-motion reveal is immediate and canvas-free',await hero.getAttribute('data-open')==='true' && await page.locator('canvas:not(.prism-stars)').count()===0);
      await hero.getByRole('button',{name:'Close preview',exact:true}).click();
      await page.emulateMedia({reducedMotion:'no-preference'});await policy(width<=480?'light':'full');
      await reduced(true);await policy('reduced');
      check(width+' explicit reduction retains still artwork',await hero.locator('img').first().isVisible() && await page.locator('canvas:not(.prism-stars)').count()===0);
      await reduced(false);await policy(width<=480?'light':'full');
    }
    await page.setViewportSize({width:1440,height:1000});await detail('standard');
    const logo=page.locator('header .brand-crystal-button');await logo.click();
    await page.waitForFunction(()=>document.querySelector('header .brand-scene')?.dataset.ready==='true');
    await visible(false);await policy('paused');await page.locator('canvas:not(.prism-stars)').waitFor({state:'detached'});
    const draws=await page.evaluate(()=>window.__motionDraws);await page.waitForTimeout(250);
    check('Emulated hidden state retires the canvas and stops draw submissions',await page.evaluate(before=>window.__motionDraws===before,draws));
    check('Hidden light loop is paused',await hero.locator('.liquid-light-flow').evaluate(el=>getComputedStyle(el).animationPlayState==='paused'));
    await visible(true);await policy('full');await page.locator('header canvas').waitFor();
    check('Visible logo resumes with one owned canvas',await page.locator('canvas:not(.prism-stars)').count()===1);await page.keyboard.press('Escape');
    for(let index=0;index<3;index++){
      await hero.locator('.liquid-reveal-copy a').click();const stage=page.locator('.studio-device-stage');
      await stage.getByRole('button',{name:/Explore this project in 3D/}).click();await page.locator('.model-stage[data-ready="true"]').waitFor();
      check('cycle'+index+' case owns one canvas',await page.locator('canvas:not(.prism-stars)').count()===1);await listeners('cycle'+index+' case',3);
      await page.locator('header').getByRole('link',{name:'Crystal Powers home',exact:true}).click();await hero.waitFor();
      check('cycle'+index+' returning Home retires optional device rendering',await page.locator('canvas:not(.prism-stars)').count()===0);await listeners('cycle'+index+' Home',2);
    }
    await page.getByRole('navigation',{name:'Primary navigation',exact:true}).getByRole('link',{name:'Services',exact:true}).click();await page.locator('main h1').waitFor();
    check('Plain route keeps main focus and zero canvases',await page.locator('main').evaluate(el=>el===document.activeElement) && await page.locator('canvas:not(.prism-stars)').count()===0);await listeners('plain route',1);
    const fallbackContext=await browser.newContext();await fallbackContext.addInitScript(()=>{localStorage.setItem('crystal_prism_visit_v1',JSON.stringify({status:'completed',version:1}));window.IntersectionObserver=undefined;});
    await fallbackContext.route('**/api/projects',route=>route.fulfill({json:[]}));await fallbackContext.route('**/api/site/privacy/status',route=>route.fulfill({json:{ready:false}}));
    const fallback=await fallbackContext.newPage();fallback.on('pageerror',error=>report.errors.push(error.message));
    await fallback.goto(base+'/');await fallback.locator('[data-reveal]').first().waitFor();
    check('Missing observer preserves visible page content',await fallback.locator('[data-reveal]').first().evaluate(el=>Number(getComputedStyle(el).opacity)>=.95));await fallbackContext.close();
    check('No API writes or uncaught browser errors',writes.length===0 && report.errors.length===0);
    console.log('MOTION_BROWSER_PASS:',report.checks.length,'checks; current Liquid Light/optional stage lifecycle');await context.close();
  }catch(error){report.failure=String(error);throw error;}
  finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
