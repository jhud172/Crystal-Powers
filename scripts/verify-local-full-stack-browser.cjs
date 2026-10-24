/* Actual running local application and saved database. Read-only HTTP/browser checks. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base='http://127.0.0.1:8084',api='http://127.0.0.1:8080',output=path.resolve('.codex-runtime/qa/local-full-stack-20261024');
const report={checks:[],errors:[],apiFailures:[],scope:'Actual local backend, existing persistent H2 database, live same-origin Vite proxy. No API fixtures, authentication, publication, enquiries or provider writes. Returning visitor excludes separate Companion acceptance.'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.addInitScript(()=>localStorage.setItem('crystal_prism_visit_v1','completed'));
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('response',response=>{if(new URL(response.url()).pathname.startsWith('/api/')&&response.status()>=500)report.apiFailures.push({path:new URL(response.url()).pathname,status:response.status()});});
 try{
  for(const origin of [base,api]){
   const health=await page.request.get(origin+'/api/health');check(origin+' real backend health is up',health.status()===200&&(await health.json()).status==='up');
   const projects=await page.request.get(origin+'/api/projects');check(origin+' returns real projects JSON',projects.status()===200&&projects.headers()['content-type'].includes('application/json')&&Array.isArray(await projects.json()));
  }
  const stored=await(await page.request.get(api+'/api/projects')).json();report.publishedCount=stored.length;
  check('Frontend proxy returns the same published data as backend',JSON.stringify(await(await page.request.get(base+'/api/projects')).json())===JSON.stringify(stored));
  for(const area of ['admin','team','client']){const response=await page.request.get(base+`/api/${area}/auth/session`);const body=await response.json();check(area+' session API responds anonymously',response.status()===200&&body.authenticated===false);}
  const missing=await page.request.get(base+'/api/projects/local-missing-project-qa');check('Missing project returns real backend404 JSON',missing.status()===404&&missing.headers()['content-type'].includes('application/json'));
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto(base+'/portfolio');await page.locator('.work-filter-bar').getByRole('status').filter({hasText:/^\d+ projects?$/}).waitFor();
   check(width+' portfolio loads without unavailable/retry state',await page.getByRole('heading',{name:'The showcase is taking a moment.',exact:true}).count()===0&&await page.getByText('Projects unavailable',{exact:true}).count()===0);
   if(!stored.length)check(width+' honestly shows unpublished empty state',await page.getByRole('heading',{name:'The next chapter is taking shape.',exact:true}).isVisible());
   for(const label of ['Website','App','Bespoke system','All work']){await page.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(node=>node.getAttribute('aria-pressed')==='true',await page.getByRole('button',{name:label,exact:true}).elementHandle());check(width+' '+label+' filter works with live data',await page.getByRole('button',{name:label,exact:true}).getAttribute('aria-pressed')==='true'&&await page.getByText('Projects unavailable',{exact:true}).count()===0);}
   await page.reload();await page.locator('.work-filter-bar').getByRole('status').filter({hasText:/^\d+ projects?$/}).waitFor();check(width+' portfolio reload retains working API',await page.getByRole('button',{name:'All work',exact:true}).getAttribute('aria-pressed')==='true');
   check(width+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:path.join(output,'portfolio-'+width+'.png')});
  }
  for(const route of ['/','/about','/services','/support','/contact','/admin','/team','/client']){
   await page.goto(base+route);await page.locator('main h1').first().waitFor();check(route+' loads through the connected local app',await page.locator('main h1').count()===1&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  check('No failing live API responses',report.apiFailures.length===0);check('No browser runtime errors',report.errors.length===0);report.passed=true;
 }catch(error){report.failure=error.stack;report.lastUrl=page.url();await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log('LOCAL_FULL_STACK_BROWSER_PASS:',report.checks.length,'published:',report.publishedCount);
})().catch(error=>{console.error(error);process.exitCode=1;});
