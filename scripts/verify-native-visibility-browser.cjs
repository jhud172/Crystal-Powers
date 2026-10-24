/* Owned headed Edge only: actual tab/window visibility, never synthetic hidden events. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';assert.match(base,/^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const output=path.resolve('.codex-runtime/qa/native-visibility-bulk');
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const report={candidateSha256:process.env.CRYSTAL_QA_CANDIDATE_SHA256,checks:[],errors:[],scope:'Owned headed installed Edge, real tab activation/window minimisation through CDP. Existing features/returning visitor. No overridden visibility properties or synthetic events. Desktop only.'};
 const browser=await chromium.launch({headless:false,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE,ignoreDefaultArgs:['--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();await page.addInitScript(()=>localStorage.setItem('crystal_prism_visit_v1','completed'));page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base);await page.locator('header .brand-crystal-button').click();await page.locator('header .brand-scene[data-ready="true"]').waitFor();
  const session=await page.context().newCDPSession(page);const {windowId}=await session.send('Browser.getWindowForTarget');
  const snapshot=()=>page.evaluate(()=>({hidden:document.hidden,visibility:document.visibilityState,policy:document.querySelector('.studio-shell')?.dataset.motion,canvases:document.querySelectorAll('canvas:not(.prism-stars)').length,wave:document.querySelector('.liquid-light-flow')?getComputedStyle(document.querySelector('.liquid-light-flow')).animationPlayState:null}));
  const accept=state=>{assert.equal(state.canvases,0);assert.equal(state.wave,'paused');};
  report.before=await snapshot();
  const other=await page.context().newPage();await other.goto('about:blank');const otherSession=await other.context().newCDPSession(other);const otherWindow=await otherSession.send('Browser.getWindowForTarget');report.sameWindow=otherWindow.windowId===windowId;
  await other.bringToFront();await page.waitForTimeout(800);report.background=await snapshot();
  if(report.background.hidden){accept(report.background);report.checks.push('Actual native background activation retires optional WebGL and pauses the wave');}
  else report.tabUnavailable='Native other-target activation did not expose a hidden document on this desktop.';
  await other.close();await page.bringToFront();await page.locator('header .brand-scene[data-ready="true"]').waitFor();
  if(report.background.hidden){assert.equal((await snapshot()).hidden,false);assert.equal(await page.locator('canvas:not(.prism-stars)').count(),1);report.checks.push('Native foreground return restores exactly one owned optional scene');}
  await session.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'minimized'}});await page.waitForTimeout(800);report.minimised=await snapshot();
  if(report.minimised.hidden){accept(report.minimised);report.checks.push('Native minimisation independently hides the document and pauses optional rendering');}
  else report.minimisationUnavailable='Native minimisation did not expose a hidden document; no minimisation acceptance claimed.';
  if(!report.checks.length)report.unavailable='Neither native activation nor minimisation exposed hidden state; native acceptance remains unproven.';
  assert.equal(report.errors.length,0);if(report.checks.length)report.passed=true;
 }catch(error){report.failure=error.message;process.exitCode=1;}
 finally{await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
