import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, clearCsrf } from "../portfolio/projectApi";
import { PasswordField, validateOwnerPasswords } from "../admin/PasswordField";
import { AuthenticatorCode } from "../admin/AuthenticatorCode";
import { AuthenticatorKey } from "../admin/AuthenticatorKey";
import { OwnerError } from "../admin/OwnerError";
import { TeamWorkspace } from "./TeamWorkspace";
import { useNavigationProtection } from "../../app/NavigationProtection";
import { emptyTeamDraftMemory } from "./teamDraftMemory";
import { OwnerSignIn, type OwnerSession } from "../admin/OwnerSignIn";

export type TeamSession = { authenticated: boolean; mfaRequired?: boolean; enrolmentRequired?: boolean; member?: { displayName: string; role: string }; permissions?: string[] };
export default function TeamEntry() {
  const { pathname, search, hash, key: routeKey } = useLocation();
  const activate = pathname.replace(/\/+$/, "") === "/team/activate";
  const [token, setToken] = useState(() => new URLSearchParams(hash.slice(1)).get("token") || "");
  const [session, setSession] = useState<TeamSession | null>(null), [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [activated, setActivated] = useState(false), [dirty, setDirty] = useState(false), [notice,setNotice]=useState("");
  const live = useRef(true), pending = useRef<number | null>(null), generation = useRef(0);
  const draftMemory=useRef(emptyTeamDraftMemory());
  const [hasRecoverableDrafts,setHasRecoverableDrafts]=useState(false);
  useNavigationProtection(hasRecoverableDrafts,"Leave or refresh and discard conversation, request and project drafts retained in this tab?");
  const [ownerSession,setOwnerSession]=useState<OwnerSession | null>(null);
  useNavigationProtection(dirty || busy || !!session?.mfaRequired,"Leave sign-in and discard unsaved input or an unfinished authenticator step?");
  const recoverOwner=!activate && !!draftMemory.current.scope?.startsWith("OWNER:") && !session?.authenticated;
  async function loadOwnerSession(){const current=generation.current,scope=draftMemory.current.scope;try{const value=await api<OwnerSession>("/api/admin/auth/session");if(live.current && current===generation.current && draftMemory.current.scope===scope){if(value.authenticated){clearCsrf();const confirmed=await api<TeamSession>("/api/team/auth/session");if(live.current && current===generation.current && draftMemory.current.scope===scope)setSession(confirmed);}else setOwnerSession(value);}}catch(failure){if(live.current && current===generation.current)setError((failure as Error).message);}}
  useEffect(()=>{if(recoverOwner)void loadOwnerSession();},[recoverOwner]);
  useLayoutEffect(() => {
    live.current = true;
    const current=++generation.current, abort=new AbortController();
    pending.current=null;setBusy(false);setOwnerSession(null);
    setDirty(false); setError(""); setNotice(""); setSecret(""); setSession(null); setActivated(false);
    if (activate) {
      setToken(new URLSearchParams(hash.slice(1)).get("token") || "");
      history.replaceState(history.state, "", location.pathname + location.search);
    } else {
      setToken("");
      void api<TeamSession>("/api/team/auth/session",{signal:abort.signal}).then(value => {
        if(live.current && current===generation.current)setSession(value);
      }).catch(failure => {
        if(live.current && current===generation.current && !(failure instanceof DOMException && failure.name==="AbortError"))setError((failure as Error).message);
      });
    }
    return () => { live.current=false; ++generation.current; abort.abort(); };
  }, [activate, pathname, search, hash, routeKey]);
  useEffect(() => { if (!session?.enrolmentRequired) { setSecret(""); return; } let current = true; const scope=generation.current; void api<{ secret: string }>("/api/team/auth/enrolment", { method: "POST" }).then(value => { if (current && scope===generation.current) setSecret(value.secret); }).catch(failure => { if (current && scope===generation.current) setError(failure.message); }); return () => { current = false; }; }, [session?.enrolmentRequired]);
  async function submit(form: HTMLFormElement) {
    if (pending.current!==null || (activate && !token) || !validateOwnerPasswords(form)) return;
    const current=++generation.current; pending.current = current; setBusy(true); setError("");setNotice("");
    const data = new FormData(form);
    try {
      if (activate) { await api("/api/team/auth/activate", { method: "POST", body: JSON.stringify({ token, password: data.get("password") }) }); if (live.current && current===generation.current) { form.reset(); setDirty(false); setToken(""); setActivated(true); } }
      else { const next = await api<TeamSession>(session?.mfaRequired ? "/api/team/auth/verify" : "/api/team/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(data)) }); clearCsrf(); if (live.current && current===generation.current) { setSession(next); form.reset(); setDirty(false); } }
    } catch (failure) { if (live.current && current===generation.current) setError((failure as Error).message); } finally { if(pending.current===current){pending.current=null;if(live.current && current===generation.current)setBusy(false);} }
  }
  async function logout(preserveDrafts=false) {
    if (pending.current!==null) return;
    const current=generation.current;pending.current=current;setBusy(true);setError("");
    try {
      await api("/api/team/auth/logout", { method: "POST" });clearCsrf();
      if(live.current && current===generation.current){
        ++generation.current;
        if(!preserveDrafts){draftMemory.current=emptyTeamDraftMemory();setHasRecoverableDrafts(false);}
        setOwnerSession(null);setSession({authenticated:false});setSecret("");setDirty(false);
        setNotice(preserveDrafts ? "Sign-in attempt cancelled. Enter your email and password to start again." : "");
      }
    } catch(failure){if(live.current && current===generation.current)setError((failure as Error).message);}
    finally{if(pending.current===current){pending.current=null;if(live.current)setBusy(false);}}
  }
  if (!activate && session?.authenticated) return <TeamWorkspace onSecurityChanged={message=>{++generation.current;clearCsrf();setSecret("");setOwnerSession(null);setSession({authenticated:false});setDirty(false);setError("");setNotice(message);}} onDraftPresence={setHasRecoverableDrafts} draftMemory={draftMemory.current} session={session} onSignOut={() => void logout()} busy={busy} onExpired={() => {++generation.current;setNotice("");setDirty(false);clearCsrf();setSecret("");setOwnerSession(null); setSession({ authenticated: false }); setError("Your session ended. Sign in to the same account to recover eligible conversation, request and project drafts in this tab."); }} />;
  if(recoverOwner)return <div className="admin-studio"><OwnerError message={error}/><p>Confirm your protected owner account to recover eligible conversation, request and project drafts. Passwords, codes and old message history are not retained.</p><button className="admin-text-button" disabled={busy} onClick={()=>{if(window.confirm("Discard retained conversation, request and project drafts and use team sign-in instead?")){draftMemory.current=emptyTeamDraftMemory();setHasRecoverableDrafts(false);setOwnerSession(null);setSession({authenticated:false});setError("");}}}>Discard recovery and use team sign-in</button>{ownerSession ? <OwnerSignIn initial={ownerSession} onSignedIn={()=>{clearCsrf();void loadOwnerSession();}} onBusyChange={setBusy}/> : <button className="admin-secondary" disabled={busy} onClick={()=>void loadOwnerSession()}>Open owner sign-in</button>}</div>;
  return <section className="admin-studio studio-section"><p className="studio-eyebrow">CRYSTAL POWERS / TEAM</p><h1>{activate ? "Activate your account" : "Your team workspace"}</h1><OwnerError message={error} />{notice && <p role="status" className="admin-notice">{notice}</p>}
    {activated ? <p role="status">Your password is set. <Link to="/team">Sign in and set up your authenticator</Link>.</p> : activate && !token ? <p>This invitation is missing. Ask your admin for a new private invitation.</p> : !activate && !session ? <div><p role="status">{error ? "Sign-in could not be opened." : "Opening sign-in…"}</p>{error && <button className="admin-secondary" onClick={() => window.location.reload()}>Try again</button>}</div> : <form key={`${routeKey}:${pathname}:${search}:${hash}:${activate ? "activate" : session?.mfaRequired ? "mfa" : "password"}`} className="admin-form" aria-busy={busy} onInput={()=>setDirty(true)} onSubmit={event => { event.preventDefault(); void submit(event.currentTarget); }}><fieldset className="team-auth-fields" disabled={busy}>
      {activate ? <><PasswordField label="Choose a password" name="password" fresh /><PasswordField label="Confirm password" confirm="password" /></> : session?.mfaRequired ? <>{session.enrolmentRequired && (secret ? <AuthenticatorKey secret={secret} busy={busy} /> : <p role="status">Preparing your authenticator…</p>)}<AuthenticatorCode label="Authenticator code" newAuthenticator /></> : <><p>Accounts are issued by an admin. Your role is assigned when you are invited.</p><label>Email<input name="email" type="email" required maxLength={254} autoComplete="username" /></label><PasswordField label="Password" name="password" /></>}
      <button className="admin-primary" disabled={busy || (!!session?.enrolmentRequired && !secret)}>{busy ? "Please wait…" : activate ? "Activate account" : session?.mfaRequired ? "Open workspace" : "Continue"}</button>
    </fieldset></form>}
    {!activate && session?.mfaRequired && <div><p>Expired or need to use another account? Cancel this sign-in to return to email and password. Eligible unsent work stays in this tab.</p><button type="button" className="admin-secondary" disabled={busy} onClick={()=>void logout(true)}>Cancel this sign-in</button></div>}
  </section>;
}
