/* Explicit expiry/sign-in API fixtures; real server session invalidation runs in portfolio QA. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'); const fs=require('node:fs/promises'); const path=require('node:path');
const base=process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8080';
assert.ok(/^http:\/\/127\.0\.0\.1:(8080|8083|8084)$/.test(base));
const output=path.resolve('.codex-runtime/qa/session-pc');
const report={base,checks:[],errors:[],runtime:'installed Edge, explicit synthetic expiry/sign-in fixtures'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
const reply=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));
 const mediaId='22222222-2222-4222-8222-222222222222';
 const project={id:'11111111-1111-4111-8111-111111111111',slug:'clare-session-ui-fixture',version:3,publishedVersion:2,featured:false,sortOrder:0,archived:false,updatedAt:'2026-10-10T12:00:00Z',content:{title:'Clare’s Life Celebrations · expiry UI fixture',category:'WEBSITE',summary:'Saved private summary.',overview:'',approach:'',outcome:'',liveUrl:'',technologies:[],displayDevice:'laptop',coverMediaId:mediaId,coverAlt:'Approved Clare screenshot',gallery:[]}};
 let auth=true,mfa=false,sessionFailure=false,wrongPassword=false,wrongMfa=false,holdLogin=false,releaseLogin,loginSeen;
 let saves=0,uploads=0,publishes=0;
 const source=await fs.readFile(path.resolve('.codex-runtime/qa/approved-clare/desktop.jpg'));
 try {
  await page.route('**/api/admin/auth/csrf',r=>reply(r,{headerName:'X-CSRF-TOKEN',token:'synthetic-fixture'}));
  await page.route('**/api/admin/auth/session',r=>sessionFailure?reply(r,{message:'Session check unavailable.'},503):reply(r,{authenticated:auth,mfaRequired:mfa,enrolmentRequired:false,setupAvailable:false}));
  await page.route('**/api/admin/auth/login',r=>{
   const respond=()=>{if(wrongPassword)return reply(r,{message:'Sign-in details were not accepted.'},401);mfa=true;return reply(r,{});};
   if(holdLogin)return new Promise(resolve=>{releaseLogin=async()=>{await respond();resolve();};loginSeen?.();});return respond();
  });
  await page.route('**/api/admin/auth/verify',r=>{if(wrongMfa)return reply(r,{message:'The code was not accepted.'},401);auth=true;mfa=false;return reply(r,{recoveryCodes:[]});});
  await page.route('**/api/admin/auth/logout',r=>{auth=false;mfa=false;return reply(r,{});});
  await page.route('**/api/admin/projects',r=>reply(r,[project]));
  await page.route('**/api/admin/media/*',r=>r.fulfill({status:200,contentType:'image/jpeg',body:source}));
  await page.route(/\/api\/admin\/projects\/[a-z0-9-]+(?:\/.*)?$/,r=>{
   const parts=new URL(r.request().url()).pathname.split('/');const endpoint=parts[5],method=r.request().method();
   if(method!=='GET'&&!auth)return reply(r,{message:'Forbidden'},403);
   if(endpoint==='media'){if(method==='POST'){uploads++;return reply(r,{id:mediaId,bytes:85000,width:1440,height:1000});}return reply(r,[{id:mediaId,bytes:85000,width:1440,height:1000}]);}
   if(endpoint==='publish'){publishes++;project.publishedVersion=project.version;return reply(r,project);}
   if(method==='PUT'){saves++;project.content=r.request().postDataJSON().content;project.version++;return reply(r,project);}return reply(r,project);
  });
  await page.goto(base+'/admin',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:project.content.title,exact:true}).click();await page.locator('#project-summary').fill('Unsaved draft held through expired-session sign-in.');
  auth=false;await page.getByRole('button',{name:'Save draft',exact:true}).click();const modal=page.getByRole('dialog',{name:'Sign in to continue.',exact:true});await modal.waitFor();
  check('Expired CSRF is checked against the session and opens reauthentication',saves===0&&await modal.getByText(/Your current draft stays in this tab/).isVisible());
  check('Modal focuses its explanation and retains all editor content',await page.locator('#session-heading').evaluate(e=>e===document.activeElement)&&await page.locator('#project-summary').inputValue()==='Unsaved draft held through expired-session sign-in.');
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:900});check(`Session dialog ${width}px fits and exposes both exit choices`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&await modal.getByRole('button',{name:'Return to my draft',exact:true}).isVisible()&&await modal.getByRole('button',{name:'Discard and leave',exact:true}).isVisible());}
  await page.keyboard.press('Escape');await modal.waitFor({state:'hidden'});check('Escape returns to the retained draft and releases modal focus',await page.locator('#project-summary').inputValue().then(v=>v.startsWith('Unsaved draft'))&&await page.evaluate(()=>!document.activeElement.closest('dialog')));
  await page.locator('#project-summary').fill('Still editable in this tab.');await page.getByRole('button',{name:'Sign in again',exact:true}).click();await modal.getByLabel('Email address',{exact:true}).fill('session-ui-fixture@example.invalid');await modal.getByLabel('Password',{exact:true}).fill('synthetic-session-fixture-password');
  wrongPassword=true;await modal.getByRole('button',{name:'Sign in ↗',exact:true}).click();await modal.getByRole('alert').waitFor();check('Wrong password focuses correction and does not lose the draft',await modal.getByRole('alert').evaluate(e=>e===document.activeElement)&&await page.locator('#project-summary').inputValue()==='Still editable in this tab.'&&saves===0);
  wrongPassword=false;holdLogin=true;const loginIntercepted=new Promise(resolve=>{loginSeen=resolve;});await modal.getByRole('button',{name:'Sign in ↗',exact:true}).click();await loginIntercepted;
  check('Pending sign-in disables both exit choices',await modal.getByRole('button',{name:'Return to my draft',exact:true}).isDisabled()&&await modal.getByRole('button',{name:'Discard and leave',exact:true}).isDisabled());await page.keyboard.press('Escape');check('Escape cannot abandon a pending sign-in request',await modal.isVisible());await releaseLogin();holdLogin=false;
  await modal.getByLabel('Authenticator or recovery code',{exact:true}).fill('synthetic-rejected-code');wrongMfa=true;await modal.getByRole('button',{name:'Verify and continue ↗',exact:true}).click();await modal.getByRole('alert').waitFor();check('Rejected MFA preserves draft and usable correction fields',await page.locator('#project-summary').inputValue()==='Still editable in this tab.'&&await modal.getByLabel('Authenticator or recovery code',{exact:true}).isEnabled());
  wrongMfa=false;await modal.getByLabel('Authenticator or recovery code',{exact:true}).fill('synthetic-valid-fixture');await modal.getByRole('button',{name:'Verify and continue ↗',exact:true}).click();await modal.waitFor({state:'hidden'});
  check('Reauthentication preserves unsaved content and never automatically retries saving',saves===0&&await page.locator('#project-summary').inputValue()==='Still editable in this tab.'&&await page.getByRole('button',{name:'Save draft',exact:true}).isEnabled());
  check('Successful sign-in replaces the stale error with explicit retry and upload guidance',await page.getByText('Signed in again. Your draft is still here. Review and retry the action; nothing has been retried automatically. For an interrupted upload, choose the image again.',{exact:true}).isVisible()&&await page.locator('.admin-editor .admin-error').count()===0);
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Draft saved. The public version stays as it was until you publish.',{exact:true}).waitFor();check('Only an explicit confirmed retry saves the draft',saves===1&&project.version===4&&project.publishedVersion===2);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByLabel('Email address',{exact:true}).fill('session-ui-fixture@example.invalid');await page.getByLabel('Password',{exact:true}).fill('synthetic-session-fixture-password');await page.getByRole('button',{name:'Sign in ↗',exact:true}).click();await page.getByLabel('Authenticator or recovery code',{exact:true}).fill('synthetic-valid-fixture');await page.getByRole('button',{name:'Verify and continue ↗',exact:true}).click();await page.getByRole('button',{name:'New project +',exact:true}).waitFor();check('Sign-out and a fresh sign-in clear the old expired-session warning',await page.locator('#owner-resume-signin').count()===0);await page.getByRole('button',{name:project.content.title,exact:true}).click();
  auth=false;await page.getByRole('button',{name:'Images',exact:true}).click();await page.locator('#project-upload').setInputFiles(path.resolve('.codex-runtime/qa/approved-clare/desktop.jpg'));await modal.waitFor();
  check('Expired upload does not claim success or add an image',uploads===0&&await page.locator('.admin-image-library article').count()===1&&await page.getByText('Image uploaded privately. Choose where it appears, then save your draft.',{exact:true}).count()===0);
  await modal.getByRole('button',{name:'Return to my draft',exact:true}).click();sessionFailure=true;await page.getByRole('button',{name:'Sign in again',exact:true}).click();await modal.getByRole('button',{name:'Retry session check',exact:true}).waitFor();check('Unavailable session check offers retry and still permits draft return',await modal.getByRole('button',{name:'Return to my draft',exact:true}).isEnabled());sessionFailure=false;mfa=true;await modal.getByRole('button',{name:'Retry session check',exact:true}).click();await modal.getByLabel('Authenticator or recovery code',{exact:true}).waitFor();check('Returning to a partial MFA session uses its current verification state',await modal.getByLabel('Email address',{exact:true}).count()===0);
  await modal.getByLabel('Authenticator or recovery code',{exact:true}).fill('synthetic-valid-fixture');await modal.getByRole('button',{name:'Verify and continue ↗',exact:true}).click();await modal.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Details',exact:true}).click();await page.getByRole('button',{name:'Publish this revision ↗',exact:true}).click();await page.getByRole('checkbox',{name:'I have permission to share this project, its images and the claims in its story.',exact:true}).check();auth=false;await page.getByRole('button',{name:'Publish revision 4 ↗',exact:true}).click();await modal.waitFor();
  check('Expired publication closes review and preserves the public revision',publishes===0&&project.publishedVersion===2&&await page.locator('.admin-publish-review').count()===0&&await page.getByText('Published. Existing pages refresh automatically while visible and connected.',{exact:true}).count()===0);
  page.once('dialog',d=>d.dismiss());await modal.getByRole('button',{name:'Discard and leave',exact:true}).click();check('Declining discard leaves the owner and draft in place',await modal.isVisible()&&new URL(page.url()).pathname==='/admin');
  await modal.getByRole('button',{name:'Return to my draft',exact:true}).click();await page.locator('#project-summary').fill('Unsaved before closing the tab.');
  let unloadType='';page.once('dialog',d=>{unloadType=d.type();d.dismiss();});await page.reload({waitUntil:'domcontentloaded'}).catch(()=>{});check('Closing/refreshing an unsaved draft triggers native beforeunload protection',unloadType==='beforeunload'&&await page.locator('#project-summary').inputValue()==='Unsaved before closing the tab.');
  await page.getByRole('button',{name:'Sign in again',exact:true}).click();await modal.waitFor();await page.setViewportSize({width:390,height:844});await modal.getByLabel('Email address',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'session-mobile.png')});
  let discardPrompt='';page.once('dialog',d=>{discardPrompt=d.message();d.accept();});await modal.getByRole('button',{name:'Discard and leave',exact:true}).click();await page.waitForURL(base+'/');
  check('Confirmed discard leaves for public site with explicit saved/public version reassurance',discardPrompt.includes('last saved draft')&&await page.locator('.admin-editor').count()===0&&project.publishedVersion===2);
  check('No uncaught session browser errors',report.errors.length===0);await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log('SESSION_BROWSER_PASS:',report.checks.length,'checks; evidence:',output);
 }catch(error){report.failure=String(error);await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
