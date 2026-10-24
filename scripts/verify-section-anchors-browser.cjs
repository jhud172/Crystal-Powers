/* Existing public navigation, real packaged GETs, returning visitor; no provider writes. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:18084';
assert.match(base,/^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const fixtures=process.env.CRYSTAL_QA_READONLY_FIXTURES==='1';
(async()=>{
 const report={candidateSha256:process.env.CRYSTAL_QA_CANDIDATE_SHA256,checks:[],errors:[],scope:fixtures?'Built preview, explicit read-only empty portfolio/privacy fixtures, native fragments at390/1440px. Existing features only.':'Existing public sections at390/1440px, actual packaged APIs and native fragments. Returning visitor; Companion feature acceptance excluded.'};
 const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const check=(label,value)=>{assert.ok(value,label);report.checks.push(label);};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await page.addInitScript(()=>localStorage.setItem('crystal_prism_visit_v1','completed'));
  page.on('pageerror',error=>report.errors.push(error.message));
  if(fixtures) await page.route('**/api/**',route=>{assert.equal(route.request().method(),'GET');return route.fulfill({json:route.request().url().endsWith('/projects')?[]:{ready:false}});});
  const policy=fixtures?{ready:false}:await(await page.request.get(base+'/api/site/privacy/status')).json();
  for(const width of [390,1440])for(const route of ['/','/services','/about','/portfolio','/support','/contact','/accessibility','/privacy']){
   report.lastRoute=route;report.lastWidth=width;await page.setViewportSize({width,height:1000});const response=await page.goto(base+route);
   await page.locator('main h1').first().waitFor();
   check(route+' '+width+' keeps its expected route status',response.status()===(!fixtures&&route==='/privacy'&&!policy.ready?404:200));
   const duplicates=await page.evaluate(()=>{const seen=new Set();return [...document.querySelectorAll('[id]')].map(node=>node.id).filter(id=>seen.has(id)||!seen.add(id));});
   check(route+' '+width+' has unique document IDs: '+duplicates.join(','),duplicates.length===0);
   const links=await page.locator('.chapter-links a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
   for(const href of links){
    const id=decodeURIComponent(href.slice(1));
    check(route+' '+width+' '+href+' belongs to the public main',await page.evaluate(id=>!!document.getElementById(id)?.closest('main'),id));
    await page.locator('.chapter-links a').nth(links.indexOf(href)).click();
    check(route+' '+width+' '+href+' follows its native fragment',decodeURIComponent(new URL(page.url()).hash)==='#'+id);
    report.lastFragment=href;await page.waitForFunction(id=>{const target=document.getElementById(id);if(!target)return false;const rect=target.getBoundingClientRect();return rect.bottom>=-1&&rect.top<innerHeight;},id,{timeout:5000});
    check(route+' '+width+' '+href+' actually scrolls to its section',true);
   }
   check(route+' '+width+' retains readable page reflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  check('No runtime errors in public section journeys',report.errors.length===0);report.passed=true;
 }catch(error){report.failure=error.message;process.exitCode=1;}
 finally{await browser.close();const dir=path.resolve('.codex-runtime/qa/'+(fixtures?'section-anchors-preview-prism':'section-anchors'));await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
