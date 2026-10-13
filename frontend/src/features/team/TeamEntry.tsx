import { useEffect, useRef, useState } from "react";
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
  const { pathname } = useLocation();
  const activate = pathname.replace(/\/+$/, "") === "/team/activate";
  const token = useRef(new URLSearchParams(location.hash.slice(1)).get("token") || "");
  const [session, setSession] = useState<TeamSession | null>(null), [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [activated, setActivated] = useState(false);
  const live = useRef(true), pending = useRef(false);
  const draftMemory=useRef(emptyTeamDraftMemory());
  const [hasRecoverableDrafts,setHasRecoverableDrafts]=useState(false);
  useNavigationProtection(hasRecoverableDrafts,"Leave or refresh and discard conversation, request and project drafts retained in this tab?");
  const [ownerSession,setOwnerSession]=useState<OwnerSession | null>(null);
  const recoverOwner=!!draftMemory.current.scope?.startsWith("OWNER:") && !session?.authenticated;
  async function loadOwnerSession(){const scope=draftMemory.current.scope;try{const value=await api<OwnerSession>("/api/admin/auth/session");if(live.current && draftMemory.current.scope===scope){if(value.authenticated){clearCsrf();const confirmed=await api<TeamSession>("/api/team/auth/session");if(live.current && draftMemory.current.scope===scope)setSession(confirmed);}else setOwnerSession(value);}}catch(failure){if(live.current)setError((failure as Error).message);}}
  useEffect(()=>{if(recoverOwner)void loadOwnerSession();},[recoverOwner]);
  useEffect(() => {
    live.current = true;
    if (activate) history.replaceState(history.state, "", location.pathname + location.search);
    else void api<TeamSession>("/api/team/auth/session").then(value => { if (live.current) setSession(value); }).catch(failure => { if (live.current) setError(failure.message); });
    return () => { live.current = false; };
  }, [activate]);
  useEffect(() => { if (!session?.enrolmentRequired) { setSecret(""); return; } let current = true; void api<{ secret: string }>("/api/team/auth/enrolment", { method: "POST" }).then(value => { if (current) setSecret(value.secret); }).catch(failure => { if (current) setError(failure.message); }); return () => { current = false; }; }, [session?.enrolmentRequired]);
  async function submit(form: HTMLFormElement) {
    if (pending.current || !validateOwnerPasswords(form)) return;
    pending.current = true; setBusy(true); setError("");
    const data = new FormData(form);
    try {
      if (activate) { await api("/api/team/auth/activate", { method: "POST", body: JSON.stringify({ token: token.current, password: data.get("password") }) }); token.current = ""; if (live.current) setActivated(true); }
      else { const next = await api<TeamSession>(session?.mfaRequired ? "/api/team/auth/verify" : "/api/team/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(data)) }); clearCsrf(); if (live.current) { setSession(next); form.reset(); } }
    } catch (failure) { if (live.current) setError((failure as Error).message); } finally { pending.current = false; if (live.current) setBusy(false); }
  }
  async function logout() { if (pending.current) return; pending.current = true; setBusy(true); try { await api("/api/team/auth/logout", { method: "POST" }); clearCsrf(); if (live.current) {draftMemory.current=emptyTeamDraftMemory();setHasRecoverableDrafts(false);setOwnerSession(null); setSession({ authenticated: false }); setSecret(""); } } catch (failure) { if (live.current) setError((failure as Error).message); } finally { pending.current = false; if (live.current) setBusy(false); } }
  if (session?.authenticated) return <TeamWorkspace onDraftPresence={setHasRecoverableDrafts} draftMemory={draftMemory.current} session={session} onSignOut={() => void logout()} busy={busy} onExpired={() => {clearCsrf();setSecret("");setOwnerSession(null); setSession({ authenticated: false }); setError("Your session ended. Sign in to the same account to recover eligible conversation, request and project drafts in this tab."); }} />;
  if(recoverOwner)return <div className="admin-studio"><OwnerError message={error}/><p>Confirm your protected owner account to recover eligible conversation, request and project drafts. Passwords, codes and old message history are not retained.</p><button className="admin-text-button" disabled={busy} onClick={()=>{if(window.confirm("Discard retained conversation, request and project drafts and use team sign-in instead?")){draftMemory.current=emptyTeamDraftMemory();setHasRecoverableDrafts(false);setOwnerSession(null);setSession({authenticated:false});setError("");}}}>Discard recovery and use team sign-in</button>{ownerSession ? <OwnerSignIn initial={ownerSession} onSignedIn={()=>{clearCsrf();void loadOwnerSession();}} onBusyChange={setBusy}/> : <button className="admin-secondary" disabled={busy} onClick={()=>void loadOwnerSession()}>Open owner sign-in</button>}</div>;
  return <section className="admin-studio studio-section"><p className="studio-eyebrow">CRYSTAL POWERS / TEAM</p><h1>{activate ? "Activate your account" : "Your team workspace"}</h1><OwnerError message={error} />
    {activated ? <p role="status">Your password is set. <Link to="/team">Sign in and set up your authenticator</Link>.</p> : activate && !token.current ? <p>This invitation is missing. Ask your admin for a new private invitation.</p> : !activate && !session ? <div><p role="status">{error ? "Sign-in could not be opened." : "Opening sign-in…"}</p>{error && <button className="admin-secondary" onClick={() => window.location.reload()}>Try again</button>}</div> : <form className="admin-form" onSubmit={event => { event.preventDefault(); void submit(event.currentTarget); }}>
      {activate ? <><PasswordField label="Choose a password" name="password" fresh /><PasswordField label="Confirm password" confirm="password" /></> : session?.mfaRequired ? <>{session.enrolmentRequired && (secret ? <AuthenticatorKey secret={secret} busy={busy} /> : <p role="status">Preparing your authenticator…</p>)}<AuthenticatorCode label="Authenticator code" newAuthenticator /></> : <><p>Accounts are issued by an admin. Your role is assigned when you are invited.</p><label>Email<input name="email" type="email" required maxLength={254} autoComplete="username" /></label><PasswordField label="Password" name="password" /></>}
      <button className="admin-primary" disabled={busy || (!!session?.enrolmentRequired && !secret)}>{busy ? "Please wait…" : activate ? "Activate account" : session?.mfaRequired ? "Open workspace" : "Continue"}</button>
    </form>}
  </section>;
}
