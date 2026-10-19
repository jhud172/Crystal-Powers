import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigationProtection } from "../../app/NavigationProtection";
import { api, ApiError } from "../portfolio/projectApi";
import { PasswordField, validateOwnerPasswords } from "../admin/PasswordField";
import { AuthenticatorCode } from "../admin/AuthenticatorCode";
import { AuthenticatorKey } from "../admin/AuthenticatorKey";
import { OwnerError } from "../admin/OwnerError";

type Operation = "password" | "sessions" | "authenticator";
const titles: Record<Operation,string> = { password: "Change password", sessions: "Sign out everywhere", authenticator: "Replace authenticator" };
type Props = { disabled:boolean; otherDirty:boolean; onDirty:(value:boolean)=>void; onBusy:(value:boolean)=>void; onExpired:()=>void; onChanged:(message:string)=>void };

/** Credentials live only in these uncontrolled fields; pending setup is never persisted in the browser. */
export function TeamAccountSecurity({ disabled, otherDirty, onDirty, onBusy, onExpired, onChanged }:Props) {
  const [operation,setOperation]=useState<Operation>("password"),[setup,setSetup]=useState("");
  const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState("");
  const live=useRef(true),pending=useRef(false),form=useRef<HTMLFormElement>(null);
  const callbacks=useRef({onDirty,onBusy});callbacks.current={onDirty,onBusy};
  const protectedInput=dirty || !!setup || uncertain;
  useNavigationProtection(protectedInput || busy,"Leave account security and discard private input, unfinished setup or an unconfirmed change?");
  useEffect(()=>{callbacks.current.onDirty(protectedInput);},[protectedInput]);
  useEffect(()=>{callbacks.current.onBusy(busy);},[busy]);
  useEffect(()=>{live.current=true;return()=>{live.current=false;callbacks.current.onDirty(false);callbacks.current.onBusy(false);};},[]);
  const locked=disabled || busy || uncertain;
  function discardOtherSettings(){return !otherDirty || window.confirm("This change signs you out and discards unsaved profile/workspace settings. Eligible conversation, request and project drafts stay in this tab for verified recovery. Continue?");}
  function choose(next:Operation){if(locked || setup || (dirty && !window.confirm("Discard private security input and choose another action?")))return;form.current?.reset();setDirty(false);setOperation(next);setError("");setNotice("");}
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const element=event.currentTarget;
    if(pending.current || locked || !validateOwnerPasswords(element))return;
    if((setup || operation!=="authenticator") && !discardOtherSettings())return;
    pending.current=true;setBusy(true);setError("");setNotice("");
    const values=new FormData(element);
    try {
      if(operation==="authenticator" && !setup){
        const result=await api<{secret:string}>("/api/team/account/authenticator",{method:"POST",body:JSON.stringify({password:values.get("password"),code:values.get("code")})});
        if(!live.current)return;
        if(typeof result?.secret!=="string" || !/^[A-Z2-7]{16,64}$/.test(result.secret))throw new ApiError(503,"New authenticator setup could not be confirmed. Sign in again before another security change.");
        element.reset();setDirty(false);setSetup(result.secret);setNotice("Your existing authenticator remains active until you confirm a code from the new one. This setup expires after five minutes.");
      }else{
        const endpoint=setup ? "authenticator/confirm" : operation==="sessions" ? "sessions/revoke" : "password";
        const body=setup ? {code:values.get("code")} : {password:values.get("password"),code:values.get("code"),...(operation==="password" ? {nextPassword:values.get("nextPassword")} : {})};
        const result=await api<{message:string}>(`/api/team/account/${endpoint}`,{method:"POST",body:JSON.stringify(body)});
        if(!live.current)return;
        if(typeof result?.message!=="string")throw new ApiError(503,"The security change could not be confirmed. Sign in again before making another change.");
        element.reset();setSetup("");setDirty(false);onChanged(result.message);
      }
    }catch(failure){if(live.current){setError((failure as Error).message);if(failure instanceof ApiError && failure.status===401)onExpired();else if(!(failure instanceof ApiError) || failure.status===0 || failure.status>=500)setUncertain(true);}}
    finally{pending.current=false;if(live.current)setBusy(false);}
  }
  async function cancel(){
    if(pending.current || disabled || busy || uncertain)return;
    pending.current=true;setBusy(true);setError("");
    try{const result=await api<{message:string}>("/api/team/account/authenticator/cancel",{method:"POST"});if(live.current){form.current?.reset();setSetup("");setDirty(false);setNotice(result.message);}}
    catch(failure){if(live.current){setError((failure as Error).message);if(failure instanceof ApiError && failure.status===401)onExpired();}}
    finally{pending.current=false;if(live.current)setBusy(false);}
  }
  return <section className="team-account-security" aria-labelledby="team-account-security-title"><h3 id="team-account-security-title">Team account security</h3>
    <p>These controls affect only your team account. Use your current password and a fresh six-digit authenticator code; a code already used to sign in cannot be reused.</p>
    <p>Confirmed password, session and authenticator changes end all your existing team sessions, including this one. Private passwords, codes and setup keys are never recovered. Eligible unsent work stays in this tab for access-checked recovery after sign-in.</p>
    <OwnerError message={error}/>{notice && <p role="status" className="admin-notice">{notice}</p>}
    {!setup && <div className="team-security-actions" role="group" aria-label="Choose a team security action">{(Object.keys(titles) as Operation[]).map(value=><button type="button" className="admin-secondary" key={value} disabled={locked} aria-pressed={operation===value} onClick={()=>choose(value)}>{titles[value]}</button>)}</div>}
    {setup && <AuthenticatorKey secret={setup} busy={locked}/>}
    <form key={setup ? "new-authenticator" : operation} ref={form} className="admin-form" aria-busy={busy} onInput={()=>setDirty(true)} onSubmit={event=>void submit(event)}><fieldset className="team-auth-fields" disabled={locked}><legend>{setup ? "Confirm your new authenticator" : titles[operation]}</legend>
      {!setup && <PasswordField label="Current team password" name="password"/>}
      {operation==="password" && !setup && <><PasswordField label="New team password" name="nextPassword" fresh/><PasswordField label="Confirm new team password" confirm="nextPassword"/></>}
      <AuthenticatorCode label={setup ? "New authenticator code" : "Current authenticator code"} newAuthenticator/>
      <button className="admin-primary">{busy ? "Please wait…" : setup ? "Confirm replacement and sign out everywhere" : operation==="password" ? "Change password and sign out everywhere" : operation==="sessions" ? "End all my team sessions" : "Set up a new authenticator"}</button>
    </fieldset></form>
    {setup && <button type="button" className="admin-secondary" disabled={locked} onClick={()=>void cancel()}>Cancel new authenticator setup</button>}
    {uncertain && <><p>The outcome is unconfirmed. Sign in again to check your access before making another security change. Do not assume a password or authenticator changed.</p><button type="button" className="admin-secondary" disabled={busy} onClick={()=>{if(discardOtherSettings())onExpired();}}>Return to sign-in</button></>}
    <p>If you have lost your password or authenticator, contact your admin through existing team correspondence. They can revoke old access and issue a private recovery invitation after checking your identity.</p>
  </section>;
}
