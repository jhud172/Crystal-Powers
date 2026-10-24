/* Built preview; read-only unavailable-account fixtures. No real sessions or writes. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base='http://127.0.0.1:8084',output=path.resolve('.codex-runtime/qa/appearance-stability-20261024');
const report={checks:[],errors:[],scope:'Built preview, installed Edge, read-only API fixtures, public/private entry shells, emulated dimensions. Existing features only.'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await page.addInitScript(()=>localStorage.setItem('crystal_prism_visit_v1','completed'));
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.route('**/api/**',route=>{assert.equal(route.request().method(),'GET');const url=route.request().url();return route.fulfill({json:url.endsWith('/projects')?[]:url.endsWith('/auth/session')?{authenticated:false,setupRequired:false}:{ready:false}});});
 const trigger=page.getByRole('button',{name:'Choose appearance',exact:true});
 const panel=page.getByRole('region',{name:'Appearance settings',exact:true});
 try{
  for(const route of ['/about','/admin','/team','/client']){
   await page.goto(base+route);await page.locator('main h1').first().waitFor();
   for(const [width,height] of [[1440,900],[1024,700],[768,600],[390,844],[320,480],[1440,360]]){
    await page.setViewportSize({width,height});await trigger.click();
    check(`${route} ${width}x${height} panel clears header and fits viewport`,await panel.evaluate(node=>{
     const p=node.getBoundingClientRect(),h=document.querySelector('.studio-header').getBoundingClientRect();
     return p.top>=h.bottom+7 && p.left>=0 && p.right<=innerWidth+1 && p.bottom<=innerHeight-5;
    }));
    for(const label of ['Dark','Light','Warm dark','Fresh light','Warm light']){
     const option=panel.getByRole('button',{name:label,exact:true});await option.focus();await page.keyboard.press('Enter');
     check(`${route} ${width} ${label} stays open with selected-option focus`,await option.getAttribute('aria-pressed')==='true' && await option.evaluate(node=>node===document.activeElement) && await trigger.getAttribute('aria-expanded')==='true');
    }
    const effects=panel.getByLabel('Reduce effects',{exact:true});const initial=await effects.isChecked();await effects.setChecked(!initial);
    check(`${route} ${width} effect changes keep menu open`,await panel.isVisible());await effects.setChecked(initial);
    if(width>=768 && height>=600){
     const detail=panel.locator('.studio-quality-trigger');
     await detail.scrollIntoViewIfNeeded();
     const geometry=()=>page.evaluate(()=>{
      const rect=selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height,n.scrollTop];};
      return [scrollX,scrollY,innerWidth,document.documentElement.clientWidth,...rect('.studio-header'),...rect('.studio-appearance-panel'),...rect('.studio-quality-trigger'),...rect('main h1')];
     });
     const stable=await geometry();await detail.click();
     for(let frame=0;frame<4;frame++){
      await page.evaluate(()=>new Promise(requestAnimationFrame));
      const current=await geometry();check(`${route} ${width} opening frame ${frame} preserves page and menu geometry`,current.every((value,index)=>Math.abs(value-stable[index])<.5));
     }
     check(`${route} ${width} options fit inside the existing panel`,await panel.locator('.studio-quality-options').evaluate(node=>{const o=node.getBoundingClientRect(),p=node.closest('.studio-appearance-panel').getBoundingClientRect();return o.top>=p.top && o.bottom<=p.bottom && o.height>70;}));
     await panel.getByRole('radio',{name:'Lighter',exact:true}).check();
     check(`${route} ${width} selection preserves page and menu geometry`,(await geometry()).every((value,index)=>Math.abs(value-stable[index])<.5));
     check(`${route} ${width} detail selection keeps menu open`,await panel.isVisible());
     await page.keyboard.press('Escape');check(`${route} ${width} nested Escape only closes detail options`,await panel.isVisible());
     check(`${route} ${width} closing preserves page and menu geometry`,(await geometry()).every((value,index)=>Math.abs(value-stable[index])<.5));
    }
    if(width===1440&&height===900)await panel.screenshot({path:path.join(output,route.slice(1)+'-desktop.png')});
    check(`${route} ${width} close control has a centred glyph and touch target`,await panel.locator('.studio-appearance-close').evaluate(node=>{const a=node.getBoundingClientRect(),b=node.firstElementChild.getBoundingClientRect();return a.width>=44&&a.height>=44&&Math.abs((a.left+a.right-b.left-b.right)/2)<1;}));
    await panel.getByRole('button',{name:'Close appearance',exact:true}).click();
    check(`${route} ${width} explicit close restores toggle focus`,await panel.count()===0 && await trigger.evaluate(node=>node===document.activeElement));
   }
   await trigger.click();await page.mouse.click(3,350);
   check(`${route} outside click dismisses menu`,await panel.count()===0);
   await trigger.click();await panel.getByRole('button',{name:'Dark',exact:true}).focus();await page.keyboard.press('Escape');
   check(`${route} Escape dismisses and restores focus`,await panel.count()===0 && await trigger.evaluate(node=>node===document.activeElement));
   await trigger.click();await trigger.click();check(`${route} toggle dismisses menu`,await panel.count()===0);
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/about');await page.locator('main h1').waitFor();await page.waitForTimeout(1000);
  await trigger.click();await panel.locator('.studio-quality-trigger').scrollIntoViewIfNeeded();
  const motionGeometry=()=>page.evaluate(()=>{const selectors=['.studio-header','.studio-appearance-panel','.studio-quality-trigger','main h1'];return [scrollX,scrollY,document.documentElement.clientWidth,...selectors.flatMap(selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height,n.scrollTop];})];});
  const original=await motionGeometry();
  for(let repeat=0;repeat<3;repeat++){
   await panel.locator('.studio-quality-trigger').click();
   await panel.getByRole('radio',{name:'Automatic',exact:true}).check();
   const measured=await motionGeometry();report.fullMotionGeometry={original,measured};
   check(`Full motion repeated Automatic ${repeat} keeps geometry stable`,measured.every((value,index)=>Math.abs(value-original[index])<.5));
   if(repeat===0)await panel.screenshot({path:path.join(output,'stable-detail-open.png')});
   await page.keyboard.press('Escape');
   check(`Full motion repeated close ${repeat} keeps geometry stable`,(await motionGeometry()).every((value,index)=>Math.abs(value-original[index])<.5));
   await panel.locator('.studio-quality-trigger').click();await panel.getByRole('radio',{name:'Lighter',exact:true}).check();await page.keyboard.press('Escape');
   check(`Full motion repeated Lighter ${repeat} keeps geometry stable`,(await motionGeometry()).every((value,index)=>Math.abs(value-original[index])<.5));
  }
  check('No captured runtime errors' ,report.errors.length===0);report.passed=true;
 }catch(error){report.failure=error.message;await page.screenshot({path:path.join(output,'failure.png')});throw error;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log('APPEARANCE_BROWSER_PASS:',report.checks.length);
})().catch(error=>{console.error(error);process.exitCode=1;});
