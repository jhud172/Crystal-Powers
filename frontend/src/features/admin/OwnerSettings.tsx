import { FormEvent, useState } from "react";
import { api, clearCsrf } from "../portfolio/projectApi";

export function OwnerSettings({ onBack }: { onBack: () => void }) {
  const [action, setAction] = useState("password");
  const [secret, setSecret] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await api<{ secret?: string; recoveryCodes?: string[] }>(`/api/admin/account/${secret ? "authenticator/confirm" : action}`, { method: "POST", body: JSON.stringify(values) });
      if (response.secret) setSecret(response.secret);
      else { setSecret(""); setCodes(response.recoveryCodes ?? []); setComplete(true); clearCsrf(); }
    } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  }
  function downloadCodes() {
    const url = URL.createObjectURL(new Blob(["Crystal Powers recovery codes\nEach works once. Store privately.\n\n" + codes.join("\n")], { type: "text/plain" }));
    const link = document.createElement("a"); link.href = url; link.download = "crystal-powers-recovery-codes.txt"; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="admin-account-settings"><button className="admin-text-button" onClick={() => complete ? window.location.assign("/admin") : onBack()}>← {complete ? "Sign in" : "All projects"}</button><p className="studio-eyebrow">ACCOUNT SECURITY</p><h1>{complete ? "All set." : "Keep your studio safe."}</h1>
    {complete ? <><p className="admin-notice" role="status">Security updated. All previous sign-ins have expired.</p>{codes.length > 0 && <><p>These codes replace every previous recovery code. Save them now; they are shown only once.</p><div className="admin-recovery-codes">{codes.map(code => <code key={code}>{code}</code>)}</div><button className="admin-secondary" onClick={downloadCodes}>Download recovery codes</button><label className="admin-check"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} /> I’ve saved my new recovery codes privately.</label></>}<button className="studio-button" disabled={codes.length > 0 && !saved} onClick={() => window.location.assign("/admin")}>Sign in again ↗</button></> : <>
      {!secret && <div className="studio-device-tabs" role="group" aria-label="Security change">{[["password", "Password"], ["authenticator", "Authenticator"], ["recovery-codes", "Recovery codes"]].map(([value, label]) => <button key={value} aria-pressed={action === value} onClick={() => { setAction(value); setError(""); }}>{label}</button>)}</div>}
      <p className="studio-soft">{secret ? "Add the new key to your authenticator, then enter its code. Your existing authenticator remains active until you confirm." : action === "password" ? "Use your current password and a fresh code to set a new password." : action === "authenticator" ? "Move to a new authenticator with your current password and a fresh code or unused recovery code." : "Generate a new set of recovery codes. Your previous codes will stop working."}</p>
      {secret && <div className="admin-enrolment"><p>Time based · 6 digits · 30 seconds · SHA1</p><code>{secret}</code></div>}
      <form className="admin-form" onSubmit={submit} key={`${action}-${!!secret}`}>
        {!secret && <label>Current password<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>}
        <label>{secret ? "New authenticator code" : "Authenticator or recovery code"}<input name="code" autoComplete="one-time-code" required maxLength={secret ? 6 : 64} /></label>
        {action === "password" && <label>New password<input name="nextPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label>}
        {error && <p className="admin-error" role="alert">{error}</p>}<button className="studio-button" disabled={busy}>{busy ? "Please wait…" : secret ? "Confirm new authenticator ↗" : action === "password" ? "Change password ↗" : action === "authenticator" ? "Set up new authenticator ↗" : "Replace recovery codes ↗"}</button>
      </form>
    </>}
  </section>;
}
