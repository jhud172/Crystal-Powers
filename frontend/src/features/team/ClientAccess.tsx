import { InvitationEmail } from "../admin/InvitationEmail";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";

type Account = { id: string; email: string; displayName: string; state: string; version: number; invitationToken?: string | null };
type Props = { requestId: string; disabled: boolean; onBusy: (value: boolean) => void; onDirty: (value: boolean) => void; onExpired: () => void };
export function ClientAccess({ requestId, disabled, onBusy, onDirty, onExpired }: Props) {
  return <ClientAccessScope key={requestId} requestId={requestId} disabled={disabled} onBusy={onBusy} onDirty={onDirty} onExpired={onExpired}/>;
}

function ClientAccessScope({ requestId, disabled, onBusy, onDirty, onExpired }: Props) {
  const [account, setAccount] = useState<Account | null>(null), [link, setLink] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState(""), [loading, setLoading] = useState(true), [baseBusy, setBusy] = useState(false),[emailBusy,setEmailBusy]=useState(false);
  const busy=baseBusy || emailBusy;
  const live = useRef(true), pending = useRef(false);
  const generation=useRef(0),read=useRef<AbortController | null>(null);
  const callbacks=useRef({onBusy,onDirty,onExpired});callbacks.current={onBusy,onDirty,onExpired};
  const invitation=useRef<{id:string;version:number;link:string} | null>(null);
  useEffect(() => { callbacks.current.onDirty(!!link); }, [link]);
  useEffect(() => { callbacks.current.onBusy(busy); }, [busy]);
  function clearInvitation(){invitation.current=null;setLink("");}
  function fail(failure: unknown) {
    if (!live.current) return;
    setError((failure as Error).message);
    if (failure instanceof ApiError && [401,403,404].includes(failure.status)) {setAccount(null);clearInvitation();setNotice("");}
    if (failure instanceof ApiError && failure.status === 401) callbacks.current.onExpired();
  }
  async function load() {
    const current=++generation.current;read.current?.abort();const abort=new AbortController();read.current=abort;
    setLoading(true);setError("");
    try {
      const result = await api<{ linked: boolean; account?: Account }>(`/api/team/support/requests/${requestId}/client-access`,{signal:abort.signal});
      if (!live.current || abort.signal.aborted || current!==generation.current) return;
      const value=result.linked ? result.account || null : null;
      const issued=invitation.current;
      if(issued && (!value || value.id!==issued.id || value.version!==issued.version || value.state!=="INVITED")) {clearInvitation();setNotice("Client access changed. The previous private invitation has been hidden.");}
      setAccount(value);
    } catch (failure) {
      if(live.current && !abort.signal.aborted && current===generation.current){setAccount(null);clearInvitation();setNotice("");fail(failure);}
    } finally { if (live.current && current===generation.current) setLoading(false); }
  }
  useEffect(() => {
    live.current = true; void load();
    return () => { live.current = false;++generation.current;read.current?.abort();callbacks.current.onBusy(false);callbacks.current.onDirty(false); };
  }, []);
  async function action(kind: "provision" | "recover" | "suspend") {
    if (pending.current || disabled || busy || loading || error || (kind!=="provision" && !account)) return;
    if (kind !== "provision" && !window.confirm(kind === "recover" ? "Revoke this client's old credentials and issue a new invitation? This affects all of their linked projects and sessions." : "Suspend this client's access to every linked project and revoke existing sessions?")) return;
    pending.current = true; setBusy(true); callbacks.current.onBusy(true); setError(""); setNotice("");clearInvitation();
    const current=++generation.current;read.current?.abort();
    try {
      const path = `/api/team/support/requests/${requestId}/client-access${kind === "provision" ? "" : `/${kind}`}`;
      const result = await api<Account>(path, { method: "POST", body:JSON.stringify(kind==="provision" ? {expectedLinked:!!account,expectedVersion:account?.version ?? null} : {expectedVersion:account?.version}) });
      if (live.current && current===generation.current) {
        const token = result.invitationToken;
        if(token){const value=`${window.location.origin}/client/activate#token=${token}`;invitation.current={id:result.id,version:result.version,link:value};setLink(value);}
        if (kind !== "suspend") setAccount(result);
        setNotice(token ? "Private invitation issued for 72 hours. Deliver it only to the recorded client email; it has not been emailed automatically." : kind === "suspend" ? "Client access suspended. No Stripe subscription was cancelled." : "This request is linked to the client's existing account.");
        await load();
      }
    } catch (failure) { if(live.current && current===generation.current){setAccount(null);fail(failure);} }
    finally { pending.current = false; if (live.current) setBusy(false); }
  }
  function emailBusyChanged(value:boolean){if(!live.current)return;setEmailBusy(value);callbacks.current.onBusy(value || pending.current);}
  async function copy() { const value=link;try { await navigator.clipboard.writeText(value); if (live.current && invitation.current?.link===value) setNotice("Private invitation copied. Share only with the recorded recipient and clear your clipboard afterwards."); } catch { if (live.current && invitation.current?.link===value) setError("Clipboard access was unavailable. Select the private link and copy it manually."); } }
  return <section className="support-client-access"><h4>Client portal access</h4><OwnerError message={error} />{notice && <p role="status" className="admin-notice">{notice}</p>}{loading ? <p role="status">Loading client access…</p> : account ? <p>{account.displayName} · {account.email} · {account.state.toLowerCase()}</p> : error ? <p>Client access could not be confirmed. Refresh its status before making another change.</p> : <p>No client account is linked. Create access using this request's recorded recipient.</p>}
    <div className="admin-actions"><button className="admin-secondary" disabled={disabled || busy || loading || !!error || account?.state === "SUSPENDED"} onClick={() => void action("provision")}>{account?.state === "INVITED" ? "Replace private invitation" : "Link client access"}</button>{account && <><button className="admin-secondary" disabled={disabled || busy || loading || !!error} onClick={() => void action("recover")}>Recover client account</button><button className="admin-secondary" disabled={disabled || busy || loading || !!error || account.state === "SUSPENDED"} onClick={() => void action("suspend")}>Suspend all client access</button></>}<button className="admin-text-button" disabled={disabled || busy || loading} onClick={()=>void load()}>Refresh client access</button></div>
    {link && <div><label>Private activation link<input readOnly value={link} autoComplete="off" /></label><p>Anyone holding this link can activate this client account. Keep it out of channels, public screenshots and shared logs.</p><button className="admin-secondary" disabled={disabled || busy || loading} onClick={() => void copy()}>Copy private invitation</button>{account && <InvitationEmail kind="CLIENT" resource={requestId} version={account.version} recipient={account.email} token={link.split("#token=")[1] || ""} disabled={disabled || busy || loading} onBusy={emailBusyChanged} onExpired={onExpired}/>}<button className="admin-text-button" disabled={disabled || busy} onClick={clearInvitation}>Hide private link</button></div>}
  </section>;
}
