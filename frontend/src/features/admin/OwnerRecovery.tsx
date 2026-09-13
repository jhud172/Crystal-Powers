import { FormEvent, useEffect, useState } from "react";
import { api, clearCsrf } from "../portfolio/projectApi";

export function OwnerRecovery({ onBack }: { onBack: () => void }) {
  // Keep the token in memory and remove it from the address bar immediately.
  const [token] = useState(() => window.location.hash.slice(1));
  useEffect(() => { if (token) window.history.replaceState(null, "", "/admin/reset"); }, [token]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await api<{ message: string }>(`/api/admin/auth/recovery/${token ? "reset" : "request"}`, { method: "POST", body: JSON.stringify(token ? { ...values, token } : values) });
      setMessage(response.message); if (token) { clearCsrf(); setComplete(true); window.history.replaceState(null, "", "/admin/reset"); }
    } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  }
  return <section className="admin-signin"><p className="studio-eyebrow">OWNER STUDIO / ACCOUNT RECOVERY</p><h1>{token ? "A fresh start." : "Forgotten your password?"}</h1><p>{token ? "Choose a new password and verify your authenticator or an unused recovery code. All previous sign-ins will expire." : "Enter your owner email address. You’ll still need your authenticator or an unused recovery code to reset the password."}</p>
    {!complete && <form className="admin-form" onSubmit={submit}>{token ? <><label>New password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label><label>Authenticator or recovery code<input name="code" autoComplete="one-time-code" required maxLength={64} /></label></> : <label>Owner email address<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>}
      {error && <p className="admin-error" role="alert">{error}</p>}<button className="studio-button" disabled={busy}>{busy ? "Please wait…" : token ? "Reset password ↗" : "Send reset link ↗"}</button></form>}
    {message && <p className="admin-notice" role="status">{message}</p>}<button className="admin-text-button" onClick={onBack}>Return to sign-in</button>
  </section>;
}
