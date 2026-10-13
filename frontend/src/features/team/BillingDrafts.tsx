import { hasTeamDrafts, type TeamDraftMemory, type RefundFormDraft } from "./teamDraftMemory";
import { RefundProposals } from "./RefundProposals";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";
import { InvoiceAllocations } from "./InvoiceAllocations";
import { BillingRecords } from "./BillingRecords";
import { BillingHistory } from "./BillingHistory";
import { BillingEventQueue } from "./BillingEventQueue";

type Draft = { id: string; purpose: string; title: string; amountPence: number; currency: string; terms: string; state: string; createdAt: string; issued: boolean; subscriptionState: string; withdrawalPending: boolean; withdrawn: boolean };
type Page = { items: Draft[]; nextCursor: string | null; total: number; unissued: number };
type Props = { actorScope:string;draftMemory:TeamDraftMemory;onDraftPresence:(present:boolean)=>void;requestId: string; canManage: boolean; disabled: boolean; onDirty: (value: boolean) => void; onBusy: (value: boolean) => void; onExpired: () => void };
const purposes = { FULL: "Full payment", DEPOSIT: "Deposit", BALANCE: "Balance", MONTHLY: "Monthly support" };
const formatMoney = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export function BillingDrafts({ actorScope,draftMemory,onDraftPresence,requestId, canManage, disabled, onDirty, onBusy, onExpired }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([]), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [recoveryBills,setRecoveryBills]=useState<Draft[]>([]);
  const [refundDirty,setRefundDirty]=useState<Record<string,boolean>>({});
  const hasRefundDrafts=Object.values(refundDirty).some(Boolean);
  const [recoveryBusy,setRecoveryBusy]=useState(false);
  const [purpose, setPurpose] = useState("FULL"), [title, setTitle] = useState(""), [amount, setAmount] = useState(""), [terms, setTerms] = useState("");
  const [settings,setSettings]=useState<{paymentsEnabled:boolean;managementEnabled:boolean;liveMode:boolean}|null>(null),[sessions,setSessions]=useState<Record<string,string>>({});
  const live = useRef(true), pending = useRef(false), submission = useRef<{ signature: string; key: string } | null>(null), generation = useRef(0);
  const [page,setPage]=useState<Page | null>(null),[cursor,setCursor]=useState<string | null>(null),[pageHistory,setPageHistory]=useState<(string | null)[]>([]);
  const read=useRef<AbortController | null>(null),heading=useRef<HTMLHeadingElement>(null);
  const sessionDirty=Object.values(sessions).some(value=>!!value.trim());
  const dirty = hasRefundDrafts || !!(title.trim() || amount || terms.trim() || Object.values(sessions).some(value=>!!value.trim()));
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  function fail(value: unknown) { if (live.current) { setError((value as Error).message); if (value instanceof ApiError && value.status === 401) onExpired(); } }
  async function load(before:string | null=cursor,movement:"refresh"|"older"|"newer"|"first"="refresh") {
    const current=++generation.current;read.current?.abort();const abort=new AbortController();read.current=abort;
    if(live.current)setLoading(true);
    try {
      const [values,config]=await Promise.all([api<Page>(`/api/team/support/requests/${requestId}/billing/page${before ? `?before=${encodeURIComponent(before)}` : ""}`,{signal:abort.signal}),api<{paymentsEnabled:boolean;managementEnabled:boolean;liveMode:boolean}>(`/api/team/support/requests/${requestId}/billing/settings`,{signal:abort.signal})]);
      if(live.current && !abort.signal.aborted && current===generation.current){
        const saved=Object.entries(draftMemory.refunds).filter(([,draft])=>draft.requestId===requestId);
        let recovered:Draft[]=[];
        if(saved.length && canManage && draftMemory.scope===actorScope){try{const proof=await api<{actorScope:string;drafts:Draft[]}>("/api/team/support/requests/"+requestId+"/billing/refund-form-recovery",{method:"POST",body:JSON.stringify({billIds:saved.map(([id])=>id)}),signal:abort.signal});if(abort.signal.aborted || current!==generation.current)return;if(proof.actorScope!==actorScope)throw new ApiError(401,"Your account changed. Sign in again before recovering refund proposal fields.");recovered=proof.drafts;const allowed=new Set(recovered.map(row=>row.id));for(const [id] of saved)if(!allowed.has(id))delete draftMemory.refunds[id];}catch(failure){if(failure instanceof ApiError && [403,404].includes(failure.status)){for(const [id] of saved)delete draftMemory.refunds[id];}else throw failure;}}
        else if(!canManage){for(const [id] of saved)delete draftMemory.refunds[id];}
        onDraftPresence(hasTeamDrafts(draftMemory));setRecoveryBills(recovered);
        setDrafts(values.items);setPage(values);setSettings(config);setCursor(before);if(movement==="older")setPageHistory(history=>[...history,cursor].slice(-100));if(movement==="newer")setPageHistory(history=>history.slice(0,-1));if(movement==="first")setPageHistory([]);if(movement==="older" || movement==="newer")heading.current?.focus();}
    } catch(failure){if(!abort.signal.aborted && current===generation.current){setDrafts([]);setPage(null);setSettings(null);fail(failure);}}
    finally {if(live.current && current===generation.current)setLoading(false);}
  }
  useEffect(()=>{live.current=true;setDrafts([]);setRecoveryBills([]);setRefundDirty({});setPage(null);setSettings(null);setCursor(null);setPageHistory([]);setSessions({});setPurpose("FULL");setTitle("");setAmount("");setTerms("");submission.current=null;void load(null,"first");return()=>{live.current=false;generation.current++;read.current?.abort();};},[requestId]);
  function rememberRefund(bill:string,value:RefundFormDraft | null){if(draftMemory.scope!==actorScope)return false;if(value && !canManage){delete draftMemory.refunds[bill];onDraftPresence(hasTeamDrafts(draftMemory));return false;}if(value){if(!draftMemory.refunds[bill] && Object.keys(draftMemory.refunds).length>=50){setError("This tab already holds 50 refund proposal forms. Save or discard one before retaining another.");return false;}draftMemory.refunds[bill]=value;draftMemory.support.selected=requestId;}else delete draftMemory.refunds[bill];onDraftPresence(hasTeamDrafts(draftMemory));return true;}
  async function perform(action: () => Promise<void>) {
    if (pending.current || disabled || loading || recoveryBusy || hasRefundDrafts) return;
    pending.current = true; setBusy(true); onBusy(true); setError(""); setNotice("");
    try { await action(); } catch (failure) { fail(failure); }
    finally { pending.current = false; if (live.current) { setBusy(false); onBusy(false); } }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Convert an exact decimal string to integer pence; never send binary floating-point money.
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(amount)) { setError("Enter a GBP amount with no more than two decimal places."); return; }
    const [pounds, fraction = ""] = amount.split(".");
    const amountPence = Number(pounds) * 100 + Number(fraction.padEnd(2, "0"));
    if (amountPence < 1 || amountPence > 99999999) { setError("Enter an amount from £0.01 to £999,999.99."); return; }
    await perform(async () => {
      const values = { purpose, title: title.trim(), amountPence, terms: terms.trim() };
      const signature = JSON.stringify(values);
      if (!submission.current || submission.current.signature !== signature) submission.current = { signature, key: crypto.randomUUID() };
      await api<Draft>(`/api/team/support/requests/${requestId}/billing`, { method: "POST", body: JSON.stringify({ ...values, submissionKey: submission.current.key }) });
      if (live.current) { setTitle(""); setAmount(""); setTerms(""); submission.current = null; setNotice("Draft saved for admin review. No payment request was sent and no subscription was started."); }
      await load(null,"first");
    });
  }
  async function cancel(id: string) {
    if (!window.confirm("Cancel this unissued payment draft? Its record will remain in the request.")) return;
    await perform(async () => { await api(`/api/team/support/requests/${requestId}/billing/${id}/cancel`, { method: "POST" }); if (live.current) setNotice("Unissued draft cancelled. No Stripe payment or subscription was changed."); await load(); });
  }
  async function issue(draft:Draft) {
    if(!window.confirm(`Issue ${formatMoney(draft.amountPence)}${draft.purpose==="MONTHLY" ? " per month" : ""} to this request's linked client? Confirm the amount and terms are agreed. This makes the request visible in their billing workspace; it does not collect payment.`)) return;
    await perform(async()=>{await api(`/api/team/support/requests/${requestId}/billing/${draft.id}/issue`,{method:"POST"});if(live.current)setNotice("Payment request issued to the client portal. No email or charge was sent.");await load();});
  }
  async function reconcile(id:string) { await perform(async()=>{await api(`/api/team/support/requests/${requestId}/billing/${id}/reconcile`,{method:"POST",body:JSON.stringify({sessionId:sessions[id]?.trim()})});if(live.current){setSessions(values=>({...values,[id]:""}));setNotice("Checkout reconciled against Stripe. It was not manually marked paid.");}await load();}); }
  async function withdraw(id:string) { if(!window.confirm("Withdraw this unpaid payment request and expire any open checkout? This does not refund payments or cancel an active subscription."))return;await perform(async()=>{await api(`/api/team/support/requests/${requestId}/billing/${id}/withdraw`,{method:"POST"});if(live.current)setNotice("Unpaid request withdrawn. No refund or subscription cancellation was performed.");await load();}); }
  return <section className="support-billing" aria-labelledby={`billing-${requestId}`}>
    <h4 ref={heading} tabIndex={-1} id={`billing-${requestId}`}>Payments and monthly support</h4>
    <p>Prepare the agreed amount and scope in GBP. Admins review and issue each payment request to its linked client; monthly support requires the client's explicit acceptance.</p>
    {settings && !settings.paymentsEnabled && <p>Stripe billing is unavailable. Drafts can be saved, but payment requests cannot be issued yet.</p>}{settings?.paymentsEnabled && !settings.liveMode && <p>Sandbox billing is configured. Issued requests use test payments.</p>}
    <OwnerError message={error} />{notice && <p role="status" className="admin-notice">{notice}</p>}
    <button type="button" className="admin-secondary" disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts} onClick={() => { setError(""); void load(); }}>Refresh payment drafts</button>
    {page && <p>{page.total} payment records at last refresh · {page.unissued} unissued drafts · newest first · up to 50 per page.</p>}
    <nav className="team-history-nav" aria-label="Staff payment request pages"><button type="button" className="admin-secondary" disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts || sessionDirty || !pageHistory.length} onClick={()=>{setError("");void load(pageHistory[pageHistory.length-1],"newer");}}>Newer records</button><button type="button" className="admin-secondary" disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts || sessionDirty || !page?.nextCursor} onClick={()=>{if(page?.nextCursor){setError("");void load(page.nextCursor,"older");}}}>Older records</button><button type="button" className="admin-text-button" disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts || sessionDirty || cursor===null} onClick={()=>{setError("");void load(null,"first");}}>Latest records</button></nav>
    {hasRefundDrafts && <p>Finish or discard the unsaved refund proposal before changing payment pages or other billing requests.</p>}
    {sessionDirty && <><p>Verify or clear the checkout reference before changing payment pages. Your new payment draft stays here while you browse.</p><button type="button" className="admin-text-button" disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts} onClick={()=>{if(window.confirm("Clear entered checkout references? This does not change any Stripe payment or your new payment draft."))setSessions({});}}>Clear entered checkout references</button></>}
    {loading && <p role="status">Loading payment drafts…</p>}
    {!loading && !drafts.length && !error && <p>No payment records on this page.</p>}
    <ul className="support-billing-list">{(!loading ? [...drafts,...recoveryBills.filter(row=>!drafts.some(item=>item.id===row.id))] : []).map(draft => <li key={draft.id}>{!drafts.some(row=>row.id===draft.id) && <p>This payment request is shown for its retained refund proposal, outside the current list page.</p>}<div><strong>{draft.title}</strong><span>{formatMoney(draft.amountPence)}{draft.purpose === "MONTHLY" ? " per month" : ""}</span></div><p>{purposes[draft.purpose as keyof typeof purposes]} · {draft.withdrawn ? "Withdrawn request" : draft.withdrawalPending ? "Withdrawal pending" : draft.issued ? draft.state==="PAID" ? "Initial/full payment confirmed" : draft.state==="PENDING" ? "Awaiting Stripe confirmation" : "Issued payment request" : draft.state === "DRAFT" ? "Internal draft" : "Cancelled draft"}{draft.subscriptionState!=="NOT_STARTED" ? ` · Subscription ${draft.subscriptionState.replace(/_/g," ")}` : ""}</p><p className="support-billing-terms">{draft.terms}</p><time dateTime={draft.createdAt}>{new Date(draft.createdAt).toLocaleDateString("en-GB")}</time>{canManage && !draft.issued && draft.state === "DRAFT" && <><button type="button" className="admin-secondary" disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts || !settings?.paymentsEnabled} onClick={()=>void issue(draft)}>Review and issue payment request</button><button type="button" className="admin-text-button" disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts} onClick={() => void cancel(draft.id)}>Cancel draft</button></>}{canManage && draft.issued && !draft.withdrawn && (draft.withdrawalPending || (draft.state==="ISSUED" && draft.subscriptionState==="NOT_STARTED")) && <button type="button" className="admin-secondary" disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts} onClick={()=>void withdraw(draft.id)}>{draft.withdrawalPending ? "Retry pending withdrawal" : "Withdraw unpaid request"}</button>}{canManage && draft.issued && <details><summary>Reconcile a checkout</summary><p>If an attempt needs review, locate its checkout reference in the authorised Stripe account. The server verifies its bill, attempt, customer, amount and currency before updating status.</p><label>Stripe checkout session reference<input disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts} value={sessions[draft.id]||""} onChange={event=>setSessions(values=>({...values,[draft.id]:event.target.value}))} placeholder="cs_test_…" maxLength={100}/></label><button type="button" className="admin-secondary" disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts || !settings?.managementEnabled || !sessions[draft.id]?.trim()} onClick={()=>void reconcile(draft.id)}>Verify with Stripe</button></details>}{draft.issued && <><BillingHistory request={requestId} bill={draft.id} disabled={disabled || busy || loading || recoveryBusy} onExpired={onExpired}/><BillingRecords request={requestId} bill={draft.id} disabled={disabled || busy || loading || recoveryBusy} onExpired={onExpired}/><RefundProposals initialDraft={draftMemory.refunds[draft.id]} onDraftChange={value=>rememberRefund(draft.id,value)} request={requestId} bill={draft.id} canManage={canManage} connected={!!settings?.managementEnabled} disabled={disabled || busy || loading || recoveryBusy} onExpired={onExpired} onDirty={value=>setRefundDirty(values=>{if(!!values[draft.id]===value)return values;const next={...values};if(value)next[draft.id]=true;else delete next[draft.id];return next;})} onBusy={value=>{setRecoveryBusy(value);onBusy(value || busy);}}/>{draft.purpose==="MONTHLY" && <InvoiceAllocations request={requestId} bill={draft.id} canManage={canManage} disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts} onBusy={value=>{setRecoveryBusy(value);onBusy(value || busy);}} onExpired={onExpired}/>}</>}</li>)}</ul>
    {canManage && <BillingEventQueue disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts} connected={!!settings?.managementEnabled} onBusy={value=>{setRecoveryBusy(value);onBusy(value || busy);}} onExpired={onExpired}/>}
    {canManage && <form className="admin-form" onSubmit={event => void save(event)} aria-busy={busy}><fieldset disabled={disabled || busy || loading || recoveryBusy || hasRefundDrafts}><legend>Prepare a payment draft</legend>
      <label>Payment type<select value={purpose} onChange={event => setPurpose(event.target.value)}>{Object.entries(purposes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Description<input required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>{purpose === "MONTHLY" ? "Monthly amount (GBP)" : "Amount (GBP)"}<input required inputMode="decimal" placeholder="0.00" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label>{purpose === "MONTHLY" ? "Agreed support scope, start and cancellation terms" : "Agreed scope and payment terms"}<textarea required maxLength={3000} value={terms} onChange={event => setTerms(event.target.value)} /></label>
      <p>{purpose === "MONTHLY" ? "The client must explicitly accept monthly billing before a subscription can start. Saving this draft does not authorise recurring charges." : "Prepare separate deposit and balance drafts only for amounts agreed with the client."}</p>
      <button className="admin-primary" disabled={!dirty}>Save internal draft</button>
      {dirty && <button type="button" className="admin-secondary" onClick={() => { if (window.confirm("Discard this unsaved payment draft?")) { setTitle(""); setAmount(""); setTerms(""); } }}>Discard unsaved draft</button>}
    </fieldset></form>}
  </section>;
}
