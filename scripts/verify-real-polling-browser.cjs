/* Real HTTP/PostgreSQL acceptance on disposable accounts; no routed API fixtures. */
const {request}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const {openNativeEdge}=require('./native-edge-fixture.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const base='http://127.0.0.1:18084';
function otp(secret){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of secret.replace(/=+$/,''))bits+=chars.indexOf(c).toString(2).padStart(5,'0');const key=Buffer.from(bits.match(/.{8}/g).map(b=>parseInt(b,2))),counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=crypto.createHmac('sha1',key).update(counter).digest(),offset=h[19]&15;return String((h.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
(async()=>{
 let input='';for await(const part of process.stdin)input+=part;const f=JSON.parse(input);input='';
 const output=path.resolve(f.output);assert.ok(output.startsWith(path.resolve('.codex-runtime/qa')+path.sep));
 const report={candidateSha256:f.candidateSha256,browserExecutable:process.env.CRYSTAL_BROWSER_EXECUTABLE || 'installed Edge',checks:[],errors:[],scope:'Owned native Chromium browser, real local PostgreSQL/session HTTP. Real hidden tabs and transport offline/online. No production or provider writes.'};
 const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS '+name);};
 const scrub=text=>[f.password,f.ownerSecret,f.teamSecret].reduce((s,v)=>s.split(v).join('[redacted]'),String(text));
 const owned=await openNativeEdge(),owner=await request.newContext();const {page,context}=owned;page.setDefaultTimeout(25000);
 const requests=[];page.on('request',r=>{const url=new URL(r.url());if(url.pathname.startsWith('/api/team/'))requests.push({path:url.pathname,method:r.method(),time:Date.now()});});page.on('pageerror',e=>report.errors.push(scrub(e.message)));
 async function call(client,method,endpoint,data,expected=200){let headers={};if(method!=='GET'){const proof=await(await client.get(base+'/api/admin/auth/csrf')).json();headers[proof.headerName]=proof.token;}const r=await client.fetch(base+endpoint,{method,headers,data});assert.equal(r.status(),expected,method+' '+endpoint);return r.status()===200?r.json():null;}
 const counts=()=>({unread:requests.filter(r=>r.method==='GET'&&r.path==='/api/team/unread').length,conversation:requests.filter(r=>r.method==='GET'&&r.path.endsWith('/conversation')).length,writes:requests.filter(r=>r.method!=='GET').length});
 async function visible(){await page.waitForFunction(()=>!document.hidden,null,{polling:100});}
 async function hide(){const tab=await context.newPage();await tab.goto('about:blank');await tab.bringToFront();await page.waitForFunction(()=>document.hidden,null,{polling:100});return tab;}
 async function show(tab){await tab.close();await page.bringToFront();await visible();}
 try{
  while(Math.floor(Date.now()/30000)<=f.lastStep)await new Promise(r=>setTimeout(r,200));
  await call(owner,'POST','/api/admin/auth/login',{email:f.ownerEmail,password:f.password});await call(owner,'POST','/api/admin/auth/verify',{code:otp(f.ownerSecret)});
  await page.goto(base+'/team');await page.getByLabel('Email',{exact:true}).fill(f.teamEmail);await page.getByLabel('Password',{exact:true}).fill(f.password);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Authenticator code',{exact:true}).fill(otp(f.teamSecret));await page.getByRole('button',{name:'Open workspace',exact:true}).click();await page.locator('#team-message').waitFor();
  const session=await call(page.request,'GET','/api/team/auth/session');const memberId=session.member.id;
  const group=await call(owner,'POST','/api/team/groups',{name:'Synthetic polling group',description:'Local acceptance only',members:[memberId]});
  const channel=await call(owner,'POST','/api/team/channels',{name:'synthetic-polling',description:'Local foreground acceptance',category:'QA',audience:'TEAM',groupId:group.id});
  const post=body=>call(owner,'POST','/api/team/channels/'+channel.id+'/messages',{body,submissionKey:crypto.randomUUID()});
  await post('Initial private polling message');await page.getByRole('button',{name:'Refresh channels',exact:true}).click();await page.getByRole('navigation',{name:'Team channels'}).getByRole('button').filter({hasText:'synthetic-polling'}).click();await page.getByText('Initial private polling message',{exact:true}).waitFor();
  check('New group channel and history appear only after real membership is granted',true);
  await page.waitForTimeout(1000);const before=counts();await page.waitForTimeout(15500);const after=counts();
  report.foreground={unread:after.unread-before.unread,conversation:after.conversation-before.conversation,windowMs:15500};
  check('Foreground unread and conversation polling remain bounded to the seven-second cadence',Object.values(report.foreground).slice(0,2).every(n=>n>=2&&n<=3));
  const hiddenTab=await hide();await page.waitForTimeout(1200);const hiddenBefore=counts();await post('Arrived while genuinely hidden');await page.waitForTimeout(15500);
  check('Native hidden tab starts no unread or conversation requests across two polling intervals',JSON.stringify(counts())===JSON.stringify(hiddenBefore));
  await show(hiddenTab);await page.getByText('Arrived while genuinely hidden',{exact:true}).waitFor();check('Foreground return deliberately fetches the newly permitted conversation',counts().conversation>hiddenBefore.conversation);
  const unread=await call(page.request,'GET','/api/team/unread');check('Opening history preserves a non-zero unread position',unread.find(r=>r.channelId===channel.id)?.count>0);
  await page.getByRole('button',{name:'Mark channel read',exact:true}).click();await page.waitForTimeout(500);const read=await call(page.request,'GET','/api/team/unread');check('Explicit read acknowledgement persists through the newest loaded message',read.find(r=>r.channelId===channel.id)?.count===0&&read.find(r=>r.channelId===channel.id)?.lastReadId>0);
  await page.locator('#team-message').fill('Unconfirmed offline draft must not replay');await context.setOffline(true);await page.getByRole('button',{name:'Send message',exact:true}).click();await page.waitForTimeout(1000);await context.setOffline(false);const writesAfterOffline=counts().writes;await post('Arrived across the reconnect');await page.getByText('Arrived across the reconnect',{exact:true}).waitFor();
  check('Real transport recovery restores reads without replaying a failed write',counts().writes===writesAfterOffline);
  const history=await call(owner,'GET','/api/team/channels/'+channel.id+'/conversation');check('Unconfirmed offline text is absent from actual stored history',!JSON.stringify(history).includes('Unconfirmed offline draft must not replay'));
  const revocationTab=await hide();const detail=await call(owner,'GET','/api/team/groups/'+group.id);await call(owner,'PATCH','/api/team/groups/'+group.id,{name:detail.name,description:detail.description,expectedVersion:detail.version,archived:false,members:[]});
  await show(revocationTab);await page.getByText('Initial private polling message',{exact:true}).waitFor({state:'detached'});check('Group revocation removes already displayed forbidden history on foreground recovery',await page.getByText('Arrived while genuinely hidden',{exact:true}).count()===0);
  await call(page.request,'GET','/api/team/channels/'+channel.id+'/conversation',undefined,404);check('Revoked session cannot request forbidden history directly',true);
  await page.reload();await page.locator('#team-message').waitFor();check('Reload does not recover revoked channel drafts or replay pending writes',await page.getByRole('navigation',{name:'Team channels'}).getByRole('button').filter({hasText:'synthetic-polling'}).count()===0&&await page.locator('#team-message').inputValue()==='');
  const currentGroup=await call(owner,'GET','/api/team/groups/'+group.id);await call(owner,'PATCH','/api/team/groups/'+group.id,{name:currentGroup.name,description:currentGroup.description,expectedVersion:currentGroup.version,archived:false,members:[memberId]});
  await page.getByRole('button',{name:'Refresh channels',exact:true}).click();await page.getByRole('navigation',{name:'Team channels'}).getByRole('button').filter({hasText:'synthetic-polling'}).click();await page.getByText('Initial private polling message',{exact:true}).waitFor();check('Deliberate membership restoration recovers currently permitted server history',true);
  const audienceTab=await hide();await call(owner,'PATCH','/api/team/channels/'+channel.id,{name:channel.name,description:channel.description,category:channel.category,audience:'ADMIN',expectedVersion:channel.version,archived:false,groupId:group.id});await show(audienceTab);await page.getByText('Initial private polling message',{exact:true}).waitFor({state:'detached'});await call(page.request,'GET','/api/team/channels/'+channel.id+'/conversation',undefined,404);check('A changed channel audience revokes both visible and directly requested history',true);
  await call(page.request,'POST','/api/team/auth/logout');await page.getByLabel('Email',{exact:true}).waitFor();check('Foreground polling notices session invalidation and clears the private composer',await page.locator('#team-message').count()===0);
  check('No uncaught runtime errors during the actual polling batch',report.errors.length===0);report.passed=true;
 }catch(error){report.failure=scrub(error.message);console.error(report.failure);await page.screenshot({path:path.join(output,'polling-failure.png')}).catch(()=>{});process.exitCode=1;}
 finally{await context.setOffline(false).catch(()=>{});await owner.dispose();await owned.close();await fs.writeFile(path.join(output,'polling-browser-report.json'),JSON.stringify(report,null,2));}
 console.log('REAL_POLLING_BROWSER_'+(report.passed?'PASS':'FAIL')+': '+report.checks.length+' checks');
})().catch(()=>{console.error('Local polling fixture could not initialise; no credentials logged.');process.exitCode=1;});
