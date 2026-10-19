const inspectPrivateDesign = require('./lib/private-design-audit.cjs').createPrivateDesignAudit('team-members');
/* Packaged UI with explicit synthetic account/management/mail responses. No real account or email mutations. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base=process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';assert.equal(base,'http://127.0.0.1:8084');
const output=path.resolve('.codex-runtime/qa/team-members-pc');
const report={checks:[],errors:[],runtime:'Installed Edge and packaged app; synthetic member, access, conflict and delivery responses only'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 page.on('pageerror',error=>report.errors.push(error.message));
 const id=n=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const manager={id:id(1),email:'manager@example.invalid',displayName:'Synthetic manager',role:'ADMIN',state:'ACTIVE',credentialsVersion:2};
 let peer={id:id(2),email:'peer@example.invalid',displayName:'Synthetic peer',role:'MEMBER',state:'ACTIVE',credentialsVersion:3}, invited=null;
 let creatableRoles=['MEMBER'];
 let actorScope='TEAM:'+manager.id,readFailure=0,createCalls=0,mutations=[],emailSends=0,emailState='NOT_SENT',rejectChange=false;
 const grants=['READ_CHANNELS','MANAGE_MEMBERS'];
 const management=()=>({actorScope,members:[{member:manager,manageable:false},{member:peer,manageable:true},...(invited?[{member:invited,manageable:true}]:[])],creatableRoles});
 const issued=member=>({member:{...member},invitationPath:'/team/activate#token=synthetic-'+member.credentialsVersion,expiresAt:'2099-01-01T00:00:00Z'});
 await page.route('**/api/**',async route=>{
  const req=route.request(),endpoint=new URL(req.url()).pathname,method=req.method();
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(endpoint==='/api/team/auth/session')return reply({authenticated:true,member:{displayName:manager.displayName,role:'ADMIN'},permissions:grants});
  if(endpoint==='/api/team/workspace')return reply({displayName:manager.displayName,memberId:manager.id,ownerId:null,permissions:grants,channels:[],settings:{branding:{name:'Synthetic member workspace',tagline:'',version:0},preferences:{compact:false,unreadBadges:false,mentionAlerts:false,version:0},displayName:manager.displayName,editableName:true,channelPreferences:[]}});
  if(endpoint==='/api/team/unread')return reply([]);
  if(endpoint==='/api/team/mentions')return reply({mentions:[],nextCursor:null});
  if(endpoint==='/api/admin/auth/csrf')return reply({token:'synthetic-csrf',headerName:'X-CSRF-TOKEN'});
  if(endpoint==='/api/team/members/management')return readFailure?reply({message:'Synthetic member access must be checked again.'},readFailure):reply(management());
  if(endpoint==='/api/team/members'&&method==='POST'){
   const body=req.postDataJSON();mutations.push({method,body});createCalls++;
   if(createCalls===1)return reply({message:'Synthetic address conflict. Check the intended recipient.'},409);
   invited={id:id(3),email:body.email,displayName:body.displayName,role:body.role,state:'INVITED',credentialsVersion:1};return reply(issued(invited));
  }
  if(endpoint.startsWith('/api/team/invitation-emails/TEAM/')){
   const body=req.postDataJSON();const target=endpoint.includes(peer.id)?peer:invited;
   check('Delivery request binds the current account version and token',body.version===target.credentialsVersion&&body.token==='synthetic-'+target.credentialsVersion);
   if(endpoint.endsWith('/send')){emailSends++;emailState='UNKNOWN';return reply({message:'Synthetic delivery outcome could not be confirmed.'},503);}
   return reply({state:emailState,email:target.email,expiresAt:'2099-01-01T00:00:00Z',available:true,availabilityMessage:''});
  }
  if(endpoint.startsWith('/api/team/members/')){
   const body=req.postDataJSON();mutations.push({endpoint,method,body});const target=endpoint.includes(peer.id)?peer:invited;
   check('Member action carries its displayed revision',body.expectedVersion===target.credentialsVersion);
   if(method==='PATCH'){
    if(rejectChange)return reply({message:'Synthetic member changed. Reload before trying again.'},409);
    Object.assign(target,{role:body.role,state:body.state,credentialsVersion:target.credentialsVersion+1});return reply(target);
   }
   if(endpoint.endsWith('/cancel')){Object.assign(target,{state:'SUSPENDED',credentialsVersion:target.credentialsVersion+1});return reply({success:true});}
   if(endpoint.endsWith('/reset')||endpoint.endsWith('/invitation')){Object.assign(target,{state:'INVITED',credentialsVersion:target.credentialsVersion+1});emailState='NOT_SENT';return reply(issued(target));}
  }
  report.errors.push('Unexpected member fixture: '+method+' '+endpoint);return reply({message:'Unexpected fixture endpoint'},400);
 });
 const row=name=>page.locator('.team-member-list > li').filter({has:page.locator('strong').filter({hasText:new RegExp('^'+name+'$')})});
 const dialog=accepted=>page.once('dialog',event=>accepted?event.accept():event.dismiss());
 try{
  await page.goto(base+'/team');await page.getByRole('button',{name:'Team members',exact:true}).click();await page.getByLabel('Display name',{exact:true}).waitFor();
  const name=page.getByLabel('Display name',{exact:true}),email=page.getByLabel('Email',{exact:true}),role=page.getByRole('combobox',{name:'Role',exact:true}),create=page.getByRole('button',{name:'Create invitation',exact:true}),reload=page.getByRole('button',{name:'Reload members',exact:true});
  await role.locator('option').filter({hasText:'MEMBER'}).waitFor({state:'attached'});
  check('Only grantable creation roles are offered',(await role.locator('option').allTextContents()).join(',')==='MEMBER');
  check('Self management is disabled',await row(manager.displayName).getByRole('button',{name:'Suspend access',exact:true}).isDisabled()&&await row(manager.displayName).locator('select').isDisabled());
  check('Peer management is enabled',await row(peer.displayName).getByRole('button',{name:'Suspend access',exact:true}).isEnabled());
  await name.fill('Synthetic new colleague');await email.fill('new@example.invalid');await create.click();await page.getByText('Synthetic address conflict. Check the intended recipient.',{exact:true}).waitFor();
  check('Invitation conflict keeps unsaved recipient and role',await name.inputValue()==='Synthetic new colleague'&&await email.inputValue()==='new@example.invalid'&&await role.inputValue()==='MEMBER');
  await create.click();await page.getByLabel('Private invitation link',{exact:true}).waitFor();
  check('Creation sends the selected role and recipient',createCalls===2&&mutations[1].body.role==='MEMBER'&&mutations[1].body.email==='new@example.invalid');
  check('Successful creation clears the input draft',await name.inputValue()===''&&await email.inputValue()==='');
  const link=page.getByLabel('Private invitation link',{exact:true});check('New private link uses a fragment',new URL(await link.inputValue()).hash==='#token=synthetic-1');
  const send=page.getByRole('button',{name:'Send invitation to recorded recipient',exact:true});await send.waitFor();
  check('Creating an invitation does not send email',emailSends===0&&await send.isDisabled());
  await page.getByRole('checkbox',{name:'I have checked this recipient and want to email their private activation link.',exact:true}).check();await send.click();await page.getByText('Synthetic delivery outcome could not be confirmed.',{exact:true}).waitFor();
  check('Unconfirmed email is not automatically resubmitted',emailSends===1&&await send.count()===0);
  await page.getByRole('button',{name:'Refresh email status',exact:true}).click();await page.getByText('The email outcome is unknown. This invitation will not be automatically resent. Check the account and recipient before deliberately replacing it.',{exact:true}).waitFor();
  check('Status refresh cannot resend an uncertain invitation',emailSends===1&&await send.isDisabled());
  await row(invited.displayName).getByRole('button',{name:'Replace invitation',exact:true}).click();await page.waitForFunction(()=>document.querySelector('input[readonly]')?.value.endsWith('synthetic-2'));
  check('Replacement shows only the new invitation revision',(await link.inputValue()).endsWith('synthetic-2')&&emailSends===1);
  dialog(false);await row(invited.displayName).getByRole('button',{name:'Cancel invitation',exact:true}).click();check('Cancelled confirmation keeps invitation active',invited.state==='INVITED'&&await link.isVisible());
  dialog(true);await row(invited.displayName).getByRole('button',{name:'Cancel invitation',exact:true}).click();await link.waitFor({state:'hidden'});
  check('Confirmed cancellation clears private link and refreshed state is suspended',invited.state==='SUSPENDED'&&await row(invited.displayName).getByText(/SUSPENDED/).isVisible());
  dialog(false);await row(peer.displayName).getByRole('button',{name:'Suspend access',exact:true}).click();check('Dismissing suspension performs no mutation',peer.state==='ACTIVE');
  dialog(true);await row(peer.displayName).getByRole('button',{name:'Suspend access',exact:true}).click();await row(peer.displayName).getByRole('button',{name:'Restore access',exact:true}).waitFor();
  check('Confirmed suspension refreshes actions and revision',peer.state==='SUSPENDED'&&peer.credentialsVersion===4);
  await row(peer.displayName).getByRole('button',{name:'Restore access',exact:true}).click();await row(peer.displayName).getByRole('button',{name:'Suspend access',exact:true}).waitFor();check('Restore refreshes active peer management',peer.state==='ACTIVE'&&peer.credentialsVersion===5);
  rejectChange=true;dialog(true);await row(peer.displayName).getByRole('button',{name:'Suspend access',exact:true}).click();await page.getByText('Synthetic member changed. Reload before trying again.',{exact:true}).waitFor();check('Conflict releases controls without pretending state changed',peer.state==='ACTIVE'&&await reload.isEnabled());rejectChange=false;
  dialog(false);await row(peer.displayName).getByRole('button',{name:'Recover account with new invitation',exact:true}).click();check('Recovery needs explicit confirmation',peer.state==='ACTIVE');
  dialog(true);await row(peer.displayName).getByRole('button',{name:'Recover account with new invitation',exact:true}).click();await link.waitFor();check('Recovery replaces credentials with an invitation',peer.state==='INVITED'&&(await link.inputValue()).endsWith('synthetic-6'));
  peer.state='ACTIVE';peer.credentialsVersion++;await reload.click();await link.waitFor({state:'hidden'});check('External activation retires the previously exposed link',await row(peer.displayName).getByRole('button',{name:'Suspend access',exact:true}).isEnabled());
  readFailure=503;await reload.click();await page.getByText('Synthetic member access must be checked again.',{exact:true}).waitFor();check('Unavailable management clears private member rows and blocks new invitations',await page.locator('.team-member-list > li').count()===0&&await create.isDisabled());
  readFailure=0;await reload.click();await row(peer.displayName).waitFor();check('Fresh access confirmation recovers management controls',await create.isEnabled());
  await name.fill('Previous actor draft');await email.fill('draft@example.invalid');actorScope='TEAM:'+id(4);await reload.click();await page.waitForFunction(()=>document.querySelector('input[name="displayName"]')?.value==='');check('Different actor scope clears unsaved recipient details',await name.inputValue()===''&&await email.inputValue()==='');
  readFailure=403;await reload.click();await page.getByText('Synthetic member access must be checked again.',{exact:true}).waitFor();check('Authority refusal removes all member names and actions',await page.locator('.team-member-list > li').count()===0&&await create.isDisabled());
  readFailure=0;await reload.click();await row(peer.displayName).waitFor();
  creatableRoles=['MEMBER','SUPPORT'];await reload.click();
  const peerRole=page.getByRole('combobox',{name:'Role for '+peer.displayName,exact:true});await peerRole.locator('option').filter({hasText:'SUPPORT'}).waitFor({state:'attached'});
  const versionBeforeRoleChange=peer.credentialsVersion;await Promise.all([page.waitForResponse(response=>response.request().method()==='PATCH'&&new URL(response.url()).pathname==='/api/team/members/'+peer.id),peerRole.selectOption('SUPPORT')]);
  await page.waitForFunction(()=>document.querySelectorAll('.team-member-list > li')[1]?.querySelector('select')?.value==='SUPPORT');
  check('A freshly grantable role can be assigned with the current revision',peer.role==='SUPPORT'&&peer.credentialsVersion===versionBeforeRoleChange+1&&mutations.at(-1).body.role==='SUPPORT');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});check(width+' member management has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  const stored=await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]));check('Private invitations and member draft details never enter browser storage',!stored.includes('synthetic-')&&!stored.includes('draft@example.invalid')&&!stored.includes('new@example.invalid'));
  await inspectPrivateDesign(page,'Member administration');
  check('No page errors or unexpected API calls',report.errors.length===0);
 }catch(error){report.failure=error.stack;await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log('TEAM_MEMBERS_BROWSER_PASS: '+report.checks.length+' checks');
})().catch(error=>{console.error(error);process.exitCode=1;});
