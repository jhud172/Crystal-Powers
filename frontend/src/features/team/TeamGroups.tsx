import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";
import { useNavigationProtection } from "../../app/NavigationProtection";

type Group = { id: string; name: string; description: string; archived: boolean; version: number; members: string[] };
type Member = { id: string; displayName: string; role: string };
type Props = { onBack: () => void; onExpired: () => void; onBusy: (value: boolean) => void; onDirty: (value: boolean) => void; onChanged: () => void };
export function TeamGroups(props: Props) {
  const [groups,setGroups]=useState<Group[]>([]),[selected,setSelected]=useState<string | null>(null),[creating,setCreating]=useState(false);
  const [error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const live=useRef(true),dirty=useRef(false);
  function fail(value:unknown){if(live.current){setError((value as Error).message);if(value instanceof ApiError && value.status===401)props.onExpired();}}
  async function load(){setLoading(true);try{const result=await api<Group[]>("/api/team/groups");if(live.current)setGroups(result);}catch(failure){fail(failure);}finally{if(live.current)setLoading(false);}}
  useEffect(()=>{live.current=true;void load();return()=>{live.current=false;};},[]);
  function choose(id:string | null){if(busy || (dirty.current && !window.confirm("Discard unsaved group changes?")))return;dirty.current=false;props.onDirty(false);setSelected(id);setCreating(id===null);}
  function saved(){setBusy(false);props.onBusy(false);dirty.current=false;props.onDirty(false);setSelected(null);setCreating(false);void load();props.onChanged();}
  return <section className="team-groups"><button className="admin-text-button" disabled={busy} onClick={props.onBack}>Back to channels</button><h2>Private team groups</h2><p>Organise membership, then restrict channels to a group. Role access still applies; group membership does not grant staff permissions.</p><OwnerError message={error}/><button className="admin-secondary" disabled={busy || loading} onClick={()=>choose(null)}>Create a group</button><button className="admin-secondary" disabled={busy || loading} onClick={()=>void load()}>Refresh groups</button>{loading && <p role="status">Loading groups…</p>}
    <ul className="team-group-list">{groups.map(group=><li key={group.id}><button className="admin-text-button" disabled={busy} aria-current={selected===group.id ? "page" : undefined} onClick={()=>choose(group.id)}><strong>{group.name}</strong><span>{group.archived ? "Archived" : "Active"}</span></button><p>{group.description}</p></li>)}</ul>{!loading && !groups.length && <p>No private groups yet.</p>}
    {(selected || creating) && <GroupEditor key={selected || "new-group"} id={selected} onSaved={saved} onExpired={props.onExpired} onBusy={value=>{setBusy(value);props.onBusy(value);}} onDirty={value=>{dirty.current=value;props.onDirty(value);}}/>}
  </section>;
}
function GroupEditor({id,onSaved,onExpired,onBusy,onDirty}:{id:string | null;onSaved:()=>void;onExpired:()=>void;onBusy:(value:boolean)=>void;onDirty:(value:boolean)=>void}){
  const [group,setGroup]=useState<Group | null>(null),[members,setMembers]=useState<Member[]>([]),[name,setName]=useState(""),[description,setDescription]=useState(""),[archived,setArchived]=useState(false),[selected,setSelected]=useState<string[]>([]);
  const [error,setError]=useState(""),[loading,setLoading]=useState(true),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
  const live=useRef(true),pending=useRef(false),generation=useRef(0);
  useNavigationProtection(dirty || busy,"Discard unsaved group changes or leave before their save is confirmed?");
  useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
  function fail(value:unknown){if(live.current){setError((value as Error).message);if(value instanceof ApiError && value.status===401)onExpired();}}
  async function load(){const current=++generation.current;setLoading(true);setReady(false);try{const [eligible,currentGroup]=await Promise.all([api<Member[]>("/api/team/groups/eligible-members"),id ? api<Group>(`/api/team/groups/${id}`) : Promise.resolve(null)]);if(live.current && current===generation.current){setMembers(eligible);setGroup(currentGroup);setName(currentGroup?.name || "");setDescription(currentGroup?.description || "");setArchived(currentGroup?.archived || false);setSelected(currentGroup?.members || []);setDirty(false);setReady(true);}}catch(failure){if(current===generation.current)fail(failure);}finally{if(live.current && current===generation.current)setLoading(false);}}
  useEffect(()=>{live.current=true;void load();return()=>{live.current=false;generation.current++;};},[id]);
  function toggle(member:string){setSelected(values=>values.includes(member) ? values.filter(id=>id!==member) : [...values,member]);setDirty(true);}
  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();if(pending.current || !ready)return;if(archived && !group?.archived && !window.confirm("Archive this group and hide its channels from conversation access? Membership and messages are retained."))return;pending.current=true;setBusy(true);onBusy(true);setError("");try{await api(id ? `/api/team/groups/${id}` : "/api/team/groups",{method:id ? "PATCH" : "POST",body:JSON.stringify({name,description,archived,members:selected,expectedVersion:group?.version || 0})});if(live.current){setDirty(false);onDirty(false);onSaved();}}catch(failure){fail(failure);}finally{pending.current=false;if(live.current){setBusy(false);onBusy(false);}}}
  const unavailable=selected.filter(id=>!members.some(member=>member.id===id));
  return <section><h3>{id ? "Group settings and membership" : "Create a private group"}</h3><OwnerError message={error}/>{loading && <p role="status">Opening group settings…</p>}{!loading && !ready && <button className="admin-secondary" onClick={()=>void load()}>Try again</button>}
    {ready && <form className="admin-form" onSubmit={event=>void save(event)}><fieldset disabled={busy}><label>Group name<input required maxLength={80} value={name} onChange={event=>{setName(event.target.value);setDirty(true);}}/></label><label>Description<textarea maxLength={500} value={description} onChange={event=>{setDescription(event.target.value);setDirty(true);}}/></label>
      <fieldset className="team-group-members"><legend>Active team members</legend>{members.map(member=><label key={member.id}><input type="checkbox" checked={selected.includes(member.id)} onChange={()=>toggle(member.id)}/><span>{member.displayName} · {member.role.toLowerCase()}</span></label>)}{!members.length && <p>No active team accounts are available. Workspace admins retain management access.</p>}{unavailable.map(member=><label key={member}><input type="checkbox" checked onChange={()=>toggle(member)}/><span>Inactive member — retained without access; untick to remove (<code>{member}</code>)</span></label>)}</fieldset>
      {id && <label><input type="checkbox" checked={archived} onChange={event=>{setArchived(event.target.checked);setDirty(true);}}/> Archive group and hide its channels</label>}<p>Workspace admins retain management access to active groups. Restoring an archived group restores its eligible channels unless the channel itself is archived; it does not change their role permissions.</p><button className="admin-primary" disabled={!dirty}>{busy ? "Saving…" : "Save group and membership"}</button></fieldset>
    </form>}
  </section>;
}
