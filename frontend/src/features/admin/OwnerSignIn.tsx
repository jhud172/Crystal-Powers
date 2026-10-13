import { FormEvent, useEffect, useState } from "react";
import { api, clearCsrf } from "../portfolio/projectApi";
import { PasswordField, validateOwnerPasswords } from "./PasswordField";
import { OwnerError } from "./OwnerError";
import { CrystalMark } from "../../app/Layout";
import { OwnerRecovery } from "./OwnerRecovery";
import { AuthenticatorCode } from "./AuthenticatorCode";
import { AuthenticatorKey } from "./AuthenticatorKey";
import { useRecoveryCodeExitGuard } from "./useRecoveryCodeExitGuard";

export type OwnerSession = { authenticated: boolean; email?: string; mfaRequired: boolean; enrolmentRequired: boolean; setupAvailable: boolean };
export function OwnerSignIn({ initial, onSignedIn, onBusyChange }: { initial: OwnerSession; onSignedIn: (session: OwnerSession) => void; onBusyChange?: (busy: boolean) => void }) {
  const [session, setSession] = useState(initial);
  const [setup, setSetup] = useState(false);
  const [secret, setSecret] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useRecoveryCodeExitGuard(codes.length > 0 && !saved);
  const [recovery, setRecovery] = useState(window.location.pathname === "/admin/reset");
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { onBusyChange?.(false); }, [onBusyChange]);
  useEffect(() => {
    let live = true;
    if (session.enrolmentRequired) void api<{ secret: string }>("/api/admin/auth/enrolment").then(value => { if (live) setSecret(value.secret); }).catch(error => { if (live) setError(error.message); });
    return () => { live = false; };
  }, [session.enrolmentRequired]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !validateOwnerPasswords(event.currentTarget)) return; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (session.mfaRequired) {
        const verified = await api<{ recoveryCodes: string[] }>("/api/admin/auth/verify", { method: "POST", body: JSON.stringify({ code: form.get("code") }) });
        clearCsrf(); setSecret("");
        const current = await api<OwnerSession>("/api/admin/auth/session");
        if (verified.recoveryCodes.length) { setSession(current); setCodes(verified.recoveryCodes); }
        else onSignedIn(current);
      } else {
        await api(`/api/admin/auth/${setup ? "setup" : "login"}`, { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
        clearCsrf(); setSession(await api<OwnerSession>("/api/admin/auth/session"));
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Sign-in could not be completed."); }
    finally { setBusy(false); }
  }
  function downloadCodes() {
    const url = URL.createObjectURL(new Blob(["Crystal Powers recovery codes\nEach code works once. Store privately, separately from your password.\n\n" + codes.join("\n")], { type: "text/plain" }));
    const link = document.createElement("a"); link.href = url; link.download = "crystal-powers-recovery-codes.txt"; link.click(); URL.revokeObjectURL(url);
  }
  if (recovery) return <OwnerRecovery onBusyChange={onBusyChange} onBack={() => { window.history.replaceState(window.history.state, "", "/admin"); setRecovery(false); }} />;
  return <section className="admin-signin" aria-labelledby="owner-heading"><p className="studio-eyebrow">CRYSTAL POWERS / OWNER STUDIO</p>
    <div className="owner-entry-mark" aria-hidden="true"><CrystalMark /></div><h1 id="owner-heading">{codes.length ? "Keep these safe." : session.mfaRequired ? "One more step." : setup ? "Make it yours." : "Welcome back."}</h1>
    {(setup || session.enrolmentRequired || codes.length > 0) && <ol className="owner-steps" aria-label="Owner setup progress">{["Account", "Authenticator", "Recovery codes", "Studio"].map((label, index) => <li key={label} aria-current={index === (codes.length ? 2 : session.mfaRequired ? 1 : 0) ? "step" : undefined}><span aria-hidden="true">0{index + 1}</span>{label}</li>)}</ol>}
    {codes.length ? <><p>These recovery codes are shown once. Each can replace an authenticator code once if you lose your device.</p><div className="admin-recovery-codes">{codes.map(code => <code key={code}>{code}</code>)}</div><button type="button" className="admin-secondary" onClick={downloadCodes}>Download recovery codes</button><label className="admin-check"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} /> I’ve stored my recovery codes somewhere private.</label><button className="studio-button" disabled={!saved} onClick={() => { setCodes([]); onSignedIn(session); }}>Open the studio ↗</button></> : <>
      <p>{session.mfaRequired ? session.enrolmentRequired ? "Add this account to your authenticator app, then enter its six-digit code." : "Enter a fresh authenticator code or one of your unused recovery codes." : "A private space to shape, preview and publish your projects."}</p>
      {secret && <AuthenticatorKey secret={secret} busy={busy} />}
      <form className="admin-form" aria-busy={busy} onSubmit={submit} key={`${setup}-${session.mfaRequired}`}><fieldset className="admin-form-fields" disabled={busy}>
        {session.mfaRequired ? <AuthenticatorCode autoFocus /> : <>
          {setup && <label>Owner setup token<input name="token" type="password" autoComplete="off" required minLength={32} maxLength={256} /><small>Use the private token configured on your server.</small></label>}
          <label>Email address<input type="email" name="email" autoComplete="username" required maxLength={254} /></label>
          <PasswordField label="Password" name="password" fresh={setup} />{setup && <PasswordField label="Confirm password" confirm="password" />}
        </>}
        <OwnerError message={error} />
        <button className="studio-button" disabled={busy}>{busy ? "Please wait…" : session.mfaRequired ? "Verify and continue ↗" : setup ? "Create owner account ↗" : "Sign in ↗"}</button>
      </fieldset></form>
      {!session.mfaRequired && session.setupAvailable && <button className="admin-text-button" disabled={busy} onClick={() => { setSetup(!setup); setError(""); }}>{setup ? "Already have an account? Sign in" : "First time here? Set up your owner account"}</button>}
      {!session.mfaRequired && !setup && <button className="admin-text-button" disabled={busy} onClick={() => setRecovery(true)}>Forgotten your password?</button>}
      {session.mfaRequired && <button className="admin-text-button" disabled={busy} onClick={async () => { if (busy) return; setBusy(true); setError(""); try { await api("/api/admin/auth/logout", { method: "POST" }); clearCsrf(); setSecret(""); setSession(await api("/api/admin/auth/session")); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); } }}>Return to sign-in</button>}
    </>}
  </section>;
}
