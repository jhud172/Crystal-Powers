const inspectPrivateDesign = require('./lib/private-design-audit.cjs').createPrivateDesignAudit('role-profiles');
/* Synthetic role-editor responses only; real grants/revocation are integration-tested separately. */
const { chromium } = require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084'; assert.equal(base, 'http://127.0.0.1:8084');
const output = path.resolve('.codex-runtime/qa/roles-pc');
const report = { checks: [], errors: [], runtime: 'Packaged Edge UI; explicitly synthetic team/management/profile/conflict responses; no real account mutation' };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
(async () => {
 await fs.mkdir(output, { recursive: true });
 const browser = await chromium.launch({ headless: true, executablePath: process.env.CRYSTAL_BROWSER_EXECUTABLE });
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
 page.on('pageerror', error => report.errors.push(error.message));
 const ids = Array.from({ length: 7 }, (_, i) => `10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
 const grants = ['READ_CHANNELS','SEND_MESSAGES','UPLOAD_FILES','MANAGE_MEMBERS','MANAGE_ROLES'];
 const bases = { MEMBER:['READ_CHANNELS','SEND_MESSAGES','UPLOAD_FILES'], SUPPORT:['READ_CHANNELS','SEND_MESSAGES','UPLOAD_FILES','READ_SUPPORT','REPLY_SUPPORT','UPDATE_TRACKING'], MODERATOR:['READ_CHANNELS','SEND_MESSAGES','UPLOAD_FILES','REVIEW_UPLOADS','EDIT_UPLOADS','MANAGE_MESSAGES'] };
 bases.ADMIN = [...new Set([...grants,...bases.SUPPORT,...bases.MODERATOR,'MANAGE_CHANNELS','MANAGE_GROUPS','EDIT_PROJECTS','PUBLISH_PROJECTS','MANAGE_SETTINGS','MANAGE_BILLING','MANAGE_CLIENTS'])];
 const members = [{ id:ids[0],displayName:'Synthetic manager',email:'manager@example.invalid',role:'ADMIN',state:'ACTIVE',credentialsVersion:2 },{ id:ids[1],displayName:'Protected administrator',email:'high@example.invalid',role:'ADMIN',state:'ACTIVE',credentialsVersion:2 },{ id:ids[2],displayName:'Scoped member',email:'peer@example.invalid',role:'MEMBER',state:'ACTIVE',credentialsVersion:1 }];
 let profiles = [{ id:ids[3],name:'Manager profile',baseRole:'ADMIN',permissions:grants,archived:false,version:2 },{ id:ids[4],name:'Protected full profile',baseRole:'ADMIN',permissions:bases.ADMIN,archived:false,version:3 },{ id:ids[5],name:'Scoped member profile',baseRole:'MEMBER',permissions:bases.MEMBER,archived:false,version:4 }];
 let creations = 0, lastCreate, lastUpdate;
 await page.route('**/api/**', async route => {
  const endpoint = new URL(route.request().url()).pathname, method = route.request().method();
  const reply = (body,status=200) => route.fulfill({ status,contentType:'application/json',body:JSON.stringify(body) });
  if(endpoint==='/api/team/auth/session')return reply({authenticated:true,member:{displayName:members[0].displayName,role:'ADMIN'},permissions:grants});
  if(endpoint==='/api/team/workspace')return reply({displayName:members[0].displayName,memberId:ids[0],ownerId:null,permissions:grants,channels:[],settings:{branding:{name:'Synthetic role workspace',tagline:'',version:0},preferences:{compact:false,unreadBadges:false,mentionAlerts:false,version:0},displayName:members[0].displayName,editableName:true,channelPreferences:[]}});
  if(endpoint==='/api/team/unread')return reply([]);
  if(endpoint==='/api/team/mentions')return reply({mentions:[],nextCursor:null});
  if(endpoint==='/api/admin/auth/csrf')return reply({token:'synthetic-csrf',headerName:'X-CSRF-TOKEN'});
  if(endpoint==='/api/team/members/management')return reply({actorScope:'TEAM:'+ids[0],members:members.map(member=>({member,manageable:member.id===ids[2]})),creatableRoles:['MEMBER']});
  if(endpoint==='/api/team/roles'&&method==='GET')return reply({profiles,assignments:members.map((member,i)=>({memberId:member.id,profileId:i===0?ids[3]:i===1?ids[4]:null,credentialsVersion:member.credentialsVersion})),bases,managementGrants:grants,manageableMembers:[ids[2]],editableProfiles:[ids[5],ids[6]]});
  if(endpoint==='/api/team/roles'&&method==='POST'){
   creations++;lastCreate=route.request().postDataJSON();
   if(creations===1)return reply({message:'Synthetic role name conflict. Choose a different name.'},409);
   const result={id:ids[6],...lastCreate,archived:false,version:0};profiles.push(result);return reply(result);
  }
  if(endpoint==='/api/team/roles/'+ids[5]&&method==='PATCH'){lastUpdate=route.request().postDataJSON();return reply({message:'Synthetic stale profile. Reload before trying again.'},409);}
  report.errors.push('Unexpected role fixture endpoint: '+endpoint);return reply({message:'Unexpected fixture call'},400);
 });
 try {
  await page.goto(base+'/team');await page.getByRole('button',{name:'Team members',exact:true}).click();
  const manage = page.getByRole('button',{name:'Manage custom role profiles',exact:true});await manage.click();
  await page.getByRole('heading',{name:'Custom role profiles',exact:true}).waitFor();
  check('Own and higher profiles cannot be edited',await page.getByRole('button',{name:'Edit Manager profile',exact:true}).isDisabled()&&await page.getByRole('button',{name:'Edit Protected full profile',exact:true}).isDisabled());
  const assignment = name => page.locator('li').filter({has:page.locator('strong').filter({hasText:new RegExp('^'+name+'$')})}).locator('select');
  check('Own and higher account assignments are disabled',await assignment('Synthetic manager').isDisabled()&&await assignment('Protected administrator').isDisabled());
  check('Manageable peer assignment is available',await assignment('Scoped member').isEnabled());
  const name = page.getByLabel('Profile name',{exact:true}), role = page.getByLabel('Base role',{exact:true}), save = page.getByRole('button',{name:'Save profile',exact:true});
  await name.fill('Synthetic uploader');await page.getByRole('checkbox',{name:'upload files',exact:true}).check();
  check('Upload-only choice explains its missing dependency and blocks save',await page.getByText('Allow message sending or clear file uploads before saving this profile.',{exact:true}).isVisible()&&await save.isDisabled());
  await page.getByRole('checkbox',{name:'send messages',exact:true}).check();check('Explicit message permission enables the chosen uploader profile',await save.isEnabled());
  await save.click();await page.getByText('Synthetic role name conflict. Choose a different name.',{exact:true}).waitFor();
  check('Create conflict retains name and chosen grants',await name.inputValue()==='Synthetic uploader'&&await page.getByRole('checkbox',{name:'upload files',exact:true}).isChecked());
  await name.fill('Synthetic uploader corrected');await save.click();await page.getByText('Saved. Affected sessions have been revoked; members must sign in again.',{exact:true}).waitFor();
  check('Successful fixture save clears the creation draft',await name.inputValue()===''&&await save.isDisabled());
  check('Creation sends only the chosen base/grants',creations===2&&lastCreate.baseRole==='MEMBER'&&lastCreate.permissions.slice().sort().join(',')===bases.MEMBER.slice().sort().join(','));
  await role.selectOption('ADMIN');check('Unowned billing permission remains disabled',await page.getByRole('checkbox',{name:'manage billing',exact:true}).isDisabled());
  check('Required channel reading cannot be removed',await page.getByRole('checkbox',{name:'read channels',exact:true}).isChecked()&&await page.getByRole('checkbox',{name:'read channels',exact:true}).isDisabled());
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Edit Scoped member profile',exact:true}).click();
  check('Editing keeps the base role immutable',await role.isDisabled());await name.fill('Scoped member refined');await save.click();
  await page.getByText('Synthetic stale profile. Reload before trying again.',{exact:true}).waitFor();
  check('Stale save keeps edits and original version',await name.inputValue()==='Scoped member refined'&&lastUpdate.expectedVersion===4&&lastUpdate.archived===false);
  check('Dirty role edits block member reassignment and refresh',await assignment('Scoped member').isDisabled()&&await page.getByRole('button',{name:'Reload roles and members',exact:true}).isDisabled());
  for(const theme of ['Dark','Light','Warm dark','Fresh light','Warm light']){
   await page.getByRole('button',{name:'Choose appearance',exact:true}).click();await page.getByRole('button',{name:theme,exact:true}).click();
   for(const width of [320,390,768,1024,1440,1920]){await page.setViewportSize({width,height:900});check(theme+' '+width+' role editor has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  }
  for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.screenshot({path:path.join(output,'role-editor-'+width+'.png'),fullPage:true});}
  await inspectPrivateDesign(page,'Role profile editor with retained draft');
  page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'New profile',exact:true}).click();check('Cancelling discard keeps role edits',await name.inputValue()==='Scoped member refined');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'New profile',exact:true}).click();check('Confirmed discard clears the role draft',await name.inputValue()==='');
  await page.getByRole('button',{name:'Back to members',exact:true}).click();check('Back returns keyboard focus to role management entry',await manage.evaluate(element=>element===document.activeElement));
  check('No page errors or unexpected API calls',report.errors.length===0);
 }catch(error){report.failure=error.stack;throw error;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log('ROLE_PROFILES_BROWSER_PASS: '+report.checks.length+' checks');
})().catch(error=>{console.error(error);process.exitCode=1;});
