/* Crystal Studio: actual local Blender asset and WebGL, read-only API fixtures. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const output=path.resolve('.codex-runtime/qa/crystal-glass-20261024'),base='http://127.0.0.1:8084';
const report={checks:[],errors:[],requests:[],scope:'Installed Edge, actual Blender GLB/WebGL, built preview, read-only account/portfolio fixtures; viewport emulation, not deployed/native device acceptance.'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(45000);
 await page.addInitScript(()=>{localStorage.setItem('crystal_prism_visit_v1','completed');window.__studioDraws=0;for(const name of ['drawElements','drawArrays']){const draw=WebGL2RenderingContext.prototype[name];WebGL2RenderingContext.prototype[name]=function(...args){window.__studioDraws++;return draw.apply(this,args);};}});
 await page.addInitScript(()=>{
  window.__studioShaderErrors=[];
  const status=WebGL2RenderingContext.prototype.getProgramParameter;
  WebGL2RenderingContext.prototype.getProgramParameter=function(program,parameter){const result=status.call(this,program,parameter);if(parameter===this.LINK_STATUS&&!result&&!this.isContextLost()&&this.isProgram(program))window.__studioShaderErrors.push(this.getProgramInfoLog(program)+(this.getAttachedShaders(program)||[]).map(shader=>this.getShaderInfoLog(shader)).join(' | '));return result;};
  const names=new WeakMap();const locate=WebGL2RenderingContext.prototype.getUniformLocation;
  WebGL2RenderingContext.prototype.getUniformLocation=function(program,name){const location=locate.call(this,program,name);if(location)names.set(location,name);return location;};
  const scalar=WebGL2RenderingContext.prototype.uniform1f;
  WebGL2RenderingContext.prototype.uniform1f=function(location,value){if(window.__recordGlass&&names.get(location)==='signatureGradient')(window.__glassGradient||=[]).push(value);return scalar.call(this,location,value);};
  const vector=WebGL2RenderingContext.prototype.uniform3f;
  WebGL2RenderingContext.prototype.uniform3f=function(location,x,y,z){if(window.__recordLight&&names.get(location)==='directionalLights[0].color')(window.__glassLight||=[]).push([x,y,z]);return vector.call(this,location,x,y,z);};
  const matrix=WebGL2RenderingContext.prototype.uniformMatrix4fv;
  WebGL2RenderingContext.prototype.uniformMatrix4fv=function(location,transpose,value){if(window.__recordUnfold&&names.get(location)==='modelMatrix')(window.__glassUnfold||=[]).push(value[14]);return matrix.call(this,location,transpose,value);};
 });
 page.on('pageerror' ,error=>report.errors.push(error.message));page.on('request',request=>{if(/liquid-brand|crystal-powers-logo-3d/.test(request.url()))report.requests.push(request.url());});
 await page.route('**/api/**',route=>{assert.equal(route.request().method(),'GET');return route.fulfill({json:route.request().url().endsWith('/projects')?[]:{ready:false}});});
 const header=page.locator('header.studio-header'),trigger=header.locator('.brand-crystal-button'),panel=page.getByRole('region',{name:'Crystal Powers logo experience'});
 const ready=()=>page.waitForFunction(()=>document.querySelector('.brand-scene')?.dataset.ready==='true'&&document.querySelector('.brand-scene canvas')?.dataset.preparing!=='true');
 try{
  await page.goto(base+'/about');await page.locator('main h1').waitFor();
  check('Logo remains SVG with no arrival WebGL',await page.locator('canvas').count()===0);
  await trigger.click();await ready();
  check('Default loads original Blender signature GLB',report.requests.some(url=>url.includes('liquid-brand-crystal.glb'))&&!report.requests.some(url=>url.includes('crystal-powers-logo-3d.glb')));
  check('One ready optional canvas',await page.locator('canvas').count()===1);
  const canvas=panel.locator('canvas'),handle=await canvas.elementHandle();
  await panel.screenshot({path:path.join(output,'studio-default.png')});
  const sampleFrames=()=>page.evaluate(async()=>{const frames=[];for(let i=0;i<14;i++){await new Promise(requestAnimationFrame);frames.push({prepared:document.querySelector('.brand-scene canvas')?.dataset.preparing,poster:document.querySelector('.brand-scene img')&&getComputedStyle(document.querySelector('.brand-scene img')).visibility});}return frames;});
  await page.evaluate(()=>{window.__recordGlass=true;window.__glassGradient=[];});
  await panel.getByRole('button',{name:'Rose',exact:true}).click();
  const finishFrames=await sampleFrames();
  const gradients=await page.evaluate(()=>window.__glassGradient||[]);
  check('Finish interpolates real glass uniforms through intermediate values',gradients.filter(value=>value>.02&&value<.98).length>4&&new Set(gradients.map(value=>value.toFixed(4))).size>4);
  check('Material morph never shows a poster or restarts preparation',finishFrames.every(frame=>frame.prepared==='false'&&frame.poster==='hidden'));
  await panel.getByRole('button',{name:'Pearl',exact:true}).click();await panel.getByRole('button',{name:'Glacier',exact:true}).click();
  await page.waitForFunction(()=>(window.__glassGradient||[]).at(-1)>.99);
  check('Rapid finish reversals settle on the final selected material',await panel.getByRole('button',{name:'Glacier',exact:true}).getAttribute('aria-pressed')==='true');
  await page.evaluate(()=>{window.__recordGlass=false;window.__recordLight=true;window.__glassLight=[];});
  await panel.getByRole('button',{name:'Aurora',exact:true}).click();const lightFrames=await sampleFrames();
  const lights=await page.evaluate(()=>window.__glassLight||[]);
  check('Lighting preset interpolates actual GPU light colour across frames',lights.length>4&&new Set(lights.map(value=>value.map(component=>component.toFixed(4)).join(','))).size>4);
  check('Lighting morph keeps the live scene visible',lightFrames.every(frame=>frame.prepared==='false'&&frame.poster==='hidden'));
  await panel.getByRole('button',{name:'Studio',exact:true}).click();await page.evaluate(()=>{window.__recordLight=false;window.__recordUnfold=true;window.__glassUnfold=[];});
  await panel.getByRole('button',{name:'Unfold the crystal',exact:true}).click();await page.waitForTimeout(450);
  const unfolding=await page.evaluate(()=>window.__glassUnfold||[]);
  const beforeReverse=await page.evaluate(()=>Math.max(...window.__glassUnfold.slice(-3)));await page.evaluate(()=>{window.__glassUnfold=[];});
  await panel.getByRole('button',{name:'Bring it together',exact:true}).click();await page.waitForFunction(()=>(window.__glassUnfold||[]).length>=3);
  const afterReverse=await page.evaluate(()=>Math.max(...window.__glassUnfold.slice(0,3)));
  check('Unfold travels through real intermediate layer positions',unfolding.length>8&&new Set(unfolding.map(value=>value.toFixed(4))).size>6);
  check('Mid-flight unfold reversal preserves position without a jump',Number.isFinite(beforeReverse)&&Number.isFinite(afterReverse)&&Math.abs(afterReverse-beforeReverse)<.15);
  await page.evaluate(()=>{window.__recordUnfold=false;});await panel.getByRole('button',{name:'Reset view',exact:true}).click();await page.waitForTimeout(1600);
  const changed=async(name,action)=>{await ready();await page.waitForTimeout(400);const before=await canvas.screenshot();await action();await ready();await page.waitForTimeout(600);const after=await canvas.screenshot();check(name+' changes actual rendered pixels',!before.equals(after));check(name+' retains the same canvas',await canvas.evaluate((node,prior)=>node===prior,handle));};
  await changed('Rose finish',()=>panel.getByRole('button',{name:'Rose',exact:true}).click());
  await changed('Aurora lighting',()=>panel.getByRole('button',{name:'Aurora',exact:true}).click());
  const setRange=async(name,key)=>{const input=panel.getByRole('slider',{name,exact:true});await input.focus();await page.keyboard.press(key);};
  await changed('Light intensity',()=>setRange('Light intensity','End'));
  await changed('Object size',()=>setRange('Object size','Home'));
  await changed('Rotation',()=>setRange('Rotate the crystal','ArrowRight'));
  await changed('Outer shell isolation',()=>panel.getByRole('button',{name:'Outer shell',exact:true}).click());
  await changed('Core isolation',()=>panel.getByRole('button',{name:'Inner crystal',exact:true}).click());
  await panel.getByRole('button',{name:'Complete mark',exact:true}).click();
  await changed('Mesh construction',()=>panel.getByLabel('Show mesh construction',{exact:true}).check());
  await panel.getByLabel('Show mesh construction',{exact:true}).uncheck();
  await changed('Exploded layers',()=>panel.getByRole('button',{name:'Unfold the crystal',exact:true}).click());
  await panel.getByRole('button',{name:'Bring it together',exact:true}).click();
  await panel.getByRole('button',{name:'Reset view',exact:true}).click();
  check('Reset restores lighting, size, intensity, rotation and finish',await panel.getByRole('slider',{name:'Object size',exact:true}).inputValue()==='100'&&await panel.getByRole('slider',{name:'Light intensity',exact:true}).inputValue()==='100'&&await panel.getByRole('slider',{name:'Rotate the crystal',exact:true}).inputValue()==='0'&&await panel.getByRole('button',{name:'Studio',exact:true}).getAttribute('aria-pressed')==='true'&&await panel.getByRole('button',{name:'Glacier',exact:true}).getAttribute('aria-pressed')==='true');
  await ready();await page.waitForFunction(()=>{const now=performance.now(),draws=window.__studioDraws,previous=window.__studioQuiet||{draws:-1,at:now};if(previous.draws!==draws){window.__studioQuiet={draws,at:now};return false;}return now-previous.at>250;});
  const draws=await page.evaluate(()=>window.__studioDraws);await page.waitForTimeout(300);check('Studio stops drawing when idle',await page.evaluate(before=>window.__studioDraws===before,draws));
  const beforeOrbit=await canvas.screenshot(),bounds=await canvas.boundingBox();await page.mouse.move(bounds.x+bounds.width*.35,bounds.y+bounds.height*.5);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.35+90,bounds.y+bounds.height*.5+20,{steps:10});await page.mouse.up();await page.waitForTimeout(500);
  check('Direct dragging orbits the real model',!beforeOrbit.equals(await canvas.screenshot()));
  await panel.getByRole('button',{name:'Reset view',exact:true}).click();
  check('Live canvas preserves native vertical touch panning',await canvas.evaluate(node=>getComputedStyle(node).touchAction==='pan-y'));
  await panel.evaluate(node=>{node.scrollTop=node.scrollHeight;});await canvas.hover();
  const scrollBefore=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,180);
  await page.waitForFunction(before=>scrollY>before+30,scrollBefore);
  check('Wheel scrolling over the object can continue the page',true);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await panel.evaluate(node=>{node.scrollTop=0;});
  await panel.getByRole('button',{name:'Original crystal',exact:true}).click();await ready();check('Original identity remains available with one canvas',await page.locator('canvas').count()===1&&report.requests.some(url=>url.includes('crystal-powers-logo-3d.glb')));
  await panel.getByRole('button',{name:'Liquid Light',exact:true}).click();await ready();
  for(const width of [768,1024,1440]){
   await page.setViewportSize({width,height:1000});await ready();check(width+' studio stays in viewport',await panel.evaluate(node=>{const b=node.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1&&b.top>=0&&b.bottom<=innerHeight+1;}));check(width+' no horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await page.setViewportSize({width:1440,height:1000});await ready();
  await page.keyboard.press('Escape');
  for(const label of ['Dark','Light','Warm dark','Fresh light','Warm light']){
   await page.getByRole('button',{name:'Choose appearance',exact:true}).click();await page.locator('#appearance-panel').getByRole('button',{name:label,exact:true}).click();await page.keyboard.press('Escape');
   await trigger.click();await ready();
   check(label+' studio retains readable content and one live canvas',await panel.getByRole('heading',{name:'Crystal Studio.',exact:true}).isVisible()&&await page.locator('canvas').count()===1);
   check(label+' studio has no horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(label==='Dark')await panel.screenshot({path:path.join(output,'studio-dark.png')});
   await page.keyboard.press('Escape');
  }
  await trigger.click();await ready();
  await canvas.evaluate(node=>node.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await panel.getByRole('status').filter({hasText:'could not load'}).waitFor();check('Actual context loss keeps matching fallback and controls',await panel.locator('.brand-scene img').isVisible()&&await page.locator('canvas').count()===0);
  await panel.getByRole('button',{name:'Close logo experience',exact:true}).click();check('Closing restores trigger focus',await trigger.evaluate(node=>node===document.activeElement));
  await trigger.click();await ready();check('Closing and reopening recovers a real live model',await page.locator('canvas').count()===1);
  await page.keyboard.press('Escape');await page.waitForTimeout(100);
  for(const width of [320,390]){await page.setViewportSize({width,height:844});await trigger.click();check(width+' compact preview opens without WebGL',await panel.isVisible()&&await page.locator('canvas').count()===0);check(width+' preview fits the viewport',await panel.evaluate(node=>{const b=node.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1&&b.top>=0&&b.bottom<=innerHeight+1;}));await panel.getByRole('button',{name:'Close logo experience',exact:true}).click();}
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await trigger.click();check('Reduced motion retains controls and rendered logo without a canvas',await panel.isVisible()&&await panel.locator('.brand-scene img').isVisible()&&await page.locator('canvas').count()===0);await page.keyboard.press('Escape');
  const footer=page.locator('footer .brand-identity');await footer.scrollIntoViewIfNeeded();await footer.locator('.brand-crystal-button').click();check('Footer studio is clamped inside the viewport',await panel.evaluate(node=>{const b=node.getBoundingClientRect();return b.top>=0&&b.left>=0&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1;}));await panel.screenshot({path:path.join(output,'footer-preview.png')});
  report.shaderErrors=await page.evaluate(()=>window.__studioShaderErrors);check('No native shader linkage failures',report.shaderErrors.length===0);
  check('No captured browser runtime errors',report.errors.length===0);report.passed=true;
 }catch(error){report.failure=error.stack;await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log('CRYSTAL_STUDIO_BROWSER_PASS:',report.checks.length);
})().catch(error=>{console.error(error);process.exitCode=1;});
