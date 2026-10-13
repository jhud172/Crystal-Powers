import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, clearCsrf } from "../portfolio/projectApi";
import { PasswordField, validateOwnerPasswords } from "../admin/PasswordField";
import { OwnerError } from "../admin/OwnerError";
import { useNavigationProtection } from "../../app/NavigationProtection";
import { ClientWorkspace } from "./ClientWorkspace";
import { emptyClientDraftMemory } from "./clientDraftMemory";

type Session = { authenticated: boolean; client?: { id: string; workspaceId: string; displayName: string } };
export default function ClientEntry() {
  const { pathname } = useLocation();
  const activate = pathname.replace(/\/+$/, "") === "/client/activate";
  const token = useRef(new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  const [session, setSession] = useState<Session | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [dirty, setDirty] = useState(false);
  const live = useRef(true), pending = useRef(false);
  const drafts=useRef(emptyClientDraftMemory()),generation=useRef(0);
  const [hasDrafts,setHasDrafts]=useState(false);
  useNavigationProtection(hasDrafts,"Leave or refresh and discard client messages retained in this tab?");
  const [activated, setActivated] = useState(false);
  useNavigationProtection(dirty || busy, "Leave client sign-in and discard unsaved input?");
  useEffect(() => {
    live.current = true;
    const current=++generation.current,abort=new AbortController();
    if (!activate) setActivated(false);
    if (activate && window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    if (!activate) void api<Session>("/api/client/auth/session",{signal:abort.signal}).then(value => { if (live.current && current===generation.current) setSession(value); }).catch(failure => { if (live.current && current===generation.current && !(failure instanceof DOMException && failure.name==="AbortError")) setError((failure as Error).message); });
    return () => { live.current = false;++generation.current;abort.abort(); };
  }, [activate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    const form = event.currentTarget, values = new FormData(form);
    if (activate && !validateOwnerPasswords(form)) return;
    const current=++generation.current;pending.current = true; setBusy(true); setError("");
    try {
      if (activate) {
        await api("/api/client/auth/activate", { method: "POST", body: JSON.stringify({ token: token.current, password: values.get("password") }) });
        if (live.current && current===generation.current) { form.reset(); setDirty(false); setNotice("Your account is activated. Sign in to open your projects."); token.current = ""; setActivated(true); }
      } else {
        const result = await api<Session>("/api/client/auth/login", { method: "POST", body: JSON.stringify({ email: values.get("email"), password: values.get("password") }) });
        clearCsrf(); if (live.current && current===generation.current) { form.reset(); setDirty(false); setSession(result); }
      }
    } catch (failure) { if (live.current && current===generation.current) setError((failure as Error).message); }
    finally { pending.current = false; if (live.current) setBusy(false); }
  }
  if (!activate && session?.authenticated && session.client) return <ClientWorkspace key={`${session.client.workspaceId}:${session.client.id}`} client={session.client} draftMemory={drafts.current} onDraftPresence={setHasDrafts} onExpired={() => { ++generation.current;clearCsrf(); setSession({ authenticated: false }); setError("Your session ended. Sign in to the same account to recover eligible messages retained in this tab."); }} onLogout={() => { ++generation.current;drafts.current=emptyClientDraftMemory();setHasDrafts(false);clearCsrf(); setSession({ authenticated: false }); }} />;
  return <section className="studio-section client-entry"><p className="studio-eyebrow">YOUR CLIENT WORKSPACE</p><h1>{activate ? "Make this account yours." : "Your website, moving forward."}</h1><p>Private project progress and conversations with Crystal Powers. Accounts are issued by the team; client accounts have no staff permissions.</p><OwnerError message={error} />{notice && <p role="status" className="admin-notice">{notice}</p>}
    {hasDrafts && <div className="admin-notice"><p>Unsent project messages remain in this tab. Sign in to the same account; project access is checked before recovery. Refreshing or leaving loses these messages.</p><button className="admin-text-button" disabled={busy} onClick={()=>{if(window.confirm("Discard all retained client messages?")){drafts.current=emptyClientDraftMemory();setHasDrafts(false);}}}>Discard retained messages</button></div>}
    {activated ? <Link className="admin-primary" to="/client">Sign in to your projects</Link> : activate && !token.current ? <p>This invitation is missing. Ask the team for a new private link.</p> : !activate && !session ? <div><p role="status">{error ? "Sign-in could not be opened." : "Opening sign-in…"}</p>{error && <button className="admin-secondary" onClick={() => window.location.reload()}>Try again</button>}</div> : <form className="admin-form" aria-busy={busy} onInput={() => setDirty(true)} onSubmit={event => void submit(event)}><fieldset disabled={busy}>
      {activate ? <><PasswordField label="Choose a password" name="password" fresh /><PasswordField label="Confirm password" confirm="password" /></> : <><label>Email<input type="email" name="email" autoComplete="username" required maxLength={254} /></label><PasswordField label="Password" name="password" /></>}
      <button className="admin-primary">{busy ? "Please wait…" : activate ? "Activate client account" : "Open my projects"}</button>
    </fieldset></form>}
    <p>For a forgotten password or expired invitation, contact the team through your existing project correspondence. An admin can revoke old access and issue a new private invitation.</p><Link to="/contact">Contact Crystal Powers</Link>
  </section>;
}
