import { useEffect, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";

const bands = [
  ["LOW", "0–24%"], ["MEDIUM", "25–74%"], ["HIGH", "75–100%"], ["UNAVAILABLE", "Unavailable"],
] as const;
type Counts = Partial<Record<(typeof bands)[number][0], number>>;
type Totals = { total: number; cpu: Counts; memory: Counts };

export function DocksResearchTotals({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [open, setOpen] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    setTotals(null);
    setError("");
    void api<Totals>("/api/admin/docks/research", { signal: abort.signal }).then(setTotals).catch(failure => {
      if (abort.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : "Could not load research totals.");
      if (failure instanceof ApiError && failure.status === 401) onSessionExpired();
    });
    return () => abort.abort();
  }, [open, onSessionExpired]);

  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Crystal Docks diagnostic research</summary>
    {open && <>
      <OwnerError message={error} />
      {!totals && !error && <p role="status">Loading research totals…</p>}
      {totals?.total === 0 && <p>Totals become available after five accounts contribute within 30 days.</p>}
      {totals && totals.total > 0 && <table>
        <caption>Usage ranges from {totals.total} contributions in the last 30 days</caption>
        <thead><tr><th scope="col">Range</th><th scope="col">Processor</th><th scope="col">Memory</th></tr></thead>
        <tbody>{bands.map(([band, label]) => <tr key={band}>
          <th scope="row">{label}</th><td>{totals.cpu[band] ?? 0}</td><td>{totals.memory[band] ?? 0}</td>
        </tr>)}</tbody>
      </table>}
    </>}
  </details>;
}
