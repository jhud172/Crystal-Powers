const inspectPrivateDesign = require('./lib/private-design-audit.cjs').createPrivateDesignAudit('staff-billing');
/* Packaged staff billing UI. All business/payment/provider transports here are synthetic; no actual charge, refund or email. */
const { chromium }=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';assert.equal(base,'http://127.0.0.1:8084');
const output=path.resolve('.codex-runtime/qa/billing-workflow-pc'),report={checks:[],errors:[],runtime:'Packaged Edge; explicit synthetic staff/request/draft/refund/invoice/record fixtures'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',error=>report.errors.push(error.message));
 const id=n=>`50000000-0000-4000-8000-${String(n).padStart(12,'0')}`,request=id(1),staff=id(2),bill=id(3),now='2026-10-19T10:00:00Z';
 const permissions=['READ_CHANNELS','READ_SUPPORT','MANAGE_BILLING'];
 const summary={id:request,clientName:'Synthetic billing client',clientEmail:'billing@example.invalid',intent:'website',subject:'Synthetic billing request',state:'IN_PROGRESS',progress:40,nextStep:'Review agreed scope',assignedMemberId:null,notificationState:'SENT',version:3,createdAt:now,updatedAt:now};
 let drafts=[{id:bill,purpose:'MONTHLY',title:'Synthetic monthly support',amountPence:2500,currency:'GBP',terms:'Synthetic monthly terms',state:'ISSUED',createdAt:now,issued:true,subscriptionState:'active',withdrawalPending:false,withdrawn:false}];
 let draftPosts=[],proposalPosts=[],issueCalls=0,confirmCalls=0,reconcileCalls=0,invoiceCalls=[],proposals=[];
 let job={invoiceId:'in_Synthetic',state:'ERROR',leaseUntil:null,version:4,failures:10,retryAfter:now,needsReview:true};
 const root='/api/team/support/requests/'+request,billing=root+'/billing',refunds=billing+'/'+bill+'/refunds';
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),endpoint=url.pathname,method=req.method(),body=()=>req.postDataJSON();
  const reply=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(endpoint==='/api/team/auth/session')return reply({authenticated:true,member:{displayName:'Synthetic billing admin',role:'ADMIN'},permissions});
  if(endpoint==='/api/team/workspace')return reply({displayName:'Synthetic billing admin',memberId:staff,ownerId:null,permissions,channels:[],settings:{branding:{name:'Synthetic billing workspace',tagline:'',version:0},preferences:{compact:false,unreadBadges:false,mentionAlerts:false,version:0},displayName:'Synthetic billing admin',editableName:true,channelPreferences:[]}});
  if(endpoint==='/api/team/billing/events')return reply({events:[],nextCursor:null,serverTime:1,totals:{pending:0,due:0,waiting:0,review:0}});
  if(endpoint==='/api/team/unread')return reply([]);if(endpoint==='/api/team/mentions')return reply({mentions:[],nextCursor:null});
  if(endpoint==='/api/admin/auth/csrf')return reply({token:'synthetic-csrf',headerName:'X-CSRF-TOKEN'});
  if(endpoint==='/api/team/support/requests/page')return reply({items:[summary],nextCursor:null});
  if(endpoint==='/api/team/support/assignees')return reply([]);
  if(endpoint===root+'/overview')return reply({request:summary,brief:{message:'Synthetic private billing brief'},attachments:[],emailAvailable:false,contactPreference:'PORTAL_ONLY',actorScope:'TEAM:'+staff,permissions});
  if(endpoint===root+'/updates')return reply({items:[],nextCursor:null});
  if(endpoint===billing+'/page')return reply({items:drafts,nextCursor:null,total:drafts.length,unissued:drafts.filter(row=>!row.issued).length});
  if(endpoint===billing+'/settings')return reply({paymentsEnabled:true,managementEnabled:true,liveMode:false});
  if(endpoint===billing&&method==='POST'){
   draftPosts.push(body());if(draftPosts.length===1)return reply({message:'Synthetic draft save could not be confirmed. Retry the unchanged intent.'},503);
   const saved={...body(),id:id(4),currency:'GBP',state:'DRAFT',createdAt:now,issued:false,subscriptionState:'NOT_STARTED',withdrawalPending:false,withdrawn:false};drafts.push(saved);return reply(saved);
  }
  if(endpoint===billing+'/'+id(4)+'/issue'){
   issueCalls++;drafts.find(row=>row.id===id(4)).issued=true;drafts.find(row=>row.id===id(4)).state='ISSUED';return reply(drafts.find(row=>row.id===id(4)));
  }
  if(endpoint===refunds+'/settings')return reply({submissionEnabled:true,managementEnabled:true});
  if(endpoint===refunds&&method==='GET')return reply({items:proposals,nextCursor:null});
  if(endpoint===refunds&&method==='POST'){
   proposalPosts.push(body());if(proposalPosts.length===1)return reply({message:'Synthetic proposal save could not be confirmed.'},503);
   const saved={...body(),id:id(5),chargeId:'ch_Synthetic',state:'DRAFT',capturedPence:2500,refundedPence:0,linkedBills:2,version:1,providerId:null,providerState:null,candidateProviderId:null,ledgerReconciled:false,createdAt:now};proposals=[saved];return reply(saved);
  }
  if(endpoint===refunds+'/'+id(5)+'/confirm'){
   confirmCalls++;const input=body();check('Refund confirmation binds version and all explicit acknowledgements',input.expectedVersion===1&&input.confirmed&&input.sharedAccepted&&input.fraudAccepted);
   Object.assign(proposals[0],{state:'RECONCILE_REQUIRED',version:2,candidateProviderId:'re_Synthetic'});return reply({message:'Synthetic refund outcome is uncertain. Refresh and verify the existing operation.'},503);
  }
  if(endpoint===refunds+'/'+id(5)+'/reconcile'){
   reconcileCalls++;const input=body();check('Recovery binds the existing candidate and current revision',input.providerId==='re_Synthetic'&&input.expectedVersion===proposals[0].version);
   Object.assign(proposals[0],{state:'SUCCEEDED',version:proposals[0].version+1,providerId:'re_Synthetic',providerState:'succeeded',ledgerReconciled:reconcileCalls>1});return reply(proposals[0]);
  }
  if(endpoint===billing+'/'+bill+'/invoices')return reply({items:url.searchParams.get('kind')==='ALLOCATIONS'?[{id:'inpay_Synthetic',invoiceId:'in_Synthetic',kind:'charge',reference:'ch_Synthetic',state:'paid',requestedPence:2500,paidPence:2500,updatedAt:now}]:[job],nextCursor:null});
  if(endpoint.startsWith(billing+'/'+bill+'/invoices/in_Synthetic/')){
   const action=endpoint.split('/').at(-1),input=body();invoiceCalls.push({action,...input});check('Invoice action sends its displayed version',input.expectedVersion===job.version);
   if(invoiceCalls.length===1)return reply({message:'Synthetic import version conflict. Refresh before continuing.'},409);
   Object.assign(job,{state:action==='restart'?'PENDING':'DONE',version:job.version+1,failures:0,needsReview:false});return reply(job);
  }
  if(endpoint===billing+'/'+bill+'/records')return reply({items:url.searchParams.get('kind')==='ADJUSTMENTS'?[{id:'re_Synthetic',kind:'REFUND',state:'succeeded',amountPence:1000,updatedAt:now}]:[{id:'ch_Synthetic',kind:'CHARGE',state:'succeeded',amountPence:2500,receivedPence:2500,capturedPence:2500,refundedPence:1000,disputed:false,updatedAt:now}],nextCursor:null,liveMode:false});
  report.errors.push('Unexpected billing fixture '+method+' '+endpoint);return reply({message:'Unexpected synthetic fixture'},400);
 });
 const ready=async name=>{await page.waitForFunction(text=>[...document.querySelectorAll('button')].some(button=>button.textContent.trim()===text&&!button.matches(':disabled')),name);return page.getByRole('button',{name,exact:true});};
 try{
  await page.goto(base+'/team');await page.getByRole('button',{name:'Client requests',exact:true}).click();await page.getByRole('button',{name:/Synthetic billing client.*Synthetic billing request/}).click();
  const panel=page.locator('.support-billing');await panel.getByRole('heading',{name:'Payments and monthly support',exact:true}).waitFor();await ready('Refresh payment drafts');
  await inspectPrivateDesign(page,'Staff payment drafts and records');
  const title=panel.getByLabel('Description',{exact:true}),amount=panel.getByLabel('Amount (GBP)',{exact:true}),terms=panel.getByLabel('Agreed scope and payment terms',{exact:true}),save=panel.getByRole('button',{name:'Save internal draft',exact:true});
  await title.fill('Synthetic agreed deposit');await amount.fill('12.345');await terms.fill('Synthetic agreed delivery terms');await save.click();await page.getByText('Enter a GBP amount with no more than two decimal places.',{exact:true}).waitFor();check('Invalid decimal never sends a draft',draftPosts.length===0);
  await amount.fill('12.34');await save.click();await page.getByText('Synthetic draft save could not be confirmed. Retry the unchanged intent.',{exact:true}).waitFor();check('Unconfirmed save retains exact draft fields',await title.inputValue()==='Synthetic agreed deposit'&&await amount.inputValue()==='12.34');
  await save.click();await page.getByText('Synthetic agreed deposit',{exact:true}).waitFor();await ready('Refresh payment drafts');check('Retry preserves one key and exact integer pence',draftPosts.length===2&&draftPosts[0].submissionKey===draftPosts[1].submissionKey&&draftPosts[1].amountPence===1234);check('Confirmed save clears the input draft',await title.inputValue()==='');
  const draftRow=page.locator('.support-billing-list > li').filter({has:page.getByText('Synthetic agreed deposit',{exact:true})});
  page.once('dialog',dialog=>dialog.dismiss());await draftRow.getByRole('button',{name:'Review and issue payment request',exact:true}).click();check('Issuing requires explicit review confirmation',issueCalls===0);
  page.once('dialog',dialog=>dialog.accept());await draftRow.getByRole('button',{name:'Review and issue payment request',exact:true}).click();await page.getByText('Payment request issued to the client portal. No email or charge was sent.',{exact:true}).waitFor();await ready('Refresh payment drafts');check('Issue refresh cannot leave billing or request navigation locked',issueCalls===1&&await page.getByRole('button',{name:/Synthetic billing client.*Synthetic billing request/}).isEnabled());
  const monthly=page.locator('.support-billing-list > li').filter({has:page.getByText('Synthetic monthly support',{exact:true})});await monthly.getByText('Refund proposals',{exact:true}).click();
  const refundPanel=monthly.locator('.support-refunds');await refundPanel.getByLabel('Verified payment reference',{exact:true}).fill('pi_Synthetic');await refundPanel.getByLabel('Refund amount (GBP)',{exact:true}).fill('10.00');await refundPanel.getByRole('combobox',{name:'Reason',exact:true}).selectOption('fraudulent');await refundPanel.getByLabel('Internal review note',{exact:true}).fill('Synthetic shared fraudulent-payment review');
  const propose=refundPanel.getByRole('button',{name:'Save unsent proposal',exact:true});await propose.click();await page.getByText('Synthetic proposal save could not be confirmed.',{exact:true}).waitFor();await propose.click();await refundPanel.getByRole('button',{name:'Review and submit refund',exact:true}).waitFor();
  check('Saving a proposal preserves retry identity and never submits a refund',proposalPosts.length===2&&proposalPosts[0].submissionKey===proposalPosts[1].submissionKey&&proposalPosts[1].amountPence===1000&&confirmCalls===0);
  await refundPanel.getByRole('button',{name:'Review and submit refund',exact:true}).click();const modal=page.getByRole('dialog');const submit=modal.getByRole('button',{name:'Confirm and submit refund',exact:true});check('Refund dialog starts with submission disabled',await submit.isDisabled());
  await inspectPrivateDesign(page,'Refund confirmation before consent');
  const acknowledgements=modal.getByRole('checkbox');await acknowledgements.nth(0).check();check('Shared and fraud acknowledgements cannot be skipped',await submit.isDisabled());await acknowledgements.nth(1).check();check('Fraud acknowledgement is independently required',await submit.isDisabled());await acknowledgements.nth(2).check();await submit.click();await modal.getByText('The result was not fully confirmed. Close this review and refresh the proposal before continuing. Do not create a replacement refund.',{exact:true}).waitFor();check('Uncertain refund cannot be submitted again from the review',confirmCalls===1&&await submit.isDisabled());
  await inspectPrivateDesign(page,'Uncertain refund review');
  await modal.getByRole('button',{name:'Keep proposal',exact:true}).click();await refundPanel.getByRole('button',{name:'Refresh proposals',exact:true}).click();await refundPanel.getByLabel('Existing Stripe refund reference',{exact:true}).waitFor();check('Refresh exposes the retained candidate without another submission',(await refundPanel.getByLabel('Existing Stripe refund reference',{exact:true}).inputValue())==='re_Synthetic'&&confirmCalls===1);
  await refundPanel.getByRole('button',{name:'Verify existing refund',exact:true}).click();await refundPanel.getByText('Stripe outcome recorded. The financial records still need reconciliation; do not issue a replacement refund.',{exact:true}).waitFor();check('Provider success remains distinct from ledger completion',reconcileCalls===1&&confirmCalls===1);
  await refundPanel.getByRole('button',{name:'Verify existing refund',exact:true}).click();await page.waitForFunction(()=>!document.body.textContent.includes('Stripe outcome recorded. The financial records still need reconciliation; do not issue a replacement refund.'));check('Read-only recovery can complete ledger state without resubmission',reconcileCalls===2&&confirmCalls===1&&await refundPanel.getByRole('button',{name:'Review and submit refund',exact:true}).count()===0);
  await monthly.getByText('Invoice payment allocations',{exact:true}).click();const invoicePanel=monthly.locator('details').filter({has:page.getByRole('heading',{name:'Invoice reconciliation',exact:true})});await invoicePanel.getByText(/automatic recovery paused for admin review/).waitFor();await invoicePanel.getByRole('button',{name:'Continue bounded import',exact:true}).click();await page.getByText('Synthetic import version conflict. Refresh before continuing.',{exact:true}).waitFor();check('Invoice conflict releases controls and keeps the displayed revision',job.version===4&&await invoicePanel.getByRole('button',{name:'Continue bounded import',exact:true}).isEnabled());
  await invoicePanel.getByRole('button',{name:'Continue bounded import',exact:true}).click();await invoicePanel.getByText('in_Synthetic · DONE',{exact:true}).waitFor();check('Completed import disables continuation',await invoicePanel.getByRole('button',{name:'Continue bounded import',exact:true}).isDisabled());
  page.once('dialog',dialog=>dialog.dismiss());await invoicePanel.getByRole('button',{name:'Restart reconciliation',exact:true}).click();check('Restart needs explicit confirmation',invoiceCalls.length===2);page.once('dialog',dialog=>dialog.accept());await invoicePanel.getByRole('button',{name:'Restart reconciliation',exact:true}).click();await invoicePanel.getByText('in_Synthetic · PENDING',{exact:true}).waitFor();check('Explicit restart requests reconciliation without changing money',invoiceCalls.length===3&&confirmCalls===1);
  await invoicePanel.getByRole('combobox',{name:'View',exact:true}).selectOption('ALLOCATIONS');await invoicePanel.getByText('charge · ch_Synthetic',{exact:true}).waitFor();check('Legacy charge allocations are labelled separately from PaymentIntents',await invoicePanel.getByText('Requested £25.00 · applied £25.00',{exact:true}).isVisible());
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});check(width+' billing operations have no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  const stored=await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]));check('Financial intent keys and private notes are not persisted in browser storage',!stored.includes(proposalPosts[0].submissionKey)&&!stored.includes(draftPosts[0].submissionKey)&&!stored.includes('Synthetic shared fraudulent-payment review'));
  await inspectPrivateDesign(page,'Invoice recovery and retained refund');
  check('No page errors or unexpected API requests',report.errors.length===0);
 }catch(error){report.failure=error.stack;await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log('BILLING_WORKFLOW_BROWSER_PASS: '+report.checks.length+' checks');
})().catch(error=>{console.error(error);process.exitCode=1;});
