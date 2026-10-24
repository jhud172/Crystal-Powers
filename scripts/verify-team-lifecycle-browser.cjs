/* Controlled transport/JSON interleavings and synthetic private data; no real account or mutation. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084',output=path.resolve('.codex-runtime/qa/team-lifecycle-pc');
assert.match(base, /^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const report={checks:[],errors:[],scope:'Packaged team workspace; synthetic permissions/conversations and a controlled parsed-JSON completion after a newer read'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.addInitScript(()=>{
  const original=window.fetch;
  window.fetch=async function(...args){
   const response=await original.apply(this,args);
   if(response.headers.get('x-synthetic-late-json')==='workspace'){
    const json=response.json.bind(response);
    response.json=async()=>{const value=await json();await new Promise(resolve=>{window.__releaseSyntheticWorkspace=resolve;});return value;};
   }
   return response;
  };
 });
 const member='26000000-0000-4000-8000-000000000001',A='26000000-0000-4000-8000-000000000002',B='26000000-0000-4000-8000-000000000003';
 const permissions=['READ_CHANNELS','SEND_MESSAGES'];
 const channel=(id,name)=>({id,name,description:'Synthetic channel',category:'Team',audience:'TEAM',archived:false,version:0,groupId:null});
 const channels=[channel(A,'removed-private-channel'),channel(B,'retained-channel')];
 const workspace=values=>({displayName:'Synthetic lifecycle member',memberId:member,ownerId:null,permissions,channels:values,settings:{branding:{name:'Synthetic QA workspace',tagline:'',version:0},preferences:{compact:false,unreadBadges:true,mentionAlerts:true,version:0},displayName:'Synthetic lifecycle member',editableName:true,channelPreferences:[]}});
 const message=(id,body)=>({id,author:'Synthetic lifecycle member',authorOwnerId:null,authorTeamId:member,body,version:0,createdAt:'2026-10-19T10:00:00Z',editedAt:null,replyToId:null,replyAuthor:null,replyBody:null,pinned:false});
 const mention=(id,channelId,preview)=>({id,channelId,channelName:channels.find(row=>row.id===channelId).name,author:'Synthetic author',preview,createdAt:'2026-10-19T10:00:00Z'});
 let mode='INITIAL',unreadIds=[A,B],mentionsDenied=false,unreadCount=0,workspaceCount=0;
 await page.route('**/api/**',async route=>{
  const endpoint=new URL(route.request().url()).pathname;
  const reply=(body,status=200,headers={})=>route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(body)});
  if(endpoint==='/api/team/auth/session')return reply({authenticated:true,member:{displayName:'Synthetic lifecycle member',role:'MEMBER'},permissions});
  if(endpoint==='/api/admin/auth/csrf')return reply({token:'synthetic-lifecycle-csrf',headerName:'X-CSRF-TOKEN'});
  if(endpoint==='/api/team/workspace'){
   workspaceCount++;
   if(mode==='DENIED')return reply({message:'Synthetic workspace access denied.'},403);
   return reply(workspace(mode==='FRESH' ? [channels[1]] : channels),200,mode==='LATE' ? {'x-synthetic-late-json':'workspace'} : {});
  }
  if(endpoint==='/api/team/unread'){unreadCount++;return reply(unreadIds.map(channelId=>({channelId,count:0,lastReadId:0,latestId:channelId===A ? 1 : 2})));}
  if(endpoint===`/api/team/channels/${A}/conversation`)return reply({version:0,unchanged:false,messages:[message(1,'Synthetic private A message')],hasEarlier:false,hasLater:false});
  if(endpoint===`/api/team/channels/${B}/conversation`)return reply({version:0,unchanged:false,messages:[message(2,'Synthetic retained B message')],hasEarlier:false,hasLater:false});
  if([`/api/team/channels/${A}/mention-recipients`,`/api/team/channels/${B}/mention-recipients`].includes(endpoint))return reply([]);
  if(endpoint==='/api/team/mentions')return mentionsDenied ? reply({message:'Synthetic mention access denied.'},403) : reply({mentions:(mode==='INITIAL' ? [mention(1,A,'Synthetic private A mention')] : [mention(2,B,'Synthetic retained B mention')]),nextCursor:null});
  report.errors.push('Unexpected fixture endpoint: '+route.request().method()+' '+endpoint);return reply({message:'Unexpected synthetic endpoint.'},400);
 });
 const composer=()=>page.locator('.team-composer textarea');
 const choose=id=>page.locator('nav[aria-label="Team channels"] button').filter({hasText:id===A ? /removed-private-channel/ : /retained-channel/}).click();
 async function foregroundRefresh(){
  const previous=unreadCount;
  const response=page.waitForResponse(value=>new URL(value.url()).pathname==='/api/team/unread');
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await (await response).finished();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  check('Foreground refresh uses one bounded unread request '+unreadCount,unreadCount===previous+1);
 }
 try{
  await page.goto(base+'/team');await composer().waitFor();
  await page.getByText('Synthetic private A message',{exact:true}).waitFor();
  await composer().fill('Synthetic private A draft');
  await choose(B);await composer().fill('Synthetic retained B draft');await choose(A);
  check('Channel drafts are distinct before access changes',await composer().inputValue()==='Synthetic private A draft');
  await page.locator('.team-mention-inbox summary').click();await page.getByText('Synthetic private A mention',{exact:true}).waitFor();
  mode='LATE';unreadIds=[B];await foregroundRefresh();
  await page.waitForFunction(()=>typeof window.__releaseSyntheticWorkspace==='function');
  const before=workspaceCount;mode='FRESH';await foregroundRefresh();
  await page.getByText('Synthetic retained B message',{exact:true}).waitFor();
  check('A newer workspace response was requested while older JSON was held',workspaceCount>before);
  check('Fresh access list removes old channel metadata and message history',await page.locator('nav[aria-label="Team channels"] button').count()===1 && !(await page.locator('nav[aria-label="Team channels"]').innerText()).includes('removed-private-channel') && await page.getByText('Synthetic private A message',{exact:true}).count()===0);
  check('Still-authorised channel retains its draft',await composer().inputValue()==='Synthetic retained B draft');
  check('Removed channel mention preview is immediately hidden',await page.getByText('Synthetic private A mention',{exact:true}).count()===0);
  await page.evaluate(()=>window.__releaseSyntheticWorkspace());
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  check('Late parsed JSON cannot restore an obsolete channel list',!(await page.locator('nav[aria-label="Team channels"]').innerText()).includes('removed-private-channel'));
  check('Late parsed JSON cannot replace current draft or message',await composer().inputValue()==='Synthetic retained B draft' && await page.getByText('Synthetic retained B message',{exact:true}).isVisible());
  await page.getByText('Synthetic retained B mention',{exact:true}).waitFor();mentionsDenied=true;
  await page.getByRole('button',{name:'Refresh mentions',exact:true}).click();await page.getByText('Synthetic mention access denied.',{exact:true}).waitFor();
  check('Refused mention reload clears its private preview and actions',await page.getByText('Synthetic retained B mention',{exact:true}).count()===0 && await page.getByRole('button',{name:'Acknowledge mention',exact:true}).count()===0);
  mode='DENIED';unreadIds=[];await foregroundRefresh();
  await page.getByText('Synthetic workspace access denied.',{exact:true}).waitFor();
  check('Denied workspace removes loaded conversation and composer',await composer().count()===0 && await page.getByText('Synthetic retained B message',{exact:true}).count()===0);
  check('Denied workspace clears channel navigation and mention previews',await page.locator('nav[aria-label="Team channels"] button').count()===0 && await page.locator('.team-mention-inbox li').count()===0);
  mode='FRESH';unreadIds=[B];mentionsDenied=false;
  await page.getByRole('button',{name:'Try again',exact:true}).click();await composer().waitFor();
  check('Confirmed same-account retry restores only an eligible draft',await composer().inputValue()==='Synthetic retained B draft');
  check('Private draft text is not stored in local/session storage',await page.evaluate(()=>!JSON.stringify({...localStorage,...sessionStorage}).includes('Synthetic retained B draft')));
  check('No unexpected API or uncaught browser errors',report.errors.length===0);
 }catch(error){report.failure=error.stack;report.failureState={mode,workspaceCount,unreadCount,alerts:await page.getByRole('alert').allInnerTexts(),retryButtons:await page.getByRole('button',{name:'Try again',exact:true}).count(),composerCount:await composer().count(),channelButtons:await page.locator('nav[aria-label="Team channels"] button').count(),main:await page.locator('main').innerText()};await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log('TEAM_LIFECYCLE_BROWSER_PASS: '+report.checks.length+' checks');
})().catch(error=>{console.error(error);process.exitCode=1;});
