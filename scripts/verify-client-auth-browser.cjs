/* Explicit synthetic client activation/login transports; no real account, provider or credential mutation. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base='http://127.0.0.1:8084',output=path.resolve('.codex-runtime/qa/client-auth-pc');
const report={checks:[],errors:[],warnings:[],scope:'Packaged client entry; synthetic activation/login responses and real browser history/hash navigation'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',message=>{if(message.type()==='warning' && /blocker|POP navigation|history/i.test(message.text()))report.warnings.push(message.text());});
 const A='A'.repeat(43),B='B'.repeat(43),C='C'.repeat(43),D='D'.repeat(43);
 let mode='EXPIRED',writes=[],holds=new Map(),holdSignals=new Map(),loginStarted,releaseLogin,logins=0;
 const reply=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 await page.route('**/api/**',async route=>{
  const endpoint=new URL(route.request().url()).pathname;
  if(endpoint==='/api/admin/auth/csrf')return reply(route,{token:'synthetic-client-auth-csrf',headerName:'X-CSRF-TOKEN'});
  if(endpoint==='/api/client/auth/session')return reply(route,{authenticated:false});
  if(endpoint==='/api/client/auth/activate'){
   const input=route.request().postDataJSON();writes.push(input);
   if(mode==='EXPIRED')return reply(route,{message:'Synthetic invitation expired or replaced.'},400);
   if(mode==='HOLD')return new Promise(resolve=>{holds.set(input.token,async(body,status=200)=>{await reply(route,body,status);resolve();});holdSignals.get(input.token)?.();});
   return reply(route,{success:true});
  }
  if(endpoint==='/api/client/auth/login'){
   logins++;return new Promise(resolve=>{releaseLogin=async(body={authenticated:true,client:{id:'70000000-0000-4000-8000-000000000001',workspaceId:'70000000-0000-4000-8000-000000000002',displayName:'Synthetic stale client'}},status=200)=>{await reply(route,body,status);resolve();};loginStarted();});
  }
  report.errors.push(endpoint);return reply(route,{message:'Unexpected synthetic endpoint'},400);
 });
 const password=()=>page.getByLabel('Choose a password',{exact:true});
 const confirm=()=>page.getByLabel('Confirm password',{exact:true});
 const activate=()=>page.getByRole('button',{name:'Activate client account',exact:true});
 async function fill(value){await password().fill(value);await confirm().fill(value);}
 async function fragment(token){await page.evaluate(value=>{location.hash='token='+value;},token);await page.waitForFunction(()=>!location.hash,{},{timeout:3000});}
 async function held(token){if(holds.has(token))return;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Synthetic held transport was not reached')),5000);holdSignals.set(token,()=>{clearTimeout(timer);resolve();});});}
 try{
  await page.goto(base+'/client/activate#token='+A);await password().waitFor();
  check('Activation scrubs its fragment and is private noindex',!new URL(page.url()).hash && (await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'));
  check('Client activation cannot select a staff role',await page.getByRole('combobox').count()===0 && await page.locator('input[name=role]').count()===0);
  await password().fill('Synthetic-client-activation-2026');await confirm().fill('Different-client-password');await activate().click();
  check('Native confirmation prevents mismatched activation',writes.length===0 && !await confirm().evaluate(e=>e.checkValidity()));
  await fill('Synthetic-client-activation-2026');await activate().click();await page.getByText('Synthetic invitation expired or replaced.',{exact:true}).waitFor();
  check('Expired invitation retains correction fields and sends only token/password',await password().inputValue()==='Synthetic-client-activation-2026' && Object.keys(writes[0]).sort().join()==='password,token' && writes[0].token===A);
  await fragment(B);
  check('Same-document replacement clears previous input/error/success',await password().inputValue()==='' && await confirm().inputValue()==='' && await page.getByText('Synthetic invitation expired or replaced.',{exact:true}).count()===0 && await page.getByRole('link',{name:'Sign in to your projects',exact:true}).count()===0);
  for(const theme of ['Dark','Light','Warm dark','Fresh light','Warm light']){
   await page.getByRole('button',{name:'Choose appearance',exact:true}).click();await page.getByRole('button',{name:theme,exact:true}).click();
   for(const width of [320,390,768,1024,1440,1920]){
    await page.setViewportSize({width,height:1000});
    check(theme+' '+width+' activation has no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    check(theme+' '+width+' password controls have usable boundaries',await password().evaluate(e=>{const box=e.closest('.admin-password-control');return e.getBoundingClientRect().height>=44 && box.getBoundingClientRect().width<=innerWidth && parseFloat(getComputedStyle(box).borderTopWidth)>0;}));
   }
  }
  await page.setViewportSize({width:390,height:1000});await page.locator('.client-entry').screenshot({path:path.join(output,'activation-390.png')});
  mode='HOLD';await fill('Synthetic-client-B-password-2026');
  const sentB=page.waitForRequest(r=>r.url().endsWith('/api/client/auth/activate'));await page.locator('.admin-form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});await sentB;await held(B);
  check('One pending activation freezes private fields and visibility controls',writes.filter(w=>w.token===B).length===1 && await password().isDisabled() && await page.getByRole('button',{name:'Show choose a password',exact:true}).isDisabled());
  await fragment(C);check('New invitation can start while the old response is pending',await password().inputValue()==='' && !await password().isDisabled());
  await fill('Synthetic-client-C-password-2026');const sentC=page.waitForRequest(r=>r.url().endsWith('/api/client/auth/activate'));await activate().click();await sentC;await held(C);
  const oldCompleted=page.waitForResponse(r=>r.url().endsWith('/api/client/auth/activate'));await holds.get(B)({success:true});await (await oldCompleted).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  check('Old success cannot clear the newer busy state or show activation success',await password().isDisabled() && await page.getByRole('link',{name:'Sign in to your projects',exact:true}).count()===0);
  await holds.get(C)({message:'Synthetic current invitation refused.'},400);await page.getByText('Synthetic current invitation refused.',{exact:true}).waitFor();
  check('Only current-invitation errors retain their matching correction',await password().inputValue()==='Synthetic-client-C-password-2026' && !await password().isDisabled() && writes.at(-1).token===C);
  mode='OK';await activate().click();await page.getByRole('link',{name:'Sign in to your projects',exact:true}).waitFor();
  check('Confirmed activation clears private fields',await password().count()===0 && await page.locator('input[type=password]').count()===0);
  await page.getByRole('link',{name:'Sign in to your projects',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();
  check('Continuation opens clean client sign-in',await page.getByLabel('Email',{exact:true}).inputValue()==='' && await page.getByLabel('Password',{exact:true}).inputValue()==='');
  await page.goBack();await page.getByText('This invitation is missing. Ask the team for a new private link.',{exact:true}).waitFor();
  check('Back cannot restore consumed/scrubbed invitation fields',await password().count()===0 && !new URL(page.url()).hash);
  await page.goForward();await page.getByLabel('Email',{exact:true}).waitFor();
  await page.getByLabel('Email',{exact:true}).fill('synthetic-client@example.invalid');await page.getByLabel('Password',{exact:true}).fill('Synthetic-client-login-password-2026');
  const started=new Promise(resolve=>{loginStarted=resolve;});await page.locator('.admin-form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});await started;
  check('Pending login freezes fields with one submission',logins===1 && await page.getByLabel('Email',{exact:true}).isDisabled());
  const releaseOldLogin=releaseLogin;
  const accepted=page.waitForEvent('dialog',{timeout:5000}).then(dialog=>dialog.accept());await page.goBack();await accepted;
  await page.getByText('This invitation is missing. Ask the team for a new private link.',{exact:true}).waitFor();await fragment(D);await password().waitFor();
  check('Leaving pending login opens a clean new activation scope',await password().inputValue()==='' && !await password().isDisabled());
  await page.getByRole('link',{name:'Crystal Powers private workspace',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();
  await page.getByLabel('Email',{exact:true}).fill('new-synthetic-client@example.invalid');await page.getByLabel('Password',{exact:true}).fill('Synthetic-new-client-login-2026');
  const newStarted=new Promise(resolve=>{loginStarted=resolve;});await page.getByRole('button',{name:'Open my projects',exact:true}).click();await newStarted;
  const finished=page.waitForResponse(r=>r.url().endsWith('/api/client/auth/login'));await releaseOldLogin();await (await finished).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  check('Late login cannot authenticate or unlock a newer pending login',await page.getByLabel('Email',{exact:true}).isDisabled() && await page.locator('.client-workspace').count()===0);
  await releaseLogin({message:'Synthetic current login refused.'},401);await page.getByText('Synthetic current login refused.',{exact:true}).waitFor();
  check('Current login failure preserves only current-account correction',await page.getByLabel('Email',{exact:true}).inputValue()==='new-synthetic-client@example.invalid' && !await page.getByLabel('Email',{exact:true}).isDisabled());
  check('Client credentials/tokens never enter local or session storage',!await page.evaluate(()=>[...Object.values(localStorage),...Object.values(sessionStorage)].some(v=>/Synthetic-client|A{43}|B{43}|C{43}|D{43}/.test(v))));
  check('Native replacement history produces no unowned-history blocker warnings',report.warnings.length===0);
  check('No unexpected requests or browser errors',report.errors.length===0);
  console.log('CLIENT_AUTH_BROWSER_PASS:'+report.checks.length);
 }catch(failure){report.failure=failure.stack;report.url=page.url().replace(/#.*$/,'#redacted');console.error(failure);process.exitCode=1;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})();
