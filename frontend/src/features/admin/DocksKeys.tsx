import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";

const endpoint = "/api/admin/docks/access-keys";
type State = "ACTIVE" | "SUSPENDED" | "REVOKED";
type AccessKey = {
  id: string;
  codeSuffix: string;
  durationDays: number;
  deviceLimit: number;
  state: State;
  accountId: string | null;
  expiresAt: string | null;
};
type Issued = { key: AccessKey; code: string };

export function DocksKeys({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Crystal Docks access keys</summary>
    {open && <KeyControls onSessionExpired={onSessionExpired} />}
  </details>;
}

function KeyControls({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [issued, setIssued] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    void api<AccessKey[]>(endpoint, { signal: abort.signal }).then(setKeys).catch(failure => {
      if (abort.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : "Could not load access keys.");
      if (failure instanceof ApiError && failure.status === 401) onSessionExpired();
    });
    return () => abort.abort();
  }, [onSessionExpired]);

  async function run(action: () => Promise<unknown>) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await action();
      setKeys(await api<AccessKey[]>(endpoint));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The key change could not be confirmed.");
      if (failure instanceof ApiError && failure.status === 401) onSessionExpired();
    } finally { setPending(false); }
  }

  function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void run(async () => {
      const result = await api<Issued>(endpoint, {
        method: "POST",
        body: JSON.stringify({ durationDays: Number(values.get("duration")), deviceLimit: Number(values.get("devices")) }),
      });
      setIssued(result.code);
    });
  }

  function update(key: AccessKey, state: State) {
    if (state === "REVOKED" && !window.confirm(`Permanently revoke key ending in ${key.codeSuffix}?`)) return;
    void run(() => api(`${endpoint}/${key.id}/state`, { method: "POST", body: JSON.stringify({ state }) }));
  }

  function extend(event: FormEvent<HTMLFormElement>, key: AccessKey) {
    event.preventDefault();
    const days = Number(new FormData(event.currentTarget).get("extension"));
    void run(() => api(`${endpoint}/${key.id}/extend`, { method: "POST", body: JSON.stringify({ days }) }));
  }

  return <section aria-label="Crystal Docks access key management" aria-busy={pending}>
    <p>Keys start on first redemption. Only the owner who issues a key sees the full code here.</p>
    <form className="admin-form" onSubmit={issue}>
      <fieldset className="admin-form-fields" disabled={pending || !!issued}>
        <label>Duration in days<input type="number" name="duration" min="1" max="3650" defaultValue="30" required /></label>
        <label>Device limit<select name="devices" defaultValue="1"><option value="1">One device</option><option value="5">Five devices</option></select></label>
        <button className="studio-button">Issue access key</button>
      </fieldset>
    </form>
    {issued && <div role="status" className="admin-notice">
      <p>Copy this code before hiding it. The server will only show its last four characters after this.</p>
      <p><code>{issued}</code></p>
      <button type="button" className="admin-secondary" onClick={() => setIssued("")}>Hide code</button>
    </div>}
    <OwnerError message={error} />
    <ul>{keys.map(key => <li key={key.id}>
      <p><strong>Key ending {key.codeSuffix}</strong> · {key.state.toLowerCase()} · {key.deviceLimit} {key.deviceLimit === 1 ? "device" : "devices"} · {key.expiresAt ? `Ends ${new Date(key.expiresAt).toLocaleString("en-GB")}` : `${key.durationDays} days after redemption`}</p>
      {key.state !== "REVOKED" && <>
        <button type="button" className="admin-secondary" disabled={pending} onClick={() => update(key, key.state === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>{key.state === "ACTIVE" ? "Suspend" : "Reactivate"}</button>{" "}
        <button type="button" className="admin-secondary" disabled={pending} onClick={() => update(key, "REVOKED")}>Revoke</button>
        <form onSubmit={event => extend(event, key)}>
          <label>Extra days for key ending {key.codeSuffix}<input type="number" name="extension" min="1" max="3650" defaultValue="30" required disabled={pending} /></label>{" "}
          <button className="admin-secondary" disabled={pending}>Extend</button>
        </form>
      </>}
    </li>)}</ul>
  </section>;
}
