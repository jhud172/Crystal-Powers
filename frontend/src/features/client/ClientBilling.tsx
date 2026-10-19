import { trustedStripeUrl } from "../../lib/stripeUrl";
import { ClientInvoiceHistory } from "./ClientInvoiceHistory";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";

type Bill = { id: string; purpose: string; title: string; amountPence: number; currency: string; terms: string; paymentState: string; subscriptionState: string; cancelAtPeriodEnd: boolean; periodEnd: number | null; invoiceState: string | null; invoiceUrl: string | null; checkoutState: string; issuedAt: string; withdrawalPending: boolean; withdrawn: boolean };
type State = { paymentsEnabled: boolean; managementEnabled: boolean; liveMode: boolean; accountId: string; workspaceId: string; bills: Bill[]; nextCursor: string | null; total: number };
const money = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence/100);
const subscriptionLabels: Record<string,string> = { NOT_STARTED: "Not started", active: "Active", past_due: "Payment overdue", unpaid: "Unpaid", canceled: "Cancelled", incomplete: "Payment incomplete", incomplete_expired: "Activation expired", paused: "Paused", trialing: "Trial" };
type Props = { accountId: string; workspaceId: string; disabled: boolean; onBusy: (value: boolean) => void; onExpired: () => void };
export function ClientBilling({ accountId, workspaceId, disabled, onBusy, onExpired }: Props) {
  return <ClientBillingScope key={`${workspaceId}:${accountId}`} accountId={accountId} workspaceId={workspaceId} disabled={disabled} onBusy={onBusy} onExpired={onExpired}/>;
}

