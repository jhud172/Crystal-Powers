import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";

type SupportView = {
  expiresAt: string;
  reports: { deviceLabel: string; checkedAt: string; cpuPercent: number | null; memoryPercent: number | null }[];
};

export function DocksReportSupport({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Crystal Docks support reports</summary>
    {open && <SupportLookup onSessionExpired={onSessionExpired} />}
  </details>;
}

function SupportLookup({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<SupportView | null>(null);

  useEffect(() => {
    if (!view) return;
    const timeout = window.setTimeout(() => setView(null), Math.max(0, Date.parse(view.expiresAt) - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [view]);

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const reference = String(new FormData(form).get("reference") ?? "").trim();
    setBusy(true);
    setError("");
    setView(null);
    try {
      const result = await api<SupportView>("/api/admin/docks/support-reports", {
        method: "POST", body: JSON.stringify({ reference }),
      });
      setView(result);
      form.reset();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not open the shared summaries.");
      if (failure instanceof ApiError && failure.status === 401) onSessionExpired();
    } finally { setBusy(false); }
  }

  return <section aria-label="Read Crystal Docks support reports" aria-busy={busy}>
    <p>Enter the reference provided by the customer. Opening the summaries is recorded in their support activity.</p>
    <form className="admin-form" onSubmit={open}>
      <label>Customer support reference<input name="reference" maxLength={36} required autoComplete="off"
        pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" /></label>
      <button className="studio-button" disabled={busy}>Open shared summaries</button>
    </form>
    <OwnerError message={error} />
    {view && <>
      <p role="status">Access expires at {new Date(view.expiresAt).toLocaleString("en-GB")}.</p>
      <ul>{view.reports.map((report, index) => <li key={report.checkedAt + index}>
        <strong>{report.deviceLabel}</strong>{" "}
        <time dateTime={report.checkedAt}>{new Date(report.checkedAt).toLocaleString("en-GB")}</time>
        <p>CPU {report.cpuPercent === null ? "unavailable" : report.cpuPercent + "%"} ·
          Memory {report.memoryPercent === null ? "unavailable" : report.memoryPercent + "%"}</p>
      </li>)}</ul>
      <button type="button" className="admin-secondary" onClick={() => setView(null)}>Close summaries</button>
    </>}
  </section>;
}
