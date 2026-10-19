/* Synthetic client administration/invitation transports; no real recipient, account, clipboard or provider changes. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base='http://127.0.0.1:8084',output=path.resolve('.codex-runtime/qa/client-access-pc');
const report={checks:[],errors:[],scope:'Packaged staff client-access workflow, explicit revision/outage/denial/invitation fixtures and controlled clipboard completion'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(resolve=>{window.__releaseSyntheticClipboard=resolve;})}}));
 const id='27000000-0000-4000-8000-000000000001',staff='27000000-0000-4000-8000-000000000002',clientId='27000000-0000-4000-8000-000000000003';
 const permissions=['READ_CHANNELS','READ_SUPPORT','MANAGE_CLIENTS'];
 const summary={id,clientName:'Synthetic access client',clientEmail:'access-client@example.invalid',intent:'app',subject:'Synthetic client access request',state:'NEW',progress:0,nextStep:'Agree the scope',assignedMemberId:null,notificationState:'FAILED',version:0,createdAt:'2026-10-19T10:00:00Z',updatedAt:'2026-10-19T10:00:00Z'};
 const requestPath='/api/team/support/requests/'+id,accessPath=requestPath+'/client-access';
 let account={id:clientId,email:summary.clientEmail,displayName:'Synthetic access account',state:'INVITED',version:4},mode='READY',issued=0,conflict=false;
 const writes=[];
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),endpoint=url.pathname,method=route.request().method();
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(endpoint==='/api/team/auth/session')return reply({authenticated:true,member:{displayName:'Synthetic client manager',role:'ADMIN'},permissions});
  if(endpoint==='/api/admin/auth/csrf')return reply({token:'synthetic-client-access-csrf',headerName:'X-CSRF-TOKEN'});
  if(endpoint==='/api/team/workspace')return reply({displayName:'Synthetic client manager',memberId:staff,ownerId:null,permissions,channels:[],settings:{branding:{name:'Synthetic QA workspace',tagline:'',version:0},preferences:{compact:false,unreadBadges:false,mentionAlerts:false,version:0},displayName:'Synthetic client manager',editableName:true,channelPreferences:[]}});
  if(endpoint==='/api/team/unread')return reply([]);
  if(endpoint==='/api/team/support/requests/page')return reply({items:[summary],nextCursor:null});
  if(endpoint==='/api/team/support/assignees')return reply([]);
  if(endpoint===requestPath+'/overview')return reply({request:summary,brief:{message:'Synthetic original request'},attachments:[],emailAvailable:false,contactPreference:'PORTAL_AND_EMAIL',actorScope:'TEAM:'+staff,permissions});
  if(endpoint===requestPath+'/updates')return reply({items:[],nextCursor:null});
  if(endpoint===requestPath+'/billing/page')return reply({items:[],nextCursor:null,total:0,unissued:0});
  if(endpoint===requestPath+'/billing/settings')return reply({paymentsEnabled:false,managementEnabled:false,liveMode:false});
  if(endpoint===accessPath && method==='GET'){
   if(mode==='OUTAGE')return reply({message:'Synthetic client access unavailable.'},503);
   if(mode==='DENIED')return reply({message:'Synthetic client access denied.'},403);
   if(mode==='EXPIRED')return reply({message:'Synthetic client manager session expired.'},401);
   return reply(account ? {linked:true,account} : {linked:false});
  }
  if(endpoint.startsWith(accessPath) && method==='POST'){
   const action=endpoint===accessPath ? 'provision' : endpoint.slice(accessPath.length+1),input=route.request().postDataJSON();writes.push({action,input});
   if(conflict){conflict=false;account.version++;return reply({message:'Synthetic client access revision changed.'},409);}
   if(action==='provision' && (input.expectedLinked!==!!account || (account && input.expectedVersion!==account.version)))return reply({message:'Fixture rejected stale provision proof.'},409);
   if(action!=='provision' && input.expectedVersion!==account?.version)return reply({message:'Fixture rejected stale recovery proof.'},409);
   if(!account)account={id:clientId,email:summary.clientEmail,displayName:'Synthetic access account',state:'INVITED',version:0};
   account={...account,version:account.version+1,state:action==='suspend' ? 'SUSPENDED' : 'INVITED'};
   if(action==='suspend')return reply({success:true});
   issued++;return reply({...account,invitationToken:String.fromCharCode(64+issued).repeat(43)});
  }
  if(endpoint.startsWith('/api/team/invitation-emails/CLIENT/'+id+'/'))return reply({state:'NOT_SENT',email:summary.clientEmail,expiresAt:'2026-10-22T10:00:00Z',available:false,availabilityMessage:'Synthetic email disabled.'});
  report.errors.push('Unexpected fixture endpoint: '+method+' '+endpoint);return reply({message:'Unexpected synthetic endpoint.'},400);
 });
 const button=name=>page.getByRole('button',{name,exact:true}),link=()=>page.getByLabel('Private activation link',{exact:true});
 const panel=()=>page.locator('.support-client-access').first();
 async function replace(){await button('Replace private invitation').click();await link().waitFor();return link().inputValue();}
 async function refresh(){await button('Refresh client access').click();}
 try{
  await page.goto(base+'/team');await button('Client requests').click();await page.getByRole('button',{name:/Synthetic access client/}).click();
  await button('Replace private invitation').waitFor();const first=await replace();
  await page.getByText('Synthetic email disabled.',{exact:true}).waitFor();
  check('Invitation replacement carries confirmed binding and original revision',writes[0].input.expectedLinked===true && writes[0].input.expectedVersion===4);
  check('Replacement displays the returned private token without automatic email',first.endsWith('#token='+'A'.repeat(43)) && await page.getByText('Synthetic email disabled.',{exact:true}).isVisible());
  check('New invitation uses the returned account revision',account.version===5);
  await button('Copy private invitation').click();await page.waitForFunction(()=>typeof window.__releaseSyntheticClipboard==='function');
  mode='OUTAGE';await refresh();await page.getByText('Synthetic client access unavailable.',{exact:true}).waitFor();
  check('Unconfirmed access refresh clears the private link and account metadata',await link().count()===0 && !(await panel().innerText()).includes('Synthetic access account'));
  check('A failed read blocks provisioning but keeps status recovery available',await button('Link client access').isDisabled() && await button('Refresh client access').isEnabled());
  await page.evaluate(()=>window.__releaseSyntheticClipboard());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  check('Late clipboard completion cannot claim a cleared invitation was copied',await page.getByText(/Private invitation copied/).count()===0);
  mode='READY';await refresh();await button('Replace private invitation').waitFor();
  check('Confirmed status retry restores controls without reviving a hidden token',await link().count()===0 && await button('Replace private invitation').isEnabled());
  await replace();check('Subsequent replacement uses the fresh revision',writes.at(-1).input.expectedVersion===5);
  account={...account,state:'ACTIVE',version:account.version+1};await refresh();
  await page.getByText('Client access changed. The previous private invitation has been hidden.',{exact:true}).waitFor();
  check('External activation/revision change removes the old link',await link().count()===0);
  const before=writes.length;page.once('dialog',dialog=>dialog.dismiss());await button('Recover client account').click();
  check('Declining recovery changes nothing',writes.length===before);
  page.once('dialog',dialog=>dialog.accept());await button('Recover client account').click();await link().waitFor();
  check('Confirmed recovery uses the current credential revision',writes.at(-1).action==='recover' && writes.at(-1).input.expectedVersion===7 && account.version===8);
  page.once('dialog',dialog=>dialog.accept());await button('Suspend all client access').click();
  await page.getByText('Client access suspended. No Stripe subscription was cancelled.',{exact:true}).waitFor();
  check('Suspension clears invitation and blocks silent new linking',await link().count()===0 && await button('Link client access').isDisabled() && account.state==='SUSPENDED');
  check('Explicit recovery remains available after suspension',await button('Recover client account').isEnabled());
  conflict=true;page.once('dialog',dialog=>dialog.accept());await button('Recover client account').click();await page.getByText('Synthetic client access revision changed.',{exact:true}).waitFor();
  check('Recovery conflict requires fresh status before another attempt',await button('Recover client account').count()===0 && await button('Refresh client access').isEnabled());
  check('Child recovery conflict does not leave the support inbox locked',await button('Refresh inbox').isEnabled());
  mode='DENIED';await refresh();await page.getByText('Synthetic client access denied.',{exact:true}).waitFor();
  check('Denied client administration clears its private account view',!(await panel().innerText()).includes(summary.clientEmail) && await link().count()===0);
  mode='READY';account=null;await refresh();await page.getByText("No client account is linked. Create access using this request's recorded recipient.",{exact:true}).waitFor();
  await button('Link client access').click();await link().waitFor();
  check('First linking supplies an explicit unlinked-state proof',writes.at(-1).input.expectedLinked===false && writes.at(-1).input.expectedVersion===null);
  mode='EXPIRED';await refresh();await page.getByLabel('Email',{exact:true}).waitFor();
  check('Expired staff session removes client-administration UI',await panel().count()===0 && await link().count()===0);
  check('Private invitation/account data is not persisted in browser storage',await page.evaluate(()=>![...Object.values(localStorage),...Object.values(sessionStorage)].some(value=>/A{43}|B{43}|C{43}|access-client@example\.invalid/.test(value))));
  check('No unexpected API or browser errors',report.errors.length===0);
 }catch(error){report.failure=error.stack;throw error;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log('CLIENT_ACCESS_BROWSER_PASS: '+report.checks.length+' checks');
})().catch(error=>{console.error(error);process.exitCode=1;});
