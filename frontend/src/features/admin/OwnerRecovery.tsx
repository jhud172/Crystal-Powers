import { FormEvent, useEffect, useRef, useState } from "react";
import { api, ApiError, clearCsrf } from "../portfolio/projectApi";
import { PasswordField, validateOwnerPasswords } from "./PasswordField";
import { OwnerError } from "./OwnerError";
import { AuthenticatorCode } from "./AuthenticatorCode";

export function OwnerRecovery({ onBack, onBusyChange }: { onBack: () => void; onBusyChange?: (busy: boolean) => void }) {
  // Keep the token in memory and remove it from the address bar immediately.
  const [token, setToken] = useState(() => window.location.hash.slice(1));
  useEffect(() => { if (token) window.history.replaceState(window.history.state, "", "/admin/reset"); }, [token]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { onBusyChange?.(false); }, [onBusyChange]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [sent, setSent] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [email, setEmail] = useState("");
  const [resetVersion, setResetVersion] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const receiveLink = () => {
      const nextToken = window.location.hash.slice(1);
      if (!nextToken) return;
      setToken(nextToken); setResetVersion(value => value + 1); setComplete(false); setSent(false); setInvalid(false); setMessage(""); setError("");
    };
    window.addEventListener("hashchange", receiveLink);
    return () => window.removeEventListener("hashchange", receiveLink);
  }, []);
  useEffect(() => { if (complete || sent || invalid) heading.current?.focus(); }, [complete, sent, invalid]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !validateOwnerPasswords(event.currentTarget)) return; setBusy(true); setError(""); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await api<{ message: string }>(`/api/admin/auth/recovery/${token ? "reset" : "request"}`, { method: "POST", body: JSON.stringify(token ? { ...values, token } : values) });
      setMessage(response.message); if (token) { clearCsrf(); setComplete(true); setToken(""); window.history.replaceState(window.history.state, "", "/admin/reset"); } else setSent(true);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 400 && failure.message.startsWith("This reset link")) { setInvalid(true); setToken(""); setError(""); }
      else setError((failure as Error).message);
    } finally { setBusy(false); }
  }
  return <section className="admin-signin"><p className="studio-eyebrow">OWNER STUDIO / ACCOUNT RECOVERY</p><h1 ref={heading} tabIndex={-1}>{complete ? "Password updated." : invalid ? "This link can’t be used." : sent ? "Check your inbox." : token ? "A fresh start." : "Forgotten your password?"}</h1><p>{complete ? "Sign in again with your new password and authenticator or an unused recovery code." : invalid ? "The reset link is invalid, expired or already used. Request a fresh link; your password has not been changed by this attempt." : sent ? "If a reset email arrives, its link works once and expires after 15 minutes. You will also need your authenticator or an unused recovery code." : token ? "Choose a new password and verify your authenticator or an unused recovery code. All previous sign-ins will expire." : "Enter your owner email address. You’ll still need your authenticator or an unused recovery code to reset the password."}</p>
    {!complete && !sent && !invalid && <form key={`${!!token}-${resetVersion}`} className="admin-form" aria-busy={busy} onSubmit={submit}><fieldset className="admin-form-fields" disabled={busy}>{token ? <><PasswordField label="New password" name="password" fresh /><PasswordField label="Confirm new password" confirm="password" /><AuthenticatorCode /></> : <label>Owner email address<input name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>}
      <OwnerError message={error} /><button className="studio-button" disabled={busy}>{busy ? "Please wait…" : token ? "Reset password ↗" : "Send reset link ↗"}</button></fieldset></form>}
    {message && <p className="admin-notice" role="status">{message}</p>}{(sent || invalid) && <button className="admin-secondary" disabled={busy} onClick={() => { setSent(false); setInvalid(false); setMessage(""); setError(""); }}>{invalid ? "Request a fresh link" : "Use another email address"}</button>}<button className="admin-text-button" disabled={busy} onClick={onBack}>Return to sign-in</button>
  </section>;
}
