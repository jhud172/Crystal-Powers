import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";
import { useNavigationProtection } from "../../app/NavigationProtection";

export type TeamChannel = { id: string; name: string; description: string; category: string; audience: string; archived: boolean; version: number; groupId: string | null };
type Callbacks = { onSaved: (channel: TeamChannel) => void; onBack: () => void; onExpired: () => void; onBusy: (busy: boolean) => void };
export function ChannelSettings({ channel, onSaved, onBack, onExpired, onBusy, onDirty }: Callbacks & { channel?: TeamChannel | null; onDirty: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [groups,setGroups]=useState<{id:string;name:string;archived:boolean}[]>([]),[groupsLoading,setGroupsLoading]=useState(true);
  const [groupsReady,setGroupsReady]=useState(false);
  const [selectedGroup,setSelectedGroup]=useState(channel?.groupId || "");
  useNavigationProtection(dirty || busy, busy ? "A channel change is being saved. Leave before its result is confirmed?" : "Discard unsaved channel settings?");
  const live = useRef(true), pending = useRef(false);
  async function loadGroups(){setGroupsLoading(true);setGroupsReady(false);try{const value=await api<{id:string;name:string;archived:boolean}[]>("/api/team/groups");if(live.current){setGroups(value);setGroupsReady(true);}}catch(failure){if(live.current){setError((failure as Error).message);if(failure instanceof ApiError && failure.status===401)onExpired();}}finally{if(live.current)setGroupsLoading(false);}}
  useEffect(() => { live.current = true;void loadGroups(); return () => { live.current = false; }; }, []);
  async function save(form: HTMLFormElement) {
    if (pending.current) return;
    if(groupsLoading || !groupsReady){setError("Group visibility could not be confirmed. Reload the group choices before saving.");return;}
    const data = new FormData(form), archived = data.get("archived") === "on";
    if (archived && !channel?.archived && !window.confirm(`Archive #${channel?.name || data.get("name")}? Its messages are retained and admins can restore it.`)) return;
    pending.current = true; setBusy(true); onBusy(true); setError("");
    try {
      const groupControl=form.elements.namedItem("groupId");
      const groupId=groupControl instanceof HTMLSelectElement ? groupControl.value || null : channel?.groupId || null;
      const result = await api<TeamChannel>(channel ? `/api/team/channels/${channel.id}` : "/api/team/channels", { method: channel ? "PATCH" : "POST", body: JSON.stringify({ name: data.get("name"), description: data.get("description"), category: data.get("category"), audience: data.get("audience"), archived, expectedVersion: channel?.version || 0,groupId,clearGroup:groupId===null }) });
      if (live.current) onSaved(result);
    } catch (failure) { if (live.current) { setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) onExpired(); } }
    finally { pending.current = false; if (live.current) { setBusy(false); onBusy(false); } }
  }
  return <section><button className="admin-text-button" disabled={busy} onClick={onBack}>Back to conversation</button><h2>{channel ? `Settings for #${channel.name}` : "Create a channel"}</h2><OwnerError message={error} /><form className="admin-form" onInput={() => { setDirty(true); onDirty(); }} onChange={() => { setDirty(true); onDirty(); }} onSubmit={event => { event.preventDefault(); void save(event.currentTarget); }}>
    <label>Name<input name="name" required pattern="[a-z0-9][a-z0-9-]{0,79}" maxLength={80} defaultValue={channel?.name || ""} placeholder="project-planning" /></label>
    <label>Description<textarea name="description" maxLength={500} defaultValue={channel?.description || ""} /></label>
    <label>Category<input name="category" required maxLength={80} defaultValue={channel?.category || "Team"} /></label>
    <label>Who can see it?<select name="audience" defaultValue={channel?.audience || "TEAM"}><option value="TEAM">Everyone in the team</option><option value="SUPPORT">Support and admins</option><option value="MODERATION">Moderators and admins</option><option value="ADMIN">Admins</option></select></label>
    <label>Private group restriction<select name="groupId" disabled={groupsLoading || !groupsReady || busy} value={selectedGroup} onChange={event=>setSelectedGroup(event.target.value)}><option value="">No group restriction</option>{groups.filter(group=>!group.archived || group.id===channel?.groupId).map(group=><option key={group.id} value={group.id} disabled={group.archived}>{group.name}{group.archived ? " (archived — restore the group first)" : ""}</option>)}</select></label>
    {!groupsLoading && !groupsReady && <button type="button" className="admin-secondary" disabled={busy} onClick={()=>void loadGroups()}>Reload group choices</button>}
    <p>Role access still applies inside a group. Workspace admins can manage active group channels; archiving a group hides its channels until the group is restored.</p>
    {channel && <label><input type="checkbox" name="archived" defaultChecked={channel.archived} /> Archive this channel</label>}
    <p>Changing visibility applies to every message in this channel. Archived channels leave the conversation list; messages stay in the workspace.</p>
    <button className="admin-primary" disabled={busy || groupsLoading || !groupsReady}>{busy ? "Saving…" : channel ? "Save channel settings" : "Create channel"}</button>
  </form></section>;
}

export function ArchivedChannels({ onSaved, onBack, onExpired, onBusy }: Callbacks) {
  const [channels, setChannels] = useState<TeamChannel[]>([]), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const live = useRef(true), pending = useRef(false), generation = useRef(0);
  function fail(failure: unknown) { if (!live.current) return; setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) onExpired(); }
  async function load() { const current = ++generation.current; setLoading(true); setError(""); try { const result = await api<TeamChannel[]>("/api/team/channels/archived"); if (live.current && current === generation.current) setChannels(result); } catch (failure) { fail(failure); } finally { if (live.current && current === generation.current) setLoading(false); } }
  useEffect(() => { live.current = true; void load(); return () => { live.current = false; generation.current++; }; }, []);
  async function restore(channel: TeamChannel) {
    if (pending.current) return; pending.current = true; setBusy(true); onBusy(true); setError("");
    try { const result = await api<TeamChannel>(`/api/team/channels/${channel.id}`, { method: "PATCH", body: JSON.stringify({ name: channel.name, description: channel.description, category: channel.category, audience: channel.audience, expectedVersion: channel.version, archived: false }) }); if (live.current) onSaved(result); }
    catch (failure) { fail(failure); } finally { pending.current = false; if (live.current) { setBusy(false); onBusy(false); } }
  }
  return <section><button className="admin-text-button" disabled={busy} onClick={onBack}>Back to channels</button><h2>Archived channels</h2><OwnerError message={error} /><button className="admin-secondary" disabled={busy || loading} onClick={() => void load()}>Reload</button>{loading ? <p role="status">Loading archived channels…</p> : !channels.length ? <p>No archived channels.</p> : <ul className="team-member-list">{channels.map(channel => <li key={channel.id}><strong># {channel.name}</strong><p>{channel.category} · {channel.audience}</p><p>{channel.description}</p><button className="admin-secondary" disabled={busy} onClick={() => void restore(channel)}>Restore channel</button></li>)}</ul>}</section>;
}
