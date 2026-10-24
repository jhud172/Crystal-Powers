import { SaveIndicator } from "../../components/SaveIndicator";
import { useEffect, useRef, useState } from "react";
import { useNavigationProtection } from "../../app/NavigationProtection";
import { api, ApiError } from "../portfolio/projectApi";
import { TeamAccountSecurity } from "./TeamAccountSecurity";
import { Link } from "react-router-dom";
import { OwnerError } from "../admin/OwnerError";
import type { ChannelPreference } from "./ChannelPreferences";

export type TeamSettingsView = {
  branding: { name: string; tagline: string; version: number };
  preferences: { compact: boolean; unreadBadges: boolean; mentionAlerts: boolean; version: number };
  displayName: string; editableName: boolean;
  channelPreferences: ChannelPreference[];
};
export function TeamSettings({ initial, canManage, onBack, onSaved, onExpired, onDirty, onBusy, onSecurityChanged }: {
  initial: TeamSettingsView; canManage: boolean; onBack: () => void; onSaved: (settings: TeamSettingsView) => void;
  onExpired: () => void; onSecurityChanged: (message:string)=>void; onDirty: (value: boolean) => void; onBusy: (value: boolean) => void;
}) {
  const [saved, setSaved] = useState(initial);
  const [name, setName] = useState(initial.branding.name), [tagline, setTagline] = useState(initial.branding.tagline);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [securityDirty,setSecurityDirty]=useState(false),[securityBusy,setSecurityBusy]=useState(false);
  const locked=busy || securityBusy;
  const heading = useRef<HTMLHeadingElement>(null);
  const live = useRef(true), pending = useRef(false);
  const callbacks = useRef({ onDirty, onBusy }); callbacks.current = { onDirty, onBusy };
  const brandDirty = name !== saved.branding.name || tagline !== saved.branding.tagline;
  const personalDirty = displayName !== saved.displayName || preferences.compact !== saved.preferences.compact || preferences.unreadBadges !== saved.preferences.unreadBadges || preferences.mentionAlerts !== saved.preferences.mentionAlerts;
  const dirty = brandDirty || personalDirty || securityDirty;
  useNavigationProtection(dirty || locked, "Leave settings? Unsaved changes or an unconfirmed save may be lost.");
  useEffect(() => { callbacks.current.onDirty(dirty); return () => callbacks.current.onDirty(false); }, [dirty]);
  useEffect(() => { callbacks.current.onBusy(locked); return () => callbacks.current.onBusy(false); }, [locked]);
  useEffect(() => { live.current = true; heading.current?.focus(); return () => { live.current = false; }; }, []);
  function fail(failure: unknown) { if (live.current) { setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) onExpired(); } }
  async function save(section: "workspace" | "personal") {
    if (pending.current || securityBusy) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    const body = section === "workspace" ? { name, tagline, expectedVersion: saved.branding.version } : { displayName, compact: preferences.compact, unreadBadges: preferences.unreadBadges, mentionAlerts: preferences.mentionAlerts, expectedVersion: saved.preferences.version };
    try {
      const result = await api<TeamSettingsView>(`/api/team/settings/${section}`, { method: "PATCH", body: JSON.stringify(body) });
      if (live.current) {
        // Saving one form preserves unsaved input in the other.
        setSaved(current => section === "workspace" ? { ...current, branding: result.branding } : { ...current, preferences: result.preferences, displayName: result.displayName });
        if (section === "workspace") { setName(result.branding.name); setTagline(result.branding.tagline); }
        else { setDisplayName(result.displayName); setPreferences(result.preferences); }
        onSaved(result); setNotice(section === "workspace" ? "Workspace details saved." : "Personal preferences saved. Mention choices apply to future messages.");
      }
    } catch (failure) { fail(failure); }
    finally { pending.current = false; if (live.current) setBusy(false); }
  }
  async function reload() {
    if (pending.current || securityBusy || (dirty && !window.confirm("Discard unsaved settings and load the current values?"))) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try { const result = await api<TeamSettingsView>("/api/team/settings"); if (live.current) { setSaved(result); setName(result.branding.name); setTagline(result.branding.tagline); setDisplayName(result.displayName); setPreferences(result.preferences); onSaved(result); setNotice("Current settings loaded."); } }
    catch (failure) { fail(failure); } finally { pending.current = false; if (live.current) setBusy(false); }
  }
  return <section className="admin-panel team-settings"><button className="admin-text-button" disabled={locked} onClick={onBack}>Back to channels</button><h2 ref={heading} tabIndex={-1}>Workspace and account settings</h2><OwnerError message={error} /><p role="status">{notice}</p>
    <form className="admin-form workspace-settings-card" onSubmit={event => { event.preventDefault(); void save("personal"); }}><h3>Your profile and preferences</h3><SaveIndicator dirty={personalDirty} label="Personal settings" />
      <label>Display name<input required maxLength={120} disabled={locked || !initial.editableName} value={displayName} onChange={event => setDisplayName(event.target.value)} /></label>
      {!initial.editableName && <p>The protected owner’s name is managed separately.</p>}
      <fieldset className="team-role-permissions" disabled={locked}><legend>Your workspace display</legend>
        <label><input type="checkbox" checked={preferences.compact} onChange={event => setPreferences(current => ({ ...current, compact: event.target.checked }))} />Compact message spacing</label>
        <label><input type="checkbox" checked={preferences.unreadBadges} onChange={event => setPreferences(current => ({ ...current, unreadBadges: event.target.checked }))} />Show unread counts</label>
        <label><input type="checkbox" checked={preferences.mentionAlerts} onChange={event => setPreferences(current => ({ ...current, mentionAlerts: event.target.checked }))} />Receive new in-app mentions</label>
      </fieldset><p>Unread counts can be hidden without marking messages read. Existing mentions remain available when new alerts are disabled. These settings do not send email, sounds or browser notifications.</p>
      <button className="admin-primary" disabled={locked || !personalDirty}>Save personal settings</button>
    </form>
    {canManage && <form className="admin-form workspace-settings-card" onSubmit={event => { event.preventDefault(); void save("workspace"); }}><h3>Workspace identity</h3><SaveIndicator dirty={brandDirty} label="Workspace identity" /><label>Workspace name<input required maxLength={120} disabled={locked} value={name} onChange={event => setName(event.target.value)} /></label><label>Workspace description<textarea maxLength={240} disabled={locked} value={tagline} onChange={event => setTagline(event.target.value)} /></label><p>Visible to the team. These settings do not change the public Crystal Powers brand.</p><button className="admin-primary" disabled={locked || !brandDirty}>Save workspace details</button></form>}
    <button className="admin-secondary" disabled={locked} onClick={() => void reload()}>Reload current settings</button>
    {initial.editableName ? <TeamAccountSecurity disabled={busy} otherDirty={brandDirty || personalDirty} onDirty={setSecurityDirty} onBusy={setSecurityBusy} onExpired={onExpired} onChanged={onSecurityChanged}/> : <p>The protected owner uses separate account security. <Link to="/admin">Open the owner studio</Link>.</p>}
  </section>;
}
