import { PageFilter } from "../../components/PageFilter";
import { matchesFilter } from "../../lib/matchesFilter";
import { InvitationEmail } from "./InvitationEmail";
import { useNavigationProtection } from "../../app/NavigationProtection";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";
import { TeamRoleProfiles } from "./TeamRoleProfiles";

type Role = "ADMIN" | "MODERATOR" | "SUPPORT" | "MEMBER";
type Member = { id: string; email: string; displayName: string; role: Role; state: string; credentialsVersion: number };
type Management={actorScope:string;members:{member:Member;manageable:boolean}[];creatableRoles:Role[]};
const roles: Role[] = ["ADMIN", "MODERATOR", "SUPPORT", "MEMBER"];
export function TeamMembers({ onBack, onSessionExpired, backLabel = "Back to projects", canManageRoles = true, onDirty, onBusy }: { onBack: () => void; onSessionExpired: () => void; backLabel?: string; canManageRoles?: boolean; onDirty?: (value: boolean) => void; onBusy?: (value: boolean) => void }) {
  const [query,setQuery]=useState("");
  const [rolesOpen, setRolesOpen] = useState(false);
  const roleProfilesButton=useRef<HTMLButtonElement>(null),returnFromProfiles=useRef(false);
  useLayoutEffect(()=>{if(!rolesOpen && returnFromProfiles.current){returnFromProfiles.current=false;roleProfilesButton.current?.focus();}},[rolesOpen]);
  const [members, setMembers] = useState<Member[]>([]),[management,setManagement]=useState<Management | null>(null),[loading,setLoading]=useState(true);
  const actorScope=useRef<string | null>(null),listGeneration=useRef(0),listRequest=useRef<AbortController | null>(null),creationForm=useRef<HTMLFormElement>(null);
  const [creationRole,setCreationRole]=useState<Role | "">("MEMBER");
  const allowedRoles=management?.creatableRoles || [];
  const manageable=new Set(management?.members.filter(item=>item.manageable).map(item=>item.member.id));
  const [baseBusy, setBusy] = useState(false),[emailBusy,setEmailBusy]=useState(false),[formDirty,setFormDirty]=useState(false);
  const [profileBusy,setProfileBusy]=useState(false),[profileDirty,setProfileDirty]=useState(false);
  const busy=baseBusy || emailBusy || profileBusy;
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState<{ member:Member; invitationPath: string; expiresAt: string } | null>(null);
  const live = useRef(true), pending = useRef(false);
  const callbacks=useRef({onBusy,onDirty});callbacks.current={onBusy,onDirty};
  useNavigationProtection(busy || formDirty || profileDirty || !!invitation,"Leave team members? Unsaved member details and private invitation links will be discarded.");
  useEffect(()=>{callbacks.current.onBusy?.(busy);},[busy]);
  useEffect(()=>{callbacks.current.onDirty?.(formDirty || profileDirty || !!invitation);},[formDirty,profileDirty,invitation]);
  useEffect(()=>()=>{callbacks.current.onBusy?.(false);callbacks.current.onDirty?.(false);},[]);
  function fail(failure: unknown) {
    if (!live.current) return;
    setError((failure as Error).message);
    if(failure instanceof ApiError && [401,403,404].includes(failure.status)){setManagement(null);setMembers([]);setInvitation(null);setRolesOpen(false);}
    if (failure instanceof ApiError && failure.status === 401) onSessionExpired();
  }
  async function load() {
    const current=++listGeneration.current;listRequest.current?.abort();const abort=new AbortController();listRequest.current=abort;
    setLoading(true);setError("");
    try{
      const result=await api<Management>("/api/team/members/management",{signal:abort.signal});
      if(!live.current || abort.signal.aborted || current!==listGeneration.current)return;
      if(actorScope.current && actorScope.current!==result.actorScope){setInvitation(null);setFormDirty(false);setRolesOpen(false);creationForm.current?.reset();}
      // Never keep displaying an invitation for recovered, suspended or newly restricted access.
      setInvitation(issued=>{
        if(!issued)return null;
        const currentMember=result.members.find(item=>item.member.id===issued.member.id);
        return currentMember?.manageable && currentMember.member.state==="INVITED" && currentMember.member.credentialsVersion===issued.member.credentialsVersion ? issued : null;
      });
      actorScope.current=result.actorScope;
      setCreationRole(value=>result.creatableRoles.includes(value as Role) ? value : result.creatableRoles.includes("MEMBER") ? "MEMBER" : result.creatableRoles[0] || "");
      setManagement(result);setMembers(result.members.map(item=>item.member));
    }catch(failure){
      if(live.current && current===listGeneration.current && !abort.signal.aborted){setManagement(null);setMembers([]);setInvitation(null);fail(failure);}
    }finally{if(live.current && current===listGeneration.current)setLoading(false);}
  }

  useEffect(() => { live.current = true; void load(); return () => { live.current = false; ++listGeneration.current;listRequest.current?.abort(); }; }, []);
  async function create(form: HTMLFormElement) {
    if (pending.current || busy || loading || !management || !allowedRoles.includes(creationRole as Role)) return;
    pending.current = true; setBusy(true); setError(""); setInvitation(null);
    const data = new FormData(form);
    try {
      const result = await api<{ member: Member; invitationPath: string; expiresAt: string }>("/api/team/members", { method: "POST", body: JSON.stringify(Object.fromEntries(data)) });
      if (live.current) { setMembers(current => [...current, result.member]); setInvitation(result); form.reset(); setFormDirty(false); await load(); }
    } catch (failure) { fail(failure); } finally { pending.current = false; if (live.current) setBusy(false); }
  }
  async function change(member: Member, role: Role, state: string) {
    if (pending.current || busy || loading || !manageable.has(member.id) || (role!==member.role && !allowedRoles.includes(role)) || (state === "SUSPENDED" && !window.confirm(`Suspend ${member.displayName}? Their current sessions will end.`))) return;
    pending.current = true; setBusy(true); setError("");
    try { const result = await api<Member>(`/api/team/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ role, state, expectedVersion: member.credentialsVersion }) }); if (live.current) {setMembers(current => current.map(item => item.id === member.id ? result : item));await load();} }
    catch (failure) { fail(failure); } finally { pending.current = false; if (live.current) setBusy(false); }
  }
  async function invitationAction(member: Member, action: "invitation" | "cancel" | "reset") {
    if (pending.current || busy || loading || !manageable.has(member.id)) return;
    if (action === "reset" && !window.confirm(`Reset access for ${member.displayName}? Their sessions, password and authenticator will be revoked. Verify their identity before sharing the new invitation.`)) return;
    if (action === "cancel" && !window.confirm(`Cancel the invitation for ${member.displayName}?`)) return;
    pending.current = true; setBusy(true); setError(""); setInvitation(null);
    try {
      const result = await api<{ member?: Member; invitationPath?: string; expiresAt?: string }>(`/api/team/members/${member.id}/${action}`, { method: "POST", body: JSON.stringify({ expectedVersion: member.credentialsVersion }) });
      if (live.current) { if (result.invitationPath && result.expiresAt && result.member) setInvitation({ member:result.member, invitationPath: result.invitationPath, expiresAt: result.expiresAt }); await load(); }
    } catch (failure) { fail(failure); } finally { pending.current = false; if (live.current) setBusy(false); }
  }
  if (rolesOpen) return <TeamRoleProfiles members={members} onBack={() => {returnFromProfiles.current=true;setRolesOpen(false);}} onChanged={load} onExpired={onSessionExpired} onDirty={setProfileDirty} onBusy={setProfileBusy} />;
  return <section className="admin-panel"><button className="admin-text-button" disabled={busy} onClick={onBack}>{backLabel}</button><h1>Team members</h1><p>Create an account and choose its role. The recipient chooses their own password and sets up an authenticator. Managing or recovering another account requires permission for all of its retained grants; ask the owner if your role cannot do this.</p><OwnerError message={error} />
    {canManageRoles && <button ref={roleProfilesButton} className="admin-secondary" disabled={busy || loading || !management} onClick={() => {if(formDirty && !window.confirm("Discard unsaved member details before opening role profiles?"))return;setFormDirty(false);setRolesOpen(true);}}>Manage custom role profiles</button>}
    {loading && <p role="status">Checking current member-management access…</p>}
    {!loading && management && !allowedRoles.length && <p>Your custom role cannot grant any full base role. Ask an authorised admin or the owner to provision the account.</p>}
    <form ref={creationForm} className="admin-form" onInput={()=>setFormDirty(true)} onSubmit={event => { event.preventDefault(); void create(event.currentTarget); }}><fieldset disabled={busy || loading || !allowedRoles.length}>
      <label>Display name<input name="displayName" required maxLength={120} autoComplete="name" /></label>
      <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label>Role<select name="role" value={creationRole} onChange={event=>{setCreationRole(event.target.value as Role);setFormDirty(true);}}>{allowedRoles.map(role => <option key={role}>{role}</option>)}</select></label>
      <button className="admin-primary" disabled={busy}>Create invitation</button></fieldset>
    </form>
    {invitation && <div className="admin-notice" role="status"><label>Private invitation link<input readOnly value={new URL(invitation.invitationPath, location.origin).href} onFocus={event => event.currentTarget.select()} /></label><p>Expires {new Date(invitation.expiresAt).toLocaleString("en-GB")}. Share privately with the intended recipient. Creating the invitation does not send email; check the delivery controls below.</p><InvitationEmail kind="TEAM" resource={invitation.member.id} version={invitation.member.credentialsVersion} recipient={invitation.member.email} token={invitation.invitationPath.split("#token=")[1] || ""} disabled={busy} onBusy={setEmailBusy} onExpired={onSessionExpired}/><button className="admin-secondary" disabled={busy} onClick={() => setInvitation(null)}>Hide invitation</button></div>}
    <button className="admin-secondary" disabled={busy} onClick={() => void load()}>Reload members</button>
    <PageFilter label="Find a loaded team member" value={query} onChange={setQuery} shown={members.filter(member=>matchesFilter(query,member.displayName,member.email,member.role,member.state)).length} total={members.length} disabled={busy} loading={loading} />
    <ul className="team-member-list">{members.filter(member=>matchesFilter(query,member.displayName,member.email,member.role,member.state)).map(member => <li key={member.id}><strong>{member.displayName}</strong><span>{member.email} · {member.state}</span>{!manageable.has(member.id) && <p>Access changes and recovery need another authorised admin or the owner.</p>}<label>Role for {member.displayName}<select value={member.role} disabled={busy || loading || !manageable.has(member.id) || member.state === "INVITED"} onChange={event => void change(member, event.target.value as Role, member.state)}>{roles.filter(role=>role===member.role || allowedRoles.includes(role)).map(role => <option key={role}>{role}</option>)}</select></label>{member.state === "INVITED" && <><button className="admin-secondary" disabled={busy || loading || !manageable.has(member.id)} onClick={() => void invitationAction(member, "invitation")}>Replace invitation</button><button className="admin-text-button" disabled={busy || loading || !manageable.has(member.id)} onClick={() => void invitationAction(member, "cancel")}>Cancel invitation</button></>}{member.state !== "INVITED" && <button className="admin-text-button" disabled={busy || loading || !manageable.has(member.id)} onClick={() => void invitationAction(member, "reset")}>Recover account with new invitation</button>}{member.state !== "INVITED" && <button className="admin-secondary" disabled={busy || loading || !manageable.has(member.id)} onClick={() => void change(member, member.role, member.state === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>{member.state === "ACTIVE" ? "Suspend access" : "Restore access"}</button>}</li>)}</ul>
  </section>;
}
