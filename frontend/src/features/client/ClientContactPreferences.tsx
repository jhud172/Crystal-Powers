import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";

type Preference = "PORTAL_ONLY" | "PORTAL_AND_EMAIL";
type Snapshot = { clientId: string; workspaceId: string; contactPreference: Preference; version: number };
type Props = { clientId: string; workspaceId: string; ready: boolean; disabled: boolean; onBusy: (busy: boolean) => void; onDirty: (dirty: boolean) => void; onExpired: () => void };

export function ClientContactPreferences({ clientId, workspaceId, ready, disabled, onBusy, onDirty, onExpired }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [choice, setChoice] = useState<Preference>("PORTAL_AND_EMAIL");
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [reloadRequired, setReloadRequired] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [revision, setRevision] = useState(0);
  const live = useRef(false), pending = useRef(false), generation = useRef(0);
  const dirty = !!snapshot && choice !== snapshot.contactPreference;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; ++generation.current; onDirty(false); };
  }, [clientId, workspaceId, onDirty]);
  function verify(value: Snapshot) {
    if (value.clientId !== clientId || value.workspaceId !== workspaceId) throw new ApiError(401, "Confirm your client account before changing contact preferences.");
    if (!["PORTAL_ONLY", "PORTAL_AND_EMAIL"].includes(value.contactPreference) || !Number.isInteger(value.version) || value.version < 0) throw new ApiError(503, "Contact preferences could not be read. Please reload them.");
    return value;
  }
  function fail(failure: unknown) {
    setError(failure instanceof Error ? failure.message : "Contact preferences could not be confirmed.");
    if (failure instanceof ApiError && failure.status === 401) onExpired();
  }
  useEffect(() => {
    const current = ++generation.current, abort = new AbortController();
    setSnapshot(null); setNotice(""); setError("");
    if (!ready) { setLoading(false); return; }
    setLoading(true);
    void api<Snapshot>("/api/client/auth/preferences", { signal: abort.signal }).then(value => {
      if (!live.current || current !== generation.current) return;
      const checked = verify(value); setSnapshot(checked); setChoice(checked.contactPreference); setReloadRequired(false);
    }).catch(failure => {
      if (live.current && current === generation.current && !(failure instanceof DOMException && failure.name === "AbortError")) fail(failure);
    }).finally(() => { if (live.current && current === generation.current) setLoading(false); });
    return () => { abort.abort(); };
  }, [clientId, workspaceId, ready, revision]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot || !ready || disabled || pending.current || reloadRequired || !dirty) return;
    pending.current = true; setSaving(true); onBusy(true); setError(""); setNotice("");
    const current = generation.current;
    try {
      const value = verify(await api<Snapshot>("/api/client/auth/preferences", { method: "PATCH", body: JSON.stringify({ version: snapshot.version, contactPreference: choice }) }));
      if (live.current && current === generation.current) { setSnapshot(value); setChoice(value.contactPreference); setNotice("Your support contact preference is saved."); }
    } catch (failure) {
      if (live.current && current === generation.current) { setReloadRequired(true); fail(failure); }
    } finally {
      pending.current = false;
      if (live.current) { setSaving(false); onBusy(false); }
    }
  }
  return <section className="support-request-detail" aria-labelledby="client-contact-preferences"><h2 id="client-contact-preferences">Support contact preferences</h2>
    <p>This choice applies to support updates across your linked projects. Email updates are sent when the team chooses to send one; they are not automatic notifications.</p>
    <p>Portal-only keeps future support updates in your client workspace. Emails already claimed for delivery may still arrive. Account invitations, security messages and billing communications use separate settings.</p>
    <OwnerError message={error} />{notice && <p role="status" className="admin-notice">{notice}</p>}{loading && <p role="status">Loading contact preferences…</p>}
    {snapshot && <form className="admin-form" onSubmit={event => void save(event)}><fieldset disabled={disabled || saving || loading || !ready || reloadRequired}><legend>How should the team contact you about project updates?</legend>
      <label><input type="radio" name="clientContactPreference" checked={choice === "PORTAL_ONLY"} onChange={() => setChoice("PORTAL_ONLY")} />Portal only</label>
      <label><input type="radio" name="clientContactPreference" checked={choice === "PORTAL_AND_EMAIL"} onChange={() => setChoice("PORTAL_AND_EMAIL")} />Portal and email</label>
      <button className="admin-primary" disabled={!dirty}>{saving ? "Saving preference…" : "Save contact preference"}</button>
    </fieldset></form>}
    <button className="admin-secondary" disabled={disabled || saving || loading || !ready} onClick={() => { if (dirty && !window.confirm("Reload your saved contact preference and discard this unsaved choice?")) return; setRevision(value => value + 1); }}>Reload saved preference</button>
    {reloadRequired && <p>Saving was not confirmed. Reload the saved preference before making another change.</p>}
  </section>;
}
