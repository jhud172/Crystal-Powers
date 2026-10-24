/* Deterministic valid observer-batch interleaving, not native hidden-tab proof. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:18084';
assert.match(base,/^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const output=path.resolve('.codex-runtime/qa/batched-intersection');
(async()=>{
 const report={ candidateSha256:process.env.CRYSTAL_QA_CANDIDATE_SHA256,checks:[],errors:[],scope:'Existing Prism only. Actual native observer entries are coalesced into one valid chronological callback batch to reproduce delayed delivery. No invented intersection coordinates or visibility overrides.'};
 const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.addInitScript(()=>{
   localStorage.setItem('crystal_prism_visit_v1','completed');
   const Native=IntersectionObserver;window.__prismBatches=[];
   window.IntersectionObserver=class extends Native{
    constructor(callback,options){
     let waiting=[],delivered=false;
     super((entries,observer)=>{
      if(!delivered&&entries.some(entry=>entry.target.classList.contains('crystal-opening'))){
       waiting.push(...entries);
       if(!entries.some(entry=>entry.isIntersecting))return;
       delivered=true;
       window.__prismBatches.push(waiting.map(entry=>({visible:entry.isIntersecting,time:entry.time})));
       callback(waiting,observer);waiting=[];
      }else callback(entries,observer);
     },options);
    }
   };
   const clear=CanvasRenderingContext2D.prototype.clearRect;
   CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.classList.contains('prism-stars'))window.__starFrames=(window.__starFrames||0)+1;return clear.apply(this,args);};
  });
  // Read-only empty portfolio/privacy fixtures make only the observer ordering variable.
  await page.route('**/api/**',route=>{assert.equal(route.request().method(),'GET');return route.fulfill({json:route.request().url().endsWith('/projects')?[]:{ready:false}});});
  await page.goto(base);await page.waitForTimeout(300);
  const gate=page.locator('.crystal-opening');await gate.scrollIntoViewIfNeeded();await page.waitForTimeout(150);
  const batches=await page.evaluate(()=>window.__prismBatches);report.batches=batches;
  check('Both Prism observers receive chronological offscreen/onscreen batches',batches.length===2&&batches.every(batch=>batch.length>=2&&!batch[0].visible&&batch.at(-1).visible&&batch.every((entry,index)=>!index||entry.time>=batch[index-1].time)));
  const frames=await page.evaluate(()=>window.__starFrames||0);await page.waitForTimeout(400);
  check('Stars continue drawing from the latest visible entry',await page.evaluate(before=>window.__starFrames>before+3,frames));
  await gate.locator('.opening-actions button').first().click();await gate.locator('.opening-canvas canvas').waitFor();
  await page.waitForFunction(()=>document.querySelector('.crystal-opening')?.dataset.ready==='true');
  check('Prism WebGL also accepts the latest visible entry',await gate.getAttribute('data-ready')==='true');
  check('No runtime errors in the delayed observer journey',report.errors.length===0);report.passed=true;
 }catch(error){report.failure=error.message;process.exitCode=1;}
 finally{await browser.close();await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
