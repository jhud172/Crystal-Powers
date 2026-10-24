/* Labelled synthetic UI outcomes; real cryptography/authority use H2/PostgreSQL integration tests. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084', output = path.resolve('.codex-runtime/qa/team-security-pc');
assert.match(base, /^http:\/\/127\.0\.0\.1:(8084|18084)$/);
  const report = { checks: [], errors: [], scope: 'Packaged staff security UI; explicit synthetic proof/pending/success/uncertainty fixtures, no real account/provider/credential change' };
const check = (name,value) => { assert.ok(value,name);report.checks.push(name); };
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',error=>report.errors.push(error.message));
  let authenticated=true,owner=false,mode='PROOF_FAILED',writes=[],release,started;
  const member='60000000-0000-4000-8000-000000000001',root='60000000-0000-4000-8000-000000000002';
  await page.route('**/api/**',async route=>{
    const endpoint=new URL(route.request().url()).pathname;
    const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    const displayName=owner?'James':'Synthetic security member',permissions=['READ_CHANNELS','MANAGE_SETTINGS'];
    if(endpoint==='/api/team/auth/session')return reply({authenticated,member:{displayName,role:owner?'OWNER':'ADMIN'},permissions});
    if(endpoint==='/api/team/workspace')return reply({displayName,memberId:owner?null:member,ownerId:owner?root:null,permissions,channels:[],settings:{branding:{name:'Synthetic security workspace',tagline:'',version:0},preferences:{compact:false,unreadBadges:false,mentionAlerts:false,version:0},displayName,editableName:!owner,channelPreferences:[]}});
    if(endpoint==='/api/team/unread')return reply([]);
    if(endpoint==='/api/team/mentions')return reply({mentions:[],nextCursor:null});
    if(endpoint==='/api/admin/auth/csrf')return reply({token:'synthetic-security-csrf',headerName:'X-CSRF-TOKEN'});
    if(endpoint.startsWith('/api/team/account/')){
      writes.push({endpoint,input:route.request().postDataJSON()});
      if(mode==='DELAY')await new Promise(resolve=>{release=resolve;started();});
      if(mode==='PROOF_FAILED')return reply({message:'Synthetic current proof refused.'},400);
      if(mode==='UNCONFIRMED')return reply({message:'Synthetic security outcome unconfirmed.'},503);
      if(endpoint.endsWith('/authenticator'))return reply({secret:'A'.repeat(32)});
      if(endpoint.endsWith('/cancel'))return reply({message:'Synthetic setup cancelled; old authenticator remains active.'});
      authenticated=false;return reply({message:endpoint.endsWith('/password')?'Synthetic password changed; sign in again.':endpoint.endsWith('/confirm')?'Synthetic authenticator replaced; sign in again.':'Synthetic sessions revoked; sign in again.'});
    }
    report.errors.push(endpoint);return reply({message:'Unexpected synthetic endpoint'},400);
  });
  const security=()=>page.locator('.team-account-security');
  const password=()=>security().getByLabel('Current team password',{exact:true});
  const proof=async()=>{await password().fill('Synthetic-current-password-2026');await security().getByLabel('Current authenticator code',{exact:true}).fill('123456');};
  const next=async()=>{await security().getByLabel('New team password',{exact:true}).fill('Synthetic-next-password-2026');await security().getByLabel('Confirm new team password',{exact:true}).fill('Synthetic-next-password-2026');};
  const reset=async()=>{authenticated=true;mode='OK';await page.goto(base+'/team');await page.locator('.team-workspace').waitFor();const navigation=page.getByRole('button',{name:/^Open workspace navigation/});if(await navigation.isVisible())await navigation.click();await page.getByRole('button',{name:'Workspace and account settings',exact:true}).click();await security().waitFor();};
  try{
    await page.goto(base+'/team');await page.getByRole('button',{name:'Workspace and account settings',exact:true}).click();await security().waitFor();
    for(const theme of ['Dark','Light','Warm dark','Fresh light','Warm light']){
      await page.getByRole('button',{name:'Choose appearance',exact:true}).click();await page.getByRole('button',{name:theme,exact:true}).click(); await page.keyboard.press('Escape');
      for(const width of [320,390,768,1024,1440,1920]){await page.setViewportSize({width,height:1000});check(theme+' '+width+' security form has no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));check(theme+' '+width+' proof fields have usable boundaries and targets',await security().evaluate(element=>{const code=element.querySelector('.admin-code-field input'),password=element.querySelector('.admin-password-control input'),toggle=element.querySelector('.admin-password-toggle'),style=getComputedStyle(code),a=password.getBoundingClientRect(),b=toggle.getBoundingClientRect();return code.getBoundingClientRect().height>=44 && parseFloat(style.borderTopWidth)>0 && b.width>=44 && b.width<=80 && a.width>b.width && a.height>=44;}));}
    }
    await page.setViewportSize({width:390,height:1000});await security().screenshot({path:path.join(output,'staff-security-390.png')});
    await proof();await next();await security().getByLabel('Confirm new team password',{exact:true}).fill('Different-synthetic-password');
    await security().getByRole('button',{name:'Change password and sign out everywhere',exact:true}).click();
    check('Mismatch sends no security mutation',writes.length===0);
    await next();await security().getByRole('button',{name:'Change password and sign out everywhere',exact:true}).click();await security().getByText('Synthetic current proof refused.',{exact:true}).waitFor();
    check('Rejected proof preserves correction fields and current account',await password().inputValue()==='Synthetic-current-password-2026' && await security().getByLabel('New team password',{exact:true}).inputValue()==='Synthetic-next-password-2026' && authenticated);
    let discarded=false;page.once('dialog',async dialog=>{discarded=true;await dialog.dismiss();});await page.getByRole('button',{name:'Back to channels',exact:true}).click();
    check('Declining settings exit preserves private input',discarded && await security().count()===1 && await password().inputValue()==='Synthetic-current-password-2026');
    await page.getByLabel('Display name',{exact:true}).fill('Unsent profile');const count=writes.length;
    page.once('dialog',dialog=>dialog.dismiss());await security().getByRole('button',{name:'Change password and sign out everywhere',exact:true}).click();
    check('Declined other-settings discard sends nothing',writes.length===count);
    mode='DELAY';const beginning=new Promise(resolve=>{started=resolve;});page.once('dialog',dialog=>dialog.accept());await security().getByRole('button',{name:'Change password and sign out everywhere',exact:true}).click();await beginning;
    await security().locator('form').evaluate(form=>form.requestSubmit());
    check('Pending security save locks profile and credential controls and stays single flight',writes.length===count+1 && await password().isDisabled() && await page.getByLabel('Display name',{exact:true}).isDisabled() && await page.getByRole('button',{name:'Back to channels',exact:true}).isDisabled());
    release();mode='OK';await page.getByText('Synthetic password changed; sign in again.',{exact:true}).waitFor();
    check('Confirmed password result leaves private settings and clears credentials',await security().count()===0 && await page.getByLabel('Email',{exact:true}).isVisible());
    check('Password request contains only proof and new password',Object.keys(writes.at(-1).input).sort().join()==='code,nextPassword,password');
    await reset();await security().getByRole('button',{name:'Sign out everywhere',exact:true}).click();await proof();await security().getByRole('button',{name:'End all my team sessions',exact:true}).click();await page.getByText('Synthetic sessions revoked; sign in again.',{exact:true}).waitFor();
    check('Session revocation has no caller-selected account or password change',Object.keys(writes.at(-1).input).sort().join()==='code,password' && await security().count()===0);
    await reset();await security().getByRole('button',{name:'Replace authenticator',exact:true}).click();await proof();await security().getByRole('button',{name:'Set up a new authenticator',exact:true}).click();await security().getByLabel('New authenticator code',{exact:true}).waitFor();
    check('Staged setup keeps actor signed in and removes old proof fields',authenticated && await password().count()===0 && await security().locator('.admin-enrolment code').count()===1);
    for(const theme of ['Dark','Light','Warm dark','Fresh light','Warm light']){
      await page.getByRole('button',{name:'Choose appearance',exact:true}).click();await page.getByRole('button',{name:theme,exact:true}).click(); await page.keyboard.press('Escape');
      for(const width of [320,390,768,1024,1440,1920]){await page.setViewportSize({width,height:1000});check(theme+' '+width+' pending setup has no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));check(theme+' '+width+' new code has a visible usable boundary',await security().locator('.admin-code-field input').evaluate(element=>element.getBoundingClientRect().height>=44 && parseFloat(getComputedStyle(element).borderTopWidth)>0));}
    }
    await security().getByRole('button',{name:'Cancel new authenticator setup',exact:true}).click();await security().getByText('Synthetic setup cancelled; old authenticator remains active.',{exact:true}).waitFor();
    check('Cancellation removes setup key without signing out',authenticated && await security().locator('.admin-enrolment code').count()===0 && await password().inputValue()==='');
    await proof();await security().getByRole('button',{name:'Set up a new authenticator',exact:true}).click();await security().getByLabel('New authenticator code',{exact:true}).fill('654321');mode='PROOF_FAILED';await security().getByRole('button',{name:'Confirm replacement and sign out everywhere',exact:true}).click();await security().getByText('Synthetic current proof refused.',{exact:true}).waitFor();
    check('Refused new code retains staged setup and active account',authenticated && await security().locator('.admin-enrolment code').count()===1);
    mode='OK';await security().getByRole('button',{name:'Confirm replacement and sign out everywhere',exact:true}).click();await page.getByText('Synthetic authenticator replaced; sign in again.',{exact:true}).waitFor();
    check('Confirmed replacement removes private setup and signs out',!authenticated && await security().locator('.admin-enrolment code').count()===0 && await page.getByLabel('Email',{exact:true}).isVisible());
    await reset();await proof();await next();mode='UNCONFIRMED';await security().getByRole('button',{name:'Change password and sign out everywhere',exact:true}).click();await security().getByText('Synthetic security outcome unconfirmed.',{exact:true}).waitFor();
    check('Unconfirmed mutation requires reauthentication before another change',await password().isDisabled() && await security().getByRole('button',{name:'Change password and sign out everywhere',exact:true}).isDisabled() && await security().getByRole('button',{name:'Return to sign-in',exact:true}).isEnabled());
    await security().getByRole('button',{name:'Return to sign-in',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();
    check('Reauthentication clears private form/key without a success claim',await security().count()===0 && await page.getByText('Synthetic password changed; sign in again.',{exact:true}).count()===0);
    owner=true;authenticated=true;mode='OK';await page.goto(base+'/team');await page.getByRole('button',{name:'Workspace and account settings',exact:true}).click();
    check('Protected owner is directed to separate owner security',await security().count()===0 && await page.getByRole('link',{name:'Open the owner studio',exact:true}).isVisible());
    check('No synthetic private credential/key is persisted',!await page.evaluate(()=>[...Object.values(localStorage),...Object.values(sessionStorage)].some(value=>/Synthetic-current-password|Synthetic-next-password|AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/.test(value))));
    check('No unexpected endpoints or browser errors',report.errors.length===0);
    console.log('TEAM_SECURITY_BROWSER_PASS:'+report.checks.length);
  }catch(failure){report.failure=failure.stack;report.lastText=(await page.locator('body').innerText()).slice(0,6000);report.lastUrl=page.url();report.authenticated=authenticated;console.error(failure);process.exitCode=1;}
  finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})();