function ClientBillingScope({ accountId, workspaceId, disabled, onBusy, onExpired }: Props) {
  const [state, setState] = useState<State | null>(null), [consent, setConsent] = useState<Record<string,boolean>>({}), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [invoiceRevisions,setInvoiceRevisions]=useState<Record<string,number>>({});
  const live = useRef(true), pending = useRef(false);
  const [cursor,setCursor]=useState<string | null>(null), [history,setHistory]=useState<(string | null)[]>([]);
  const generation=useRef(0), read=useRef<AbortController | null>(null), heading=useRef<HTMLHeadingElement>(null);
  const section=useRef<HTMLElement>(null);
  const callbacks=useRef({onBusy,onExpired});callbacks.current={onBusy,onExpired};
  function fail(value: unknown) { if(live.current) { setError((value as Error).message); if(value instanceof ApiError && value.status===401) { setNotice("Your session ended. Return to sign-in before making a payment."); callbacks.current.onExpired(); } } }
  async function load(before:string | null=cursor,movement:"refresh"|"older"|"newer"|"first"="refresh") {
    read.current?.abort();const abort=new AbortController();read.current=abort;const current=++generation.current;
    setLoading(true);setError("");setConsent({});
    try {
      const result=await api<State>(`/api/client/billing/page${before ? `?after=${encodeURIComponent(before)}` : ""}`,{signal:abort.signal});
      if(!live.current || abort.signal.aborted || current!==generation.current)return;
      if(result.accountId!==accountId || result.workspaceId!==workspaceId)throw new ApiError(401,"Your account changed. Return to sign-in before accessing payments.");
      setState(result);setCursor(before);
      if(movement==="older")setHistory(values=>[...values,cursor].slice(-100));
      if(movement==="newer")setHistory(values=>values.slice(0,-1));
      if(movement==="first")setHistory([]);
      if(movement!=="refresh")heading.current?.focus();
    } catch(failure) { if(!abort.signal.aborted && current===generation.current){setState(null);fail(failure);} }
    finally {if(live.current && current===generation.current)setLoading(false);}
  }
  useEffect(() => { live.current=true;setState(null);setCursor(null);setHistory([]);void load(null,"first"); if(new URLSearchParams(window.location.search).has("checkout")) setNotice("Checkout has returned. Payment status is confirmed separately by Stripe; refresh the relevant request below."); if(window.location.pathname.replace(/\/+$/,"")==="/client/billing") { section.current?.focus();section.current?.scrollIntoView({block:"start",behavior:"instant"}); } return () => { live.current=false;generation.current++;read.current?.abort();callbacks.current.onBusy(false); }; },[]);
  async function perform(action:(isCurrent:()=>boolean)=>Promise<void>) {
    if(pending.current || disabled || loading)return;
    const current=++generation.current,isCurrent=()=>live.current && current===generation.current;
    pending.current=true;setBusy(true);callbacks.current.onBusy(true);setError("");setNotice("");
    try{await action(isCurrent);}catch(failure){if(isCurrent())fail(failure);}
    finally{pending.current=false;if(isCurrent()){setBusy(false);callbacks.current.onBusy(false);}}
  }
  async function refresh(id:string) { await perform(async isCurrent=>{ const result=await api<Bill>(`/api/client/billing/${id}/refresh`,{method:"POST"}); if(isCurrent()) { if(result.id!==id){setState(null);throw new ApiError(409,"The payment response changed. Refresh your payment requests before continuing.");} setState(value=>value ? {...value,bills:value.bills.map(b=>b.id===id ? result : b)} : value); setInvoiceRevisions(values=>({...values,[id]:(values[id] || 0)+1}));setNotice("Status refreshed from Stripe. Project progress is managed separately by the team."); } }); }
  async function open(bill:Bill,portal:boolean) { await perform(async isCurrent=>{
    const result=await api<{url:string}>(`/api/client/billing/${bill.id}/${portal ? "portal" : "checkout"}`,{method:"POST",...(!portal ? {body:JSON.stringify({acceptedTerms:!!consent[bill.id]})} : {})});
    if(!isCurrent())return;
    const url=trustedStripeUrl(result.url,portal ? "portal" : "checkout");
    if(!url)throw new Error("The secure payment destination could not be confirmed. Contact the team.");
    window.location.assign(url);
  }); }
  return <section ref={section} tabIndex={-1} className="support-billing client-billing"><h2 ref={heading} tabIndex={-1}>Payments and monthly support</h2><p>Review the agreed scope and amount before continuing to secure Stripe checkout.</p><OwnerError message={error}/>{notice && <p role="status" className="admin-notice">{notice}</p>}<button className="admin-secondary" disabled={disabled || busy || loading} onClick={()=>{setError("");void load();}}>Refresh payment requests</button>{state && <p>{state.total} issued payment requests at last refresh · newest first · up to 50 per page.</p>}<nav className="team-history-nav" aria-label="Payment request pages"><button className="admin-secondary" disabled={disabled || busy || loading || !history.length} onClick={()=>void load(history[history.length-1],"newer")}>Newer requests</button><button className="admin-secondary" disabled={disabled || busy || loading || !state?.nextCursor} onClick={()=>{if(state?.nextCursor)void load(state.nextCursor,"older");}}>Older requests</button><button className="admin-text-button" disabled={disabled || busy || loading || cursor===null} onClick={()=>void load(null,"first")}>Latest requests</button></nav>{loading && <p role="status">Loading billing…</p>}{state && !state.paymentsEnabled && <p>New checkout is currently unavailable. Your saved requests remain here; existing billing can still be managed when Stripe is connected.</p>}{state?.paymentsEnabled && !state.liveMode && <p>Sandbox billing: use approved test payment details. These requests do not collect real money.</p>}{state && !state.bills.length && <p>No payment requests are available on this page.</p>}
    <ul className="support-billing-list">{(!loading ? state?.bills : [])?.map(bill=>{const monthly=bill.purpose==="MONTHLY",started=bill.subscriptionState!=="NOT_STARTED",payable=!bill.withdrawn && !bill.withdrawalPending && bill.paymentState==="ISSUED" && !started && bill.checkoutState!=="RECONCILE_REQUIRED"; const invoiceUrl=trustedStripeUrl(bill.invoiceUrl,"invoice"); return <li key={bill.id}><div><h3>{bill.title}</h3><strong>{money(bill.amountPence)}{monthly ? " per month" : ""}</strong></div>{bill.withdrawn && <p>This unpaid request has been withdrawn. It cannot start a new checkout.</p>}{bill.withdrawalPending && <p>The team is withdrawing this request. New checkout is blocked while its outcome is confirmed.</p>}<p>{monthly ? "Initial payment" : "Payment"}: {bill.paymentState==="PAID" ? "Confirmed paid" : bill.paymentState==="PENDING" ? "Awaiting confirmation" : "Requested"}</p>{monthly && <p>Monthly support: {subscriptionLabels[bill.subscriptionState] || bill.subscriptionState.replace(/_/g," ")}{bill.cancelAtPeriodEnd ? " · Cancellation scheduled at the end of the billing period" : ""}.</p>}{monthly && bill.periodEnd && <p>Current billing period ends {new Date(bill.periodEnd*1000).toLocaleDateString("en-GB")}.</p>}{bill.invoiceState && <p>{monthly ? "Latest invoice" : "Invoice"}: {bill.invoiceState.replace(/_/g," ")}.</p>}<p className="support-billing-terms">{bill.terms}</p>{bill.checkoutState==="RECONCILE_REQUIRED" && <p>The previous checkout needs review by the team before another attempt can start.</p>}
      {payable && <><p>{monthly ? `The first payment is ${money(bill.amountPence)} at checkout, then ${money(bill.amountPence)} each month until cancelled under the agreed terms.` : `This checkout requests ${money(bill.amountPence)} once.`}</p><label className="client-payment-consent"><input type="checkbox" checked={!!consent[bill.id]} disabled={disabled || busy || loading} onChange={event=>setConsent(values=>({...values,[bill.id]:event.target.checked}))}/><span>{monthly ? "I agree to the monthly amount, recurring payments and the support/cancellation terms shown above." : "I agree to this payment amount and the scope/payment terms shown above."}</span></label><button className="admin-primary" disabled={disabled || busy || loading || !state?.paymentsEnabled || !consent[bill.id]} onClick={()=>void open(bill,false)}>{monthly ? "Review monthly support in Stripe" : "Continue to secure payment"}</button></>}
      <button className="admin-secondary" disabled={disabled || busy || loading || !state?.managementEnabled} onClick={()=>void refresh(bill.id)}>Check Stripe status</button>{(started || bill.paymentState==="PAID" || bill.checkoutState==="COMPLETE") && <button className="admin-secondary" disabled={disabled || busy || loading || !state?.managementEnabled} onClick={()=>void open(bill,true)}>Manage billing in Stripe</button>}{invoiceUrl && <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="admin-text-button">Open Stripe invoice</a>}{bill.invoiceUrl && !invoiceUrl && <p>The invoice link could not be confirmed. Contact the team for help.</p>}
      <ClientInvoiceHistory kind="receipts" bill={bill.id} accountId={accountId} workspaceId={workspaceId} revision={invoiceRevisions[bill.id] || 0} disabled={disabled || busy || loading} onFailure={fail}/>
      <ClientInvoiceHistory bill={bill.id} accountId={accountId} workspaceId={workspaceId} revision={invoiceRevisions[bill.id] || 0} disabled={disabled || busy || loading} onFailure={fail}/>
    </li>;})}</ul>
  </section>;
}
