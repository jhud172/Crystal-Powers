import { useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";

export function AuthenticatorKey({ secret, busy = false }: { secret: string; busy?: boolean }) {
  const [message, setMessage] = useState("");
  const live = useRef(true);
  const qr = useMemo(() => {
    // Keep the secret in this private component: no remote images, URL navigation or storage.
    if (!/^[A-Z2-7]{16,128}$/.test(secret)) return null;
    try {
      const uri = `otpauth://totp/Crystal%20Powers?secret=${encodeURIComponent(secret)}&issuer=Crystal%20Powers&algorithm=SHA1&digits=6&period=30`;
      const code = qrcode(0, "M");
      code.addData(uri, "Byte");
      code.make();
      const count = code.getModuleCount();
      const modules: string[] = [];
      // Four modules of quiet space on every side are required for reliable scanning.
      for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
        if (code.isDark(row, col)) modules.push(`M${col + 4},${row + 4}h1v1h-1z`);
      }
      return { size: count + 8, path: modules.join("") };
    } catch {
      return null; // Manual enrolment remains available if QR generation fails.
    }
  }, [secret]);
  useEffect(() => { setMessage(""); }, [secret]);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(secret); if (live.current) setMessage("Setup key copied. Keep your clipboard private and clear it when you have finished."); }
    catch { if (live.current) setMessage("The key couldn’t be copied. Select it above and copy it manually."); }
  }
  return <div className="admin-enrolment">
    {qr ? <><p>In your authenticator app, choose <strong>Scan a QR code</strong> and scan this code.</p><svg className="admin-authenticator-qr" role="img" aria-label="Scan this QR code with your authenticator app to add Crystal Powers" viewBox={`0 0 ${qr.size} ${qr.size}`} width="256" height="256" shapeRendering="crispEdges"><rect width={qr.size} height={qr.size} fill="#fff" /><path d={qr.path} fill="#000" /></svg><p className="admin-qr-note">This code is generated on your device. Keep it private, just like your setup key.</p></> : <p>The QR code is unavailable. You can still add the account using the setup key below.</p>}
    <p>Can’t scan? Choose <strong>Enter a setup key</strong> instead.</p><dl><dt>Account</dt><dd>Crystal Powers</dd><dt>Key type</dt><dd>Time based · 6 digits · 30 seconds · SHA1</dd><dt>Setup key</dt><dd><code>{secret}</code></dd></dl><button type="button" className="admin-secondary" disabled={busy} onClick={() => void copy()}>Copy authenticator setup key</button>{message && <p role="status">{message}</p>}</div>;
}
