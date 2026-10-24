import { useEffect, useRef, useState } from "react";

/** Explicit, user-triggered clipboard access; never copies private tokens implicitly. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [busy, setBusy] = useState(false);
  const live = useRef(true);
  const request = useRef(0);
  useEffect(() => { live.current = true; return () => { live.current = false; ++request.current; }; }, []);
  useEffect(() => { ++request.current; setStatus("idle"); setBusy(false); }, [value]);
  async function copy() {
    const generation = ++request.current;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(value);
      if (live.current && request.current === generation) setStatus("copied");
    } catch {
      if (live.current && request.current === generation) setStatus("failed");
    } finally {
      if (live.current && request.current === generation) setBusy(false);
    }
  }
  return <div className="copy-control"><button type="button" className="copy-button" disabled={busy} onClick={() => void copy()}><span aria-hidden="true">{status === "copied" ? "✓" : "⧉"}</span>{label}</button><span className="copy-status" role="status">{status === "copied" ? "Copied." : status === "failed" ? "Clipboard unavailable. Select and copy the text below." : ""}</span>{status === "failed" && <textarea aria-label={`${label} manually`} readOnly value={value} rows={3} onFocus={event => event.currentTarget.select()} />}</div>;
}
