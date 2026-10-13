import { InvitationEmail } from "../admin/InvitationEmail";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";

type Account = { id: string; email: string; displayName: string; state: string; version: number; invitationToken?: string | null };
type Props = { requestId: string; disabled: boolean; onBusy: (value: boolean) => void; onDirty: (value: boolean) => void; onExpired: () => void };
export function ClientAccess({ requestId, disabled, onBusy, onDirty, onExpired }: Props) {
  const [account, setAccount] = useState<Account | null>(null), [link, setLink] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState(""), [loading, setLoading] = useState(true), [baseBusy, setBusy] = useState(false),[emailBusy,setEmailBusy]=useState(false);
  const busy=baseBusy || emailBusy;
  const live = useRef(true), pending = useRef(false);
  useEffect(() => { onDirty(!!link); }, [link, onDirty]);
  function fail(failure: unknown) { if (live.current) { setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) onExpired(); } }
  async function load() { try { const result = await api<{ linked: boolean; account?: Account }>(`/api/team/support/requests/${requestId}/client-access`); if (live.current) setAccount(result.account || null); } catch (failure) { fail(failure); } finally { if (live.current) setLoading(false); } }
  useEffect(() => { live.current = true; void load(); return () => { live.current = false; }; }, [requestId]);
  async function action(kind: "provision" | "recover" | "suspend") {
    if (pending.current || disabled || busy) return;
    if (kind !== "provision" && !window.confirm(kind === "recover" ? "Revoke this client's old credentials and issue a new invitation? This affects all of their linked projects and sessions." : "Suspend this client's access to every linked project and revoke existing sessions?")) return;
    pending.current = true; setBusy(true); onBusy(true); setError(""); setNotice("");
    try {
      const path = `/api/team/support/requests/${requestId}/client-access${kind === "provision" ? "" : `/${kind}`}`;
      const result = await api<Account>(path, { method: "POST", ...(kind !== "provision" ? { body: JSON.stringify({ expectedVersion: account?.version }) } : {}) });
      if (live.current) {
        const token = result.invitationToken;
        setLink(token ? `${window.location.origin}/client/activate#token=${token}` : "");
        if (kind !== "suspend") setAccount(result);
        setNotice(token ? "Private invitation issued for 72 hours. Deliver it only to the recorded client email; it has not been emailed automatically." : kind === "suspend" ? "Client access suspended. No Stripe subscription was cancelled." : "This request is linked to the client's existing account.");
        await load();
      }
    } catch (failure) { fail(failure); }
    finally { pending.current = false; if (live.current) { setBusy(false); onBusy(false); } }
  }
  function emailBusyChanged(value:boolean){setEmailBusy(value);onBusy(value);}
  async function copy() { try { await navigator.clipboard.writeText(link); if (live.current) setNotice("Private invitation copied. Share only with the recorded recipient and clear your clipboard afterwards."); } catch { if (live.current) setError("Clipboard access was unavailable. Select the private link and copy it manually."); } }
  return <section className="support-client-access"><h4>Client portal access</h4><OwnerError message={error} />{notice && <p role="status" className="admin-notice">{notice}</p>}{loading ? <p role="status">Loading client access…</p> : account ? <p>{account.displayName} · {account.email} · {account.state.toLowerCase()}</p> : <p>No client account is linked. Create access using this request's recorded recipient.</p>}
    <div className="admin-actions"><button className="admin-secondary" disabled={disabled || busy || loading || account?.state === "SUSPENDED"} onClick={() => void action("provision")}>{account?.state === "INVITED" ? "Replace private invitation" : "Link client access"}</button>{account && <><button className="admin-secondary" disabled={disabled || busy} onClick={() => void action("recover")}>Recover client account</button><button className="admin-secondary" disabled={disabled || busy || account.state === "SUSPENDED"} onClick={() => void action("suspend")}>Suspend all client access</button></>}</div>
    {link && <div><label>Private activation link<input readOnly value={link} autoComplete="off" /></label><p>Anyone holding this link can activate this client account. Keep it out of channels, public screenshots and shared logs.</p><button className="admin-secondary" disabled={disabled || busy} onClick={() => void copy()}>Copy private invitation</button>{account && <InvitationEmail kind="CLIENT" resource={requestId} version={account.version} recipient={account.email} token={link.split("#token=")[1] || ""} disabled={disabled || busy} onBusy={emailBusyChanged} onExpired={onExpired}/>}<button className="admin-text-button" disabled={disabled || busy} onClick={() => setLink("")}>Hide private link</button></div>}
  </section>;
}
