/* Selected Liquid Light development compositions, never publication/provider acceptance. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs/promises'), path = require('node:path');
const base = 'http://127.0.0.1:5175', output = path.resolve('.codex-runtime/qa/design-pc');
const report = { base, runtime: 'Installed Edge; selected Liquid Light development reference, actual shared Hero/Services controls and labelled Clare composition; no publication/submission', checks: [], errors: [], tokens: {} };
const check = (name,value) => { assert.ok(value,name); report.checks.push(name); };
const widths=[320,390,768,1024,1440,1920], themes=[['futuristic','Dark'],['clean','Light'],['classic','Warm dark'],['fresh','Fresh light'],['summer-vibes','Warm light']];
const luminance=colour=>{const c=colour.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045 ? v/12.92 : ((v+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const writes=[];page.on('pageerror',error=>report.errors.push(error.message));page.on('request',request=>{if(request.method()!=='GET' && request.url().includes('/api/'))writes.push(request.url());});
  try {
    await page.goto(base+'/design/observatory.html');
    check('Reference is noindex and explicitly development-only',await page.locator('meta[name="robots"]').getAttribute('content')==='noindex, nofollow' && (await page.locator('.liquid-draft-toolbar').innerText()).includes('Development only'));
    const choose=async name=>{await page.getByRole('group',{name:'Preview a composition',exact:true}).getByRole('button',{name,exact:true}).click();await page.locator('.design-composition h1').waitFor();};
    for(const [id,label] of themes){
      await page.setViewportSize({width:1440,height:900});await page.getByRole('button',{name:'Choose appearance',exact:true}).click();await page.getByRole('button',{name:label,exact:true}).click();
      check(label+' unfocused skip link remains outside the viewport',await page.locator('.studio-skip').evaluate(e=>e!==document.activeElement && e.getBoundingClientRect().bottom<=0));
      check(label+' retains its stable appearance ID',await page.locator('body').getAttribute('data-theme')===id);
      const tokens=await page.locator('.studio-shell').evaluate(element=>{const style=getComputedStyle(element),names=['bg','raised','text','muted','line','control-line','accent','signal','button-text','error','success','focus','font-body','font-display','type-body','type-small','type-label','type-caption','type-display','type-section','type-form-title','type-form-section','type-compact-title','leading-body','leading-heading','tracking-display','space-small','gutter','space-section','cut','radius','action-radius','control-target','line-width','focus-width','focus-offset','elevation','motion-short','motion-section','ease'];return Object.fromEntries(names.map(name=>[name,style.getPropertyValue('--studio-'+name).trim()]));});
      report.tokens[id]=tokens;check(label+' defines all semantic colour/type/space/geometry/focus/motion roles',Object.values(tokens).every(Boolean) && parseFloat(tokens['control-target'])>=44);
      for(const name of ['Homepage','Services builder','Case study','Control states']){
        await choose(name);
        for(const width of widths){
          await page.setViewportSize({width,height:900});
          check(label+' / '+name+' / '+width+' fits with one readable title',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1 && document.querySelectorAll('.design-composition h1').length===1));
          check(label+' / '+name+' / '+width+' controls stay within the viewport',await page.locator('.design-composition :is(button,input,select,textarea,summary)').evaluateAll(elements=>elements.every(element=>{const b=element.getBoundingClientRect();return !b.width || (b.left>=-1 && b.right<=innerWidth+1);})));
          if(['futuristic','clean'].includes(id) && [390,1440].includes(width)){await page.locator('.design-composition').screenshot({path:path.join(output,name.replaceAll(' ','-')+'-'+id+'-'+width+'.png')});}
        }
      }
      const input=page.getByLabel('Example email address',{exact:true}),action=page.getByRole('button',{name:'Check example details',exact:true});
      await action.click();check(label+' invalid field retains focus and links its error',await input.getAttribute('aria-invalid')==='true' && await input.getAttribute('aria-describedby')==='reference-error' && await input.evaluate(element=>element===document.activeElement));
      const colours=await page.evaluate(()=>{const shell=getComputedStyle(document.querySelector('.studio-shell')),field=getComputedStyle(document.querySelector('#reference-email'));return {background:shell.backgroundColor,text:shell.color,muted:getComputedStyle(document.querySelector('.reference-hint')).color,error:getComputedStyle(document.querySelector('#reference-error')).color,border:field.borderTopColor,focus:field.outlineColor,focusWidth:field.outlineWidth};});
      check(label+' body/hint/error contrast meets 4.5',contrast(colours.text,colours.background)>=4.5 && contrast(colours.muted,colours.background)>=4.5 && contrast(colours.error,colours.background)>=4.5);
      check(label+' field boundary and focus contrast meet 3',contrast(colours.border,colours.background)>=3 && contrast(colours.focus,colours.background)>=3 && parseFloat(colours.focusWidth)>=2);
      const normal=await action.evaluate(e=>({text:getComputedStyle(e).color,surface:getComputedStyle(e).backgroundColor}));await action.hover();const hover=await action.evaluate(e=>({text:getComputedStyle(e).color,surface:getComputedStyle(e).backgroundColor}));
      check(label+' primary default/hover contrast meets 4.5',contrast(normal.text,normal.surface)>=4.5 && contrast(hover.text,hover.surface)>=4.5);
      await input.fill('example@example.invalid');await input.press('Enter');await page.locator('.reference-success').waitFor();
      const success=await page.locator('.reference-success').evaluate(e=>getComputedStyle(e).color);check(label+' explicit success is readable and never claims delivery',contrast(success,colours.background)>=4.5 && (await page.locator('.reference-success').innerText()).includes('Nothing has been submitted or delivered'));
      await page.getByRole('button',{name:'Reset example',exact:true}).click();check(label+' reset clears input and feedback',await input.inputValue()==='' && await page.locator('.reference-success,#reference-error').count()===0);
      const unavailable=page.getByRole('button',{name:'Unavailable action',exact:true}),before=await unavailable.evaluate(e=>({background:getComputedStyle(e).backgroundColor,transform:getComputedStyle(e).transform}));await unavailable.hover();
      check(label+' disabled action does not hover-lift or change surface',await unavailable.isDisabled() && await unavailable.evaluate((e,b)=>getComputedStyle(e).backgroundColor===b.background && getComputedStyle(e).transform===b.transform,before));
      await page.getByRole('radio',{name:'Expressive',exact:true}).check();check(label+' native selection has checked and visible indicator',await page.getByRole('radio',{name:'Expressive',exact:true}).isChecked() && (await page.locator('.reference-choice:has(:checked)').innerText()).includes('✓'));
      const mobile=page.getByRole('group',{name:'Reference device selection',exact:true}).getByRole('button',{name:'Mobile',exact:true});await mobile.focus();await page.keyboard.press('Space');check(label+' device selection supports keyboard',await mobile.getAttribute('aria-pressed')==='true');
      const disclosure=page.locator('.reference-disclosure summary');await disclosure.focus();await page.keyboard.press('Enter');check(label+' native disclosure supports keyboard',await page.locator('.reference-disclosure').getAttribute('open')!==null);
      await page.setViewportSize({width:320,height:900});await page.locator('.design-reference :is(h1,h2,p,label,button,summary,legend,span,input)').evaluateAll(elements=>{const sizes=elements.map(e=>parseFloat(getComputedStyle(e).fontSize));elements.forEach((e,i)=>e.style.fontSize=sizes[i]*2+'px');});
      check(label+' 200 percent reference text reflows at 320px',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await choose('Homepage');await page.getByRole('button',{name:'Explore the work',exact:true}).click();await page.locator('.liquid-reveal-detail img').waitFor();check(label+' actual selected opening uses the approved capture',await page.locator('.liquid-reveal-detail img').evaluate(e=>e.complete && e.naturalWidth===1440));
      await page.keyboard.press('Escape');check(label+' Escape closes the actual opening and returns focus',await page.getByRole('button',{name:'Explore the work',exact:true}).evaluate(e=>e===document.activeElement) && await page.locator('.liquid-reveal-detail').isHidden());
      await choose('Case study');await page.getByRole('group',{name:'Choose reference screenshot',exact:true}).getByRole('button',{name:'Mobile',exact:true}).click();await page.locator('.design-reference-screens img').scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const image=document.querySelector('.design-reference-screens img');return image.complete && image.naturalWidth===390;});check(label+' approved mobile capture retains its own aspect ratio',await page.locator('.design-reference-screens img').evaluate(e=>e.complete && e.naturalWidth===390 && e.naturalHeight===844));
      check(label+' case composition is labelled without invented results',(await page.locator('.design-reference-note').innerText()).includes('does not publish a portfolio entry'));
    }
    await choose('Services builder');await page.locator('.enquiry-steps').getByRole('button',{name:/Review$/}).click();
    check('Reference uses the real builder validation and field focus',await page.locator('#packageSelection').getAttribute('aria-invalid')==='true' && await page.locator('#packageSelection').evaluate(e=>e===document.activeElement));
    await choose('Homepage');await page.locator('.design-composition').getByRole('link',{name:'Start a project',exact:true}).click();check('Reference links cannot submit or leave the composition',(await page.locator('.design-reference-notice').innerText()).includes('visual reference') && new URL(page.url()).pathname==='/design/observatory.html');
    check('No API mutation or browser error',writes.length===0 && report.errors.length===0);
  }catch(error){report.failure=error.stack;throw error;}
  finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
  console.log('DESIGN_BROWSER_PASS: '+report.checks.length+' checks');
})().catch(error=>{console.error(error);process.exitCode=1;});
