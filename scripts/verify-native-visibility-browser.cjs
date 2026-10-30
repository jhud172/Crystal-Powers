/* Owned headed Chromium browser only: actual tab/window visibility, never synthetic hidden events. */
const {openNativeEdge}=require('./native-edge-fixture.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';assert.match(base,/^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const output=path.resolve('.codex-runtime/qa/native-visibility-bulk');
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const report={candidateSha256:process.env.CRYSTAL_QA_CANDIDATE_SHA256,browserExecutable:process.env.CRYSTAL_BROWSER_EXECUTABLE || 'installed Edge',checks:[],errors:[],scope:'Owned headed installed Chromium browser, real tab activation/window minimisation through CDP. Existing features/returning visitor. No overridden visibility properties or synthetic events. Desktop only.'};
 const owned=await openNativeEdge();
 try{
  const {context,page}=owned;await page.addInitScript(()=>localStorage.setItem('crystal_prism_visit_v1',JSON.stringify({status:'completed',version:1})));page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base);await page.locator('header .brand-crystal-button').click();await page.locator('header .brand-scene[data-ready="true"]').waitFor();
  const session=await page.context().newCDPSession(page);const {windowId}=await session.send('Browser.getWindowForTarget');
  const snapshot=()=>page.evaluate(()=>({hidden:document.hidden,visibility:document.visibilityState,policy:document.querySelector('.studio-shell')?.dataset.motion,canvases:document.querySelectorAll('canvas:not(.prism-stars)').length,wave:document.querySelector('.liquid-light-flow')?getComputedStyle(document.querySelector('.liquid-light-flow')).animationPlayState:null}));
  const accept=state=>{assert.equal(state.canvases,0);assert.equal(state.wave,'paused');};
  const waitForRetirement=()=>page.waitForFunction(()=>document.hidden&&document.querySelectorAll('canvas:not(.prism-stars)').length===0&&getComputedStyle(document.querySelector('.liquid-light-flow')).animationPlayState==='paused',null,{polling:100,timeout:10000});
  report.before=await snapshot();
  const other=await page.context().newPage();await other.goto('about:blank');const otherSession=await other.context().newCDPSession(other);const otherWindow=await otherSession.send('Browser.getWindowForTarget');report.sameWindow=otherWindow.windowId===windowId;
  await other.bringToFront();await page.waitForFunction(()=>document.hidden,null,{polling:100,timeout:10000});await waitForRetirement();report.background=await snapshot();
  if(report.background.hidden){accept(report.background);report.checks.push('Actual native background activation retires optional WebGL and pauses the wave');}
  else report.tabUnavailable='Native other-target activation did not expose a hidden document on this desktop.';
  await other.close();await page.bringToFront();await page.locator('header .brand-scene[data-ready="true"]').waitFor();
  if(report.background.hidden){assert.equal((await snapshot()).hidden,false);assert.equal(await page.locator('canvas:not(.prism-stars)').count(),1);report.checks.push('Native foreground return restores exactly one owned optional scene');}
  await page.waitForTimeout(1500);await session.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'minimized'}});await page.waitForFunction(()=>document.hidden,null,{polling:100,timeout:10000});await waitForRetirement();report.minimised=await snapshot();
  if(report.minimised.hidden){accept(report.minimised);report.checks.push('Native minimisation independently hides the document and pauses optional rendering');}
  else report.minimisationUnavailable='Native minimisation did not expose a hidden document; no minimisation acceptance claimed.';
  await session.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});await page.bringToFront();await page.locator('header .brand-scene[data-ready="true"]').waitFor();
  if(report.minimised.hidden){assert.equal((await snapshot()).hidden,false);assert.equal(await page.locator('canvas:not(.prism-stars)').count(),1);report.checks.push('Native restoration after minimisation owns exactly one scene');}
  if(!report.background.hidden||!report.minimised.hidden)report.unavailable='Both native tab hiding and minimisation are required; incomplete acceptance remains open.';
  assert.equal(report.errors.length,0);if(report.checks.length===4)report.passed=true;
 }catch(error){report.failure=error.message;report.surface=await owned.page.locator('body').innerText().catch(()=>null);await owned.page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});process.exitCode=1;}
 finally{await owned.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
