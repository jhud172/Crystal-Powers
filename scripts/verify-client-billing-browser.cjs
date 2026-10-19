const inspectPrivateDesign = require('./lib/private-design-audit.cjs').createPrivateDesignAudit('client-billing');
/* All account/payment responses and provider pages are local synthetic fixtures. No external request or transaction. */
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';assert.equal(base,'http://127.0.0.1:8084');
const output=path.resolve('.codex-runtime/qa/client-billing-pc'),report={checks:[],errors:[],scope:'Packaged Edge; synthetic API fixtures and intercepted provider destinations; no external network'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CRYSTAL_BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',error=>report.errors.push(error.message));
 const id=n=>'60000000-0000-4000-8000-'+String(n).padStart(12,'0'),account=id(1),workspace=id(2),one=id(3),month=id(4),active=id(5),now='2026-10-19T10:00:00Z';
 const make=(key,title,purpose='FULL')=>({id:key,title,purpose,amountPence:purpose==='MONTHLY'?2500:5000,currency:'GBP',terms:'Synthetic agreed scope. Monthly starts at checkout and can be cancelled under these terms.',paymentState:'ISSUED',subscriptionState:'NOT_STARTED',cancelAtPeriodEnd:false,periodEnd:null,invoiceState:null,invoiceUrl:null,checkoutState:'AVAILABLE',issuedAt:now,withdrawalPending:false,withdrawn:false});
 const bills=[make(one,'Synthetic website balance'),make(month,'Synthetic monthly support','MONTHLY'),{...make(active,'Synthetic active support','MONTHLY'),paymentState:'PAID',subscriptionState:'active',cancelAtPeriodEnd:true,periodEnd:2000000000,invoiceState:'paid',invoiceUrl:'https://untrusted.invalid/invoice'},{...make(id(6),'Synthetic withdrawn deposit'),withdrawn:true},{...make(id(7),'Synthetic uncertain checkout'),checkoutState:'RECONCILE_REQUIRED'}];
 let enabled=true,authenticated=true,wrongRefresh=false,expire=false,checkoutUrl='https://checkout.stripe.com/c/pay/synthetic',portalUrl='https://billing.stripe.com/p/session/synthetic',checkoutWrites=[],portalWrites=[],handoffs=[],refreshes=0;
 // Register before API fixtures: every attempted external navigation is fulfilled or aborted before network.
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin===base)return route.continue();
  if(['checkout.stripe.com','billing.stripe.com'].includes(url.hostname)){handoffs.push(url.href);return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Synthetic boundary</title><h1>Synthetic provider handoff</h1><p>No provider request or transaction exists.</p>'});}
  report.errors.push('Unexpected external request: '+url.origin);return route.abort();
 });
 await page.route('**/api/**',async route=>{
  const req=route.request(),endpoint=new URL(req.url()).pathname,method=req.method(),reply=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(endpoint==='/api/client/auth/session')return reply({authenticated,client:{id:account,workspaceId:workspace,displayName:'Synthetic billing client'}});
  if(endpoint==='/api/admin/auth/csrf')return reply({token:'synthetic-csrf',headerName:'X-CSRF-TOKEN'});
  if(endpoint==='/api/client/projects/page')return reply({clientId:account,workspaceId:workspace,projects:[],nextCursor:null,total:0});
  if(endpoint==='/api/client/auth/preferences')return reply({clientId:account,workspaceId:workspace,contactPreference:'PORTAL_ONLY',version:0});
  if(endpoint==='/api/client/billing/page')return reply({accountId:account,workspaceId:workspace,paymentsEnabled:enabled,managementEnabled:true,liveMode:false,bills,nextCursor:null,total:bills.length});
  if(endpoint.match(/\/api\/client\/billing\/[^/]+\/checkout$/)&&method==='POST'){checkoutWrites.push({id:endpoint.split('/').at(-2),...req.postDataJSON()});return reply({url:checkoutUrl});}
  if(endpoint.match(/\/api\/client\/billing\/[^/]+\/portal$/)&&method==='POST'){portalWrites.push(endpoint.split('/').at(-2));return reply({url:portalUrl});}
  if(endpoint.match(/\/api\/client\/billing\/[^/]+\/refresh$/)&&method==='POST'){
   if(expire){authenticated=false;return reply({message:'Synthetic payment session expired.'},401);}
   refreshes++;const key=endpoint.split('/').at(-2),current=bills.find(bill=>bill.id===key);
   if(wrongRefresh)return reply({...current,id:id(98),title:'Foreign synthetic bill must stay hidden'});
   if(key===one)Object.assign(current,{paymentState:refreshes===1?'PENDING':'PAID',checkoutState:'COMPLETE'});return reply(current);
  }
  if(endpoint.endsWith('/receipts'))return reply({accountId:account,workspaceId:workspace,items:[{id:'pi_Valid',chargeId:'ch_Valid',url:'https://pay.stripe.com/receipts/synthetic',updatedAt:now},{id:'pi_Invalid',chargeId:'ch_Invalid',url:'https://pay.stripe.com/wrong-path',updatedAt:now}],nextCursor:null});
  if(endpoint.endsWith('/invoices'))return reply({accountId:account,workspaceId:workspace,items:[{id:'in_Valid',number:'SYNTHETIC-001',created:1760000000,state:'paid',totalPence:2500,paidPence:2500,hostedUrl:'https://invoice.stripe.com/i/synthetic',recordedAt:now},{id:'in_Invalid',number:'SYNTHETIC-002',created:1760000000,state:'open',totalPence:2500,paidPence:0,hostedUrl:'https://untrusted.invalid/invoice',recordedAt:now}],nextCursor:null,total:2});
  report.errors.push('Unexpected client billing fixture '+method+' '+endpoint);return reply({message:'Unexpected synthetic fixture'},400);
 });
 const row=title=>page.locator('.client-billing .support-billing-list > li').filter({has:page.getByRole('heading',{name:title,exact:true})});
 const open=async query=>{await page.goto(base+'/client/billing'+(query||''));await row('Synthetic website balance').waitFor();};
 try{
  await open('?checkout=returned');await page.getByText('Checkout has returned. Payment status is confirmed separately by Stripe; refresh the relevant request below.',{exact:true}).waitFor();
  check('Checkout return does not create payment or assume settlement',checkoutWrites.length===0&&await row('Synthetic website balance').getByText('Payment: Requested',{exact:true}).isVisible());
  check('One-off and monthly consent start unchecked',await row('Synthetic website balance').getByRole('button',{name:'Continue to secure payment',exact:true}).isDisabled()&&await row('Synthetic monthly support').getByRole('button',{name:'Review monthly support in Stripe',exact:true}).isDisabled());
  check('Recurring price and cancellation commitment are explicit',await row('Synthetic monthly support').getByText('The first payment is £25.00 at checkout, then £25.00 each month until cancelled under the agreed terms.',{exact:true}).isVisible());
  await inspectPrivateDesign(page,'Client payment states and consent');
  check('Withdrawn and uncertain requests cannot start another checkout',await row('Synthetic withdrawn deposit').getByRole('button',{name:'Continue to secure payment',exact:true}).count()===0&&await row('Synthetic uncertain checkout').getByRole('button',{name:'Continue to secure payment',exact:true}).count()===0);
  check('Untrusted main invoice URL is not exposed',await row('Synthetic active support').getByRole('link',{name:'Open Stripe invoice',exact:true}).count()===0&&await page.getByText('The invoice link could not be confirmed. Contact the team for help.',{exact:true}).isVisible());
  await row('Synthetic website balance').getByRole('checkbox').check();
  for(const invalid of ['http://checkout.stripe.com/c/pay/fake','https://checkout.stripe.com:444/c/pay/fake','https://untrusted.invalid/pay']){
   checkoutUrl=invalid;await row('Synthetic website balance').getByRole('button',{name:'Continue to secure payment',exact:true}).click();await page.getByText('The secure payment destination could not be confirmed. Contact the team.',{exact:true}).waitFor();
   check('Unsafe checkout destination blocked: '+new URL(invalid).origin,handoffs.length===0&&page.url().startsWith(base));
  }
  checkoutUrl='https://checkout.stripe.com/c/pay/synthetic';await row('Synthetic website balance').getByRole('button',{name:'Continue to secure payment',exact:true}).click();await page.getByRole('heading',{name:'Synthetic provider handoff',exact:true}).waitFor();
  check('Explicit one-off acceptance hands off to the intercepted provider boundary',handoffs.length===1&&checkoutWrites.every(write=>write.acceptedTerms===true)&&checkoutWrites.at(-1).id===one);
  await open('?checkout=cancelled');check('Returning resets both payment authorisations',!await row('Synthetic website balance').getByRole('checkbox').isChecked()&&!await row('Synthetic monthly support').getByRole('checkbox').isChecked());
  await row('Synthetic monthly support').getByRole('checkbox').check();await row('Synthetic monthly support').getByRole('button',{name:'Review monthly support in Stripe',exact:true}).click();await page.getByRole('heading',{name:'Synthetic provider handoff',exact:true}).waitFor();check('Recurring handoff requires its own explicit acceptance',checkoutWrites.at(-1).id===month&&checkoutWrites.at(-1).acceptedTerms===true&&handoffs.length===2);
  await open();enabled=false;await page.getByRole('button',{name:'Refresh payment requests',exact:true}).click();await page.getByText('New checkout is currently unavailable. Your saved requests remain here; existing billing can still be managed when Stripe is connected.',{exact:true}).waitFor();
  await row('Synthetic website balance').getByRole('checkbox').check();check('Disabled new billing preserves existing management',await row('Synthetic website balance').getByRole('button',{name:'Continue to secure payment',exact:true}).isDisabled()&&await row('Synthetic active support').getByRole('button',{name:'Manage billing in Stripe',exact:true}).isEnabled());
  await row('Synthetic active support').getByRole('button',{name:'Manage billing in Stripe',exact:true}).click();await page.getByRole('heading',{name:'Synthetic provider handoff',exact:true}).waitFor();check('Existing management uses the intercepted portal host',handoffs.length===3&&portalWrites.every(key=>key===active));
  enabled=true;await open();const activeRow=row('Synthetic active support');await activeRow.getByText('Payment receipts',{exact:true}).click();await activeRow.getByRole('link',{name:'Open payment receipt in Stripe ↗',exact:true}).waitFor();
  check('Only verified receipt paths produce links',await activeRow.getByRole('link',{name:'Open payment receipt in Stripe ↗',exact:true}).count()===1&&await activeRow.getByText('This receipt link could not be confirmed. Contact the team for help.',{exact:true}).isVisible());
  await activeRow.getByText('Recorded invoices',{exact:true}).click();await activeRow.getByRole('link',{name:'Open invoice in Stripe ↗',exact:true}).waitFor();check('Invoice history retains only trusted document links',await activeRow.getByRole('link',{name:'Open invoice in Stripe ↗',exact:true}).count()===1&&await activeRow.getByText('The hosted invoice link is not available. Contact the team if you need this document.',{exact:true}).isVisible());
  await row('Synthetic website balance').getByRole('button',{name:'Check Stripe status',exact:true}).click();await row('Synthetic website balance').getByText('Payment: Awaiting confirmation',{exact:true}).waitFor();check('Pending status blocks repeat checkout without claiming payment',await row('Synthetic website balance').getByRole('button',{name:'Continue to secure payment',exact:true}).count()===0);
  await row('Synthetic website balance').getByRole('button',{name:'Check Stripe status',exact:true}).click();await row('Synthetic website balance').getByText('Payment: Confirmed paid',{exact:true}).waitFor();check('Only refreshed server state marks the payment paid',refreshes===2&&await row('Synthetic website balance').getByRole('button',{name:'Manage billing in Stripe',exact:true}).isEnabled());
  wrongRefresh=true;await row('Synthetic website balance').getByRole('button',{name:'Check Stripe status',exact:true}).click();await page.getByText('The payment response changed. Refresh your payment requests before continuing.',{exact:true}).waitFor();
  check('Wrong bill response clears private rows without foreign data',await page.locator('.client-billing .support-billing-list > li').count()===0&&await page.getByText('Foreign synthetic bill must stay hidden',{exact:true}).count()===0);wrongRefresh=false;
  await page.getByRole('button',{name:'Refresh payment requests',exact:true}).click();await row('Synthetic active support').waitFor();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});check(width+' client billing has no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  const stored=await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]));check('Consent and private references are not stored in browser storage',!stored.includes('acceptedTerms')&&!stored.includes('pi_Valid')&&!stored.includes('SYNTHETIC-001'));
  expire=true;await row('Synthetic active support').getByRole('button',{name:'Check Stripe status',exact:true}).click();await page.getByRole('button',{name:'Return to sign-in',exact:true}).waitFor();check('Expiry removes all billing controls',await page.locator('.client-billing').count()===0);
  check('No unexpected network or page errors',report.errors.length===0);
 }catch(error){report.failure=error.stack;await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}
 finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log('CLIENT_BILLING_BROWSER_PASS: '+report.checks.length+' checks');
})().catch(error=>{console.error(error);process.exitCode=1;});
