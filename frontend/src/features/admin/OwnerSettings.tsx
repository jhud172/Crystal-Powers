import { FormEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { api, ApiError, clearCsrf } from "../portfolio/projectApi";
import { PasswordField, validateOwnerPasswords } from "./PasswordField";
import { OwnerError } from "./OwnerError";
import { AuthenticatorCode } from "./AuthenticatorCode";
import { AuthenticatorKey } from "./AuthenticatorKey";
import { useRecoveryCodeExitGuard } from "./useRecoveryCodeExitGuard";

const changes = [{ value: "password", label: "Password", detail: "Choose a new sign-in password.", title: "Change your password." }, { value: "authenticator", label: "Authenticator", detail: "Move to a different authenticator.", title: "Move to a new authenticator." }, { value: "recovery-codes", label: "Recovery codes", detail: "Replace the one-time backup codes.", title: "Replace your recovery codes." }] as const;

export function OwnerSettings({ onBack, onSessionExpired, reauthenticationVersion }: { onBack: () => void; onSessionExpired: () => void; reauthenticationVersion: number }) {
  const [action, setAction] = useState("password");
  const [secret, setSecret] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const section = useRef<HTMLHeadingElement>(null);
  const previous = useRef({ action, secret: false, reauthenticationVersion });
  useRecoveryCodeExitGuard(complete && codes.length > 0 && !saved);
  useEffect(() => { heading.current?.focus(); }, [complete]);
  useLayoutEffect(() => {
    if (previous.current.action !== action || (previous.current.secret && !secret)) { section.current?.focus(); section.current?.scrollIntoView({ block: "center", behavior: "instant" }); }
    previous.current.action = action; previous.current.secret = !!secret;
  }, [action, secret]);
  useEffect(() => {
    if (previous.current.reauthenticationVersion !== reauthenticationVersion) { setError(""); setNotice("Signed in again. Review your security change and retry it yourself. An unfinished authenticator setup may need to be started again."); previous.current.reauthenticationVersion = reauthenticationVersion; }
  }, [reauthenticationVersion]);
  async function fail(failure: unknown) {
    setError((failure as Error).message);
    if (failure instanceof ApiError && failure.status === 401) {
      try { if (!(await api<{ authenticated: boolean }>("/api/admin/auth/session")).authenticated) onSessionExpired(); } catch { /* Keep the original failure and correction form. */ }
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !validateOwnerPasswords(event.currentTarget)) return; setBusy(true); setError(""); setNotice("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await api<{ secret?: string; recoveryCodes?: string[] }>(`/api/admin/account/${secret ? "authenticator/confirm" : action}`, { method: "POST", body: JSON.stringify(values) });
      if (response.secret) setSecret(response.secret);
      else { setSecret(""); setCodes(response.recoveryCodes ?? []); setComplete(true); clearCsrf(); }
    } catch (failure) { await fail(failure); } finally { setBusy(false); }
  }
  async function cancelSetup() {
    if (busy) return; setBusy(true); setError("");
    try { await api("/api/admin/account/authenticator/cancel", { method: "POST" }); setSecret(""); setNotice("New authenticator setup cancelled. Your existing authenticator is still active."); }
    catch (failure) { await fail(failure); } finally { setBusy(false); }
  }
  function downloadCodes() {
    const url = URL.createObjectURL(new Blob(["Crystal Powers recovery codes\nEach works once. Store privately.\n\n" + codes.join("\n")], { type: "text/plain" }));
    const link = document.createElement("a"); link.href = url; link.download = "crystal-powers-recovery-codes.txt"; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="admin-account-settings"><button className="admin-text-button" disabled={busy || (complete && codes.length > 0 && !saved)} onClick={() => complete ? window.location.assign("/admin") : onBack()}>← {complete ? "Sign in" : "All projects"}</button><p className="studio-eyebrow">ACCOUNT SECURITY</p><h1 ref={heading} tabIndex={-1}>{complete ? action === "password" ? "Password updated." : action === "authenticator" ? "Authenticator updated." : "Recovery codes replaced." : "Keep your studio safe."}</h1>
    {complete ? <><p className="admin-notice" role="status">Security updated. All previous sign-ins have expired.</p>{codes.length > 0 && <><p>These codes replace every previous recovery code. Save them now; they are shown only once.</p><div className="admin-recovery-codes">{codes.map(code => <code key={code}>{code}</code>)}</div><button className="admin-secondary" onClick={downloadCodes}>Download recovery codes</button><label className="admin-check"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} /> I’ve saved my new recovery codes privately.</label></>}<button className="studio-button" disabled={codes.length > 0 && !saved} onClick={() => window.location.assign("/admin")}>Sign in again ↗</button></> : <>
      {!secret && <><p className="studio-soft">Choose what to change. A confirmed change expires all previous sign-ins; new recovery codes replace the old set.</p><div className="admin-security-choices" role="group" aria-label="Security change">{changes.map(({ value, label, detail }) => <button aria-label={label} disabled={busy} key={value} aria-pressed={action === value} onClick={() => { setAction(value); setError(""); setNotice(""); }}><strong>{label}</strong><span>{detail}</span></button>)}</div></>}
      <section aria-labelledby={`${id}-section`}><h2 id={`${id}-section`} ref={section} tabIndex={-1}>{secret ? "Confirm your new authenticator." : changes.find(item => item.value === action)!.title}</h2>
      <p className="studio-soft">{secret ? "Add the new key to your authenticator, then enter its code. Your existing authenticator remains active until you confirm." : action === "password" ? "Use your current password and a fresh code to set a new password." : action === "authenticator" ? "Move to a new authenticator with your current password and a fresh code or unused recovery code." : "Generate a new set of recovery codes. Your previous codes will stop working."}</p>
      {notice && <p className="admin-notice" role="status">{notice}</p>}{secret && <><AuthenticatorKey secret={secret} busy={busy} /><p className="studio-soft">This pending setup expires after five minutes. You can cancel it without changing your existing authenticator.</p></>}
      <form className="admin-form" aria-busy={busy} onSubmit={submit} key={`${action}-${!!secret}`}><fieldset className="admin-form-fields" disabled={busy}>
        {!secret && <PasswordField label="Current password" name="password" />}
        <AuthenticatorCode label={secret ? "New authenticator code" : "Authenticator or recovery code"} newAuthenticator={!!secret} />
        {action === "password" && <><PasswordField label="New password" name="nextPassword" fresh /><PasswordField label="Confirm new password" confirm="nextPassword" /></>}
        <OwnerError message={error} /><button className="studio-button" disabled={busy}>{busy ? "Please wait…" : secret ? "Confirm new authenticator ↗" : action === "password" ? "Change password ↗" : action === "authenticator" ? "Set up new authenticator ↗" : "Replace recovery codes ↗"}</button>
      </fieldset></form>{secret && <button className="admin-text-button" disabled={busy} onClick={() => void cancelSetup()}>Cancel new authenticator setup</button>}</section>
    </>}
  </section>;
}
