import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";

type Status = { state: "NOT_SENT" | "RUNNING" | "ACCEPTED" | "UNKNOWN"; email: string; expiresAt: string; available: boolean; availabilityMessage: string };
type Props = { kind: "TEAM" | "CLIENT"; resource: string; version: number; token: string; recipient: string; disabled: boolean; onBusy: (value: boolean) => void; onExpired: () => void };
const labels = { NOT_SENT: "No email has been claimed for this invitation.", RUNNING: "Email delivery was claimed. Its outcome has not been confirmed yet.", ACCEPTED: "The email provider accepted this invitation. This does not prove inbox delivery or account activation.", UNKNOWN: "The email outcome is unknown. This invitation will not be automatically resent. Check the account and recipient before deliberately replacing it." };

export function InvitationEmail({ kind, resource, version, token, recipient, disabled, onBusy, onExpired }: Props) {
  return <InvitationEmailScope key={`${kind}:${resource}:${version}:${token}:${recipient}`} kind={kind} resource={resource} version={version} token={token} recipient={recipient} disabled={disabled} onBusy={onBusy} onExpired={onExpired}/>;
}

function InvitationEmailScope({ kind, resource, version, token, recipient, disabled, onBusy, onExpired }: Props) {
  const [status,setStatus]=useState<Status | null>(null),[loading,setLoading]=useState(true),[working,setWorking]=useState(false),[confirmed,setConfirmed]=useState(false),[error,setError]=useState("");
  const live=useRef(false),generation=useRef(0),request=useRef<AbortController | null>(null),pending=useRef(false);
  const callbacks=useRef({onBusy,onExpired});callbacks.current={onBusy,onExpired};
  const path="/api/team/invitation-emails/"+kind+"/"+resource;
  function check(value:Status){if(value.email.toLowerCase()!==recipient.toLowerCase() || !Object.prototype.hasOwnProperty.call(labels,value.state) || typeof value.available!=="boolean" || !Number.isFinite(Date.parse(value.expiresAt)))throw new ApiError(409,"The recipient or invitation status changed. Reload the account and issue a current invitation.");return value;}
  function fail(failure:unknown){setError(failure instanceof Error ? failure.message : "Invitation delivery could not be confirmed.");if(failure instanceof ApiError && failure.status===401)callbacks.current.onExpired();}
  async function load(){
    const current=++generation.current;request.current?.abort();const abort=new AbortController();request.current=abort;setLoading(true);setConfirmed(false);setStatus(null);setError("");
    try{const result=check(await api<Status>(path+"/status",{method:"POST",signal:abort.signal,body:JSON.stringify({version,token})}));if(live.current && current===generation.current)setStatus(result);}
    catch(failure){if(live.current && current===generation.current && !(failure instanceof DOMException && failure.name==="AbortError"))fail(failure);}
    finally{if(live.current && current===generation.current)setLoading(false);}
  }
  useEffect(()=>{live.current=true;void load();return()=>{live.current=false;++generation.current;request.current?.abort();callbacks.current.onBusy(false);};},[]);
  async function send(){
    if(pending.current || disabled || loading || !confirmed || !status?.available || status.state!=="NOT_SENT")return;
    pending.current=true;setWorking(true);onBusy(true);setConfirmed(false);setError("");const current=generation.current;
    try{const result=check(await api<Status>(path+"/send",{method:"POST",body:JSON.stringify({version,token})}));if(live.current && current===generation.current)setStatus(result);}
    catch(failure){if(live.current && current===generation.current){setStatus(null);fail(failure);}}
    finally{pending.current=false;if(live.current){setWorking(false);onBusy(false);}}
  }
  return <section className="support-client-access"><h4>Email this private invitation</h4><p>Recipient: <strong>{recipient}</strong>. The server uses the email stored on this account.</p><OwnerError message={error}/>{loading && <p role="status">Checking invitation delivery status…</p>}{status && <><p role="status">{labels[status.state]}</p>{!status.available && <p>{status.availabilityMessage}</p>}{status.state==="NOT_SENT" && <label><input type="checkbox" checked={confirmed} disabled={disabled || working || !status.available} onChange={event=>setConfirmed(event.target.checked)}/>I have checked this recipient and want to email their private activation link.</label>}<button className="admin-secondary" disabled={disabled || working || loading || !confirmed || !status.available || status.state!=="NOT_SENT"} onClick={()=>void send()}>{working ? "Submitting invitation email…" : "Send invitation to recorded recipient"}</button></>}
    <button className="admin-text-button" disabled={disabled || working || loading} onClick={()=>void load()}>Refresh email status</button><p>An unconfirmed send must be checked before another action. Refresh only reads status; it does not resend. Provider acceptance does not create a company mailbox.</p>
  </section>;
}
