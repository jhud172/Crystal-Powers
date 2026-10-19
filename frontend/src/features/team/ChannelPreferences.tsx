import { useEffect, useRef, useState } from "react";
import { useNavigationProtection } from "../../app/NavigationProtection";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";

export type ChannelPreference = { channelId: string; unreadBadges: boolean; mentionAlerts: boolean; favourite: boolean; version: number };
export function ChannelPreferences({ channelId, disabled, onSaved, onExpired, onDirty, onBusy }: {
  channelId: string; disabled: boolean; onSaved: (value: ChannelPreference) => void;
  onExpired: () => void; onDirty: (value: boolean) => void; onBusy: (value: boolean) => void;
}) {
  const [open, setOpen] = useState(false), [saved, setSaved] = useState<ChannelPreference | null>(null), [draft, setDraft] = useState<ChannelPreference | null>(null);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const live = useRef(true), pending = useRef(false), generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const callbacks = useRef({ onDirty, onBusy }); callbacks.current = { onDirty, onBusy };
  const dirty = !!saved && !!draft && (saved.unreadBadges !== draft.unreadBadges || saved.mentionAlerts !== draft.mentionAlerts || saved.favourite !== draft.favourite);
  useNavigationProtection(dirty || busy, "Leave this channel and discard unsaved preferences or an unconfirmed save?");
  useEffect(() => { callbacks.current.onDirty(dirty); return () => callbacks.current.onDirty(false); }, [dirty]);
  useEffect(() => { callbacks.current.onBusy(busy); return () => callbacks.current.onBusy(false); }, [busy]);
  function fail(failure: unknown) { if (live.current) { setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) onExpired(); } }
  async function load() {
    request.current?.abort();
    const abort = new AbortController(); request.current = abort;
    const current = ++generation.current; setLoading(true);
    try { const result = await api<ChannelPreference>(`/api/team/settings/channels/${channelId}`, { signal: abort.signal }); if (live.current && current === generation.current) { setSaved(result); setDraft(result); setError(""); onSaved(result); } }
    catch (failure) { if (current === generation.current && !(failure instanceof DOMException && failure.name === "AbortError")) fail(failure); }
    finally { if (live.current && current === generation.current) setLoading(false); if (request.current === abort) request.current = null; }
  }
  useEffect(() => { live.current = true; return () => { live.current = false; request.current?.abort(); ++generation.current; }; }, []);
  useEffect(() => {
    if (!open) { request.current?.abort(); ++generation.current; setLoading(false); return; }
    if (!saved) void load();
  }, [open]);
  async function save() {
    if (pending.current || disabled || !draft || !saved) return;
    pending.current = true; setBusy(true); setError(""); setNotice(""); ++generation.current;
    try { const result = await api<ChannelPreference>(`/api/team/settings/channels/${channelId}`, { method: "PATCH", body: JSON.stringify({ expectedVersion: saved.version, unreadBadges: draft.unreadBadges, mentionAlerts: draft.mentionAlerts, favourite: draft.favourite }) }); if (live.current) { setSaved(result); setDraft(result); onSaved(result); setNotice("Channel preferences saved. Mention choices apply to future messages."); } }
    catch (failure) { fail(failure); } finally { pending.current = false; if (live.current) setBusy(false); }
  }
  const locked = disabled || busy || loading;
  return <details className="team-channel-preferences" onToggle={event => { if (event.target === event.currentTarget) setOpen(event.currentTarget.open); }}><summary>Your channel preferences</summary><OwnerError message={error} /><p role="status">{loading ? "Loading preferences…" : notice}</p>
    {draft && <form className="admin-form" onSubmit={event => { event.preventDefault(); void save(); }}><fieldset className="team-role-permissions" disabled={locked}><legend>Only your account</legend>
      <label><input type="checkbox" checked={draft.favourite} onChange={event => setDraft(current => current && ({ ...current, favourite: event.target.checked }))} />Favourite this channel</label>
      <label><input type="checkbox" checked={draft.unreadBadges} onChange={event => setDraft(current => current && ({ ...current, unreadBadges: event.target.checked }))} />Show unread counts here</label>
      <label><input type="checkbox" checked={draft.mentionAlerts} onChange={event => setDraft(current => current && ({ ...current, mentionAlerts: event.target.checked }))} />Receive new mentions here</label>
    </fieldset><button className="admin-secondary" disabled={locked || !dirty}>Save channel preferences</button></form>}
    <p>Favourites appear first within their category. Account-wide settings still apply: a channel cannot enable counts or mentions that you disabled for the whole workspace. Hiding counts does not mark anything read; existing mentions stay in your inbox.</p>
    <button className="admin-text-button" disabled={locked} onClick={() => { if (!dirty || window.confirm("Discard unsaved channel preferences and reload?")) { setNotice(""); void load(); } }}>Reload channel preferences</button>
  </details>;
}
