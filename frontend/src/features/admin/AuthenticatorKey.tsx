import { useEffect, useRef, useState } from "react";

export function AuthenticatorKey({ secret, busy = false }: { secret: string; busy?: boolean }) {
  const [message, setMessage] = useState("");
  const live = useRef(true);
  useEffect(() => { setMessage(""); }, [secret]);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(secret); if (live.current) setMessage("Setup key copied. Keep your clipboard private and clear it when you have finished."); }
    catch { if (live.current) setMessage("The key couldn’t be copied. Select it above and copy it manually."); }
  }
  return <div className="admin-enrolment"><p>In your authenticator, choose <strong>Enter a setup key</strong>.</p><dl><dt>Account</dt><dd>Crystal Powers</dd><dt>Key type</dt><dd>Time based · 6 digits · 30 seconds · SHA1</dd><dt>Setup key</dt><dd><code>{secret}</code></dd></dl><button type="button" className="admin-secondary" disabled={busy} onClick={() => void copy()}>Copy authenticator setup key</button>{message && <p role="status">{message}</p>}</div>;
}
