import { useEffect, useRef, useState } from "react";
import { useNavigationProtection } from "../../app/NavigationProtection";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";

type Role = "ADMIN" | "MODERATOR" | "SUPPORT" | "MEMBER";
type Profile = { id: string; name: string; baseRole: Role; permissions: string[]; archived: boolean; version: number };
type Member = { id: string; displayName: string; role: Role; credentialsVersion: number };
type Overview = { profiles: Profile[]; assignments: { memberId: string; profileId: string | null; credentialsVersion: number }[]; bases: Record<Role, string[]>; managementGrants:string[];manageableMembers:string[];editableProfiles:string[] };
const roleNames: Role[] = ["MEMBER", "SUPPORT", "MODERATOR", "ADMIN"];
const label = (value: string) => value.toLowerCase().replace(/_/g, " ");

export function TeamRoleProfiles({ members, onBack, onChanged, onExpired, onDirty, onBusy }: {
  members: Member[]; onBack: () => void; onChanged: () => Promise<void>; onExpired: () => void;
  onDirty?: (value: boolean) => void; onBusy?: (value: boolean) => void;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [name, setName] = useState(""), [base, setBase] = useState<Role>("MEMBER");
  const [permissions, setPermissions] = useState<string[]>(["READ_CHANNELS"]);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const notifications = useRef({ onDirty, onBusy });
  notifications.current = { onDirty, onBusy };
  const heading=useRef<HTMLHeadingElement>(null);
  const live = useRef(true), pending = useRef(false), loadGeneration = useRef(0);
  useNavigationProtection(dirty || busy, "Leave role management? Unsaved changes will be lost.");
  useEffect(() => { notifications.current.onDirty?.(dirty); return () => notifications.current.onDirty?.(false); }, [dirty]);
  useEffect(() => { notifications.current.onBusy?.(busy); return () => notifications.current.onBusy?.(false); }, [busy]);
  function fail(failure: unknown) { if (!live.current) return; setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) onExpired(); }
  async function load() {
    const generation = ++loadGeneration.current;
    try { const data = await api<Overview>("/api/team/roles"); if (live.current && generation === loadGeneration.current) {setOverview(data);heading.current?.focus();} }
    catch (failure) { if (generation === loadGeneration.current) fail(failure); }
  }
  useEffect(() => { live.current = true; void load(); return () => { live.current = false; ++loadGeneration.current; }; }, []);
  function choose(profile: Profile | null) {
    if (pending.current || (dirty && !window.confirm("Discard unsaved role changes?"))) return;
    setSelected(profile); setName(profile?.name ?? ""); setBase(profile?.baseRole ?? "MEMBER");
    setPermissions(profile?.permissions ?? ["READ_CHANNELS"]); setDirty(false); setError(""); setNotice("");
  }
  async function mutate(path: string, body: object, method: "POST" | "PATCH", after: () => void) {
    if (pending.current || !overview) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      await api(path, { method, body: JSON.stringify(body) });
      if (live.current) { after(); setNotice("Saved. Affected sessions have been revoked; members must sign in again."); await load(); await onChanged(); }
    } catch (failure) { fail(failure); }
    finally { pending.current = false; if (live.current) setBusy(false); }
  }
  function archive(profile: Profile) {
    if (dirty || !window.confirm(profile.archived ? `Restore ${profile.name}? Assigned active members can sign in again.` : `Archive ${profile.name}? Assigned members will lose access until the profile is restored or replaced.`)) return;
    void mutate(`/api/team/roles/${profile.id}`, { expectedVersion: profile.version, name: profile.name, permissions: profile.permissions, archived: !profile.archived }, "PATCH", () => { if (selected?.id === profile.id) { setSelected(null); setName(""); setPermissions(["READ_CHANNELS"]); setBase("MEMBER"); } });
  }
  return <section className="admin-panel" aria-labelledby="role-profile-heading">
    <button className="admin-text-button" disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard unsaved role changes?")) onBack(); }}>Back to members</button>
    <h2 ref={heading} tabIndex={-1} id="role-profile-heading">Custom role profiles</h2>
    <p>Choose a base role, then keep only the permissions this team member needs. The protected owner remains separate. Changing a member’s base role removes an incompatible custom profile.</p>
    <OwnerError message={error} /><p role="status">{notice}</p>
    {!overview ? <button className="admin-secondary" onClick={() => void load()}>Load role profiles</button> : <>
      <button className="admin-secondary" disabled={busy} onClick={() => choose(null)}>New profile</button>
      <ul className="team-member-list">{overview.profiles.map(profile => <li key={profile.id}><strong>{profile.name}</strong><span>{label(profile.baseRole)} · {profile.archived ? "Archived — access denied" : "Active"}</span><button className="admin-secondary" disabled={busy || !overview.editableProfiles.includes(profile.id)} onClick={() => choose(profile)}>Edit {profile.name}</button><button className="admin-text-button" disabled={busy || dirty || !overview.editableProfiles.includes(profile.id)} onClick={() => archive(profile)}>{profile.archived ? "Restore" : "Archive"} {profile.name}</button>{!overview.editableProfiles.includes(profile.id) && <p>Changes require the owner or another admin authorised for this profile.</p>}</li>)}</ul>
      <form className="admin-form" onSubmit={event => { event.preventDefault(); void mutate(selected ? `/api/team/roles/${selected.id}` : "/api/team/roles", selected ? { name, permissions, archived: selected.archived, expectedVersion: selected.version } : { name, baseRole: base, permissions }, selected ? "PATCH" : "POST", () => { setDirty(false); setSelected(null); setName(""); setBase("MEMBER"); setPermissions(["READ_CHANNELS"]); }); }}>
        <h3>{selected ? `Edit ${selected.name}` : "Create a profile"}</h3>
        <label>Profile name<input required maxLength={80} value={name} disabled={busy || (!!selected && !overview.editableProfiles.includes(selected.id))} onChange={event => { setName(event.target.value); setDirty(true); }} /></label>
        <label>Base role<select disabled={busy || !!selected} value={base} onChange={event => { setBase(event.target.value as Role); setPermissions(["READ_CHANNELS"]); setDirty(true); }}>{roleNames.map(role => <option key={role} value={role}>{label(role)}</option>)}</select></label>
        <fieldset className="team-role-permissions" disabled={busy || (!!selected && !overview.editableProfiles.includes(selected.id))}><legend>Permissions</legend>{overview.bases[base].map(permission => <label key={permission}><input type="checkbox" checked={permissions.includes(permission)} disabled={permission === "READ_CHANNELS" || !overview.managementGrants.includes(permission)} onChange={event => { setPermissions(current => event.target.checked ? [...current, permission] : current.filter(value => value !== permission)); setDirty(true); }} />{label(permission)}</label>)}</fieldset>
        <button className="admin-primary" disabled={busy || !dirty || (!!selected && !overview.editableProfiles.includes(selected.id))}>{busy ? "Saving…" : "Save profile"}</button>
      </form>
      <h3>Member assignments</h3><p>Profiles must match the member’s current base role. Default permissions use the full base role. Invitations can be assigned before they are accepted.</p>
      <ul className="team-member-list">{members.map(member => {
        const assignment = overview.assignments.find(value => value.memberId === member.id);
        const assigned = overview.profiles.find(value => value.id === assignment?.profileId);
        return <li key={member.id}><strong>{member.displayName}</strong><label>Role profile for {member.displayName}<select disabled={busy || dirty || !assignment || !overview.manageableMembers.includes(member.id)} value={assignment?.profileId ?? ""} onChange={event => {
          const profileId = event.target.value || null;
          if (!assignment || !window.confirm(`Change access for ${member.displayName}? Their sessions will end.`)) return;
          void mutate(`/api/team/roles/members/${member.id}`, { profileId, expectedVersion: assignment.credentialsVersion }, "PATCH", () => {});
        }}><option value="" disabled={!overview.bases[member.role].every(permission=>overview.managementGrants.includes(permission))}>Default {label(member.role)} permissions</option>{overview.profiles.filter(profile => profile.baseRole === member.role && (!profile.archived || profile.id === assigned?.id)).map(profile => <option key={profile.id} value={profile.id} disabled={profile.archived || !profile.permissions.every(permission=>overview.managementGrants.includes(permission))}>{profile.name}{profile.archived ? " (archived)" : ""}</option>)}</select></label>{!overview.manageableMembers.includes(member.id) && <p>Another authorised admin or the owner must change this account’s profile.</p>}</li>;
      })}</ul>
      <button className="admin-secondary" disabled={busy || dirty} onClick={() => { void load(); void onChanged(); }}>Reload roles and members</button>
    </>}
  </section>;
}
