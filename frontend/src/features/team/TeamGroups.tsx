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
  const live=useRef(true),dirty=useRef(false),generation=useRef(0),request=useRef<AbortController | null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  function fail(value:unknown){
    if(!live.current || (value instanceof DOMException && value.name==="AbortError"))return;
    setError((value as Error).message);
    if(value instanceof ApiError && [401,403,404].includes(value.status)){
      setGroups([]);setSelected(null);setCreating(false);dirty.current=false;props.onDirty(false);
      if(value.status===401)props.onExpired();
    }
  }
  async function load(){
    const current=++generation.current;request.current?.abort();const abort=new AbortController();request.current=abort;
    setLoading(true);setError("");
    try{const result=await api<Group[]>("/api/team/groups",{signal:abort.signal});if(live.current && current===generation.current){setGroups(result);heading.current?.focus();}}
    catch(failure){if(current===generation.current)fail(failure);}
    finally{if(live.current && current===generation.current)setLoading(false);}
  }
  useEffect(()=>{live.current=true;void load();return()=>{live.current=false;++generation.current;request.current?.abort();};},[]);
  function choose(id:string | null){if(busy || (dirty.current && !window.confirm("Discard unsaved group changes?")))return;dirty.current=false;props.onDirty(false);setSelected(id);setCreating(id===null);}
  function unavailable(message:string){setError(message);setGroups([]);setSelected(null);setCreating(false);dirty.current=false;props.onDirty(false);heading.current?.focus();}
  function saved(){setBusy(false);props.onBusy(false);dirty.current=false;props.onDirty(false);setSelected(null);setCreating(false);void load();props.onChanged();}
  return <section className="team-groups"><button className="admin-text-button" disabled={busy} onClick={props.onBack}>Back to channels</button><h2 ref={heading} tabIndex={-1}>Private team groups</h2><p>Organise membership, then restrict channels to a group. Role access still applies; group membership does not grant staff permissions.</p><OwnerError message={error}/><div className="team-history-nav"><button className="admin-secondary" disabled={busy || loading || !!error} onClick={()=>choose(null)}>Create a group</button><button className="admin-secondary" disabled={busy || loading} onClick={()=>void load()}>Refresh groups</button></div>{loading && <p role="status">Loading groups…</p>}
    <ul className="team-group-list">{groups.map(group=><li key={group.id}><button className="admin-text-button" disabled={busy} aria-current={selected===group.id ? "page" : undefined} onClick={()=>choose(group.id)}><strong>{group.name}</strong><span>{group.archived ? "Archived" : "Active"}</span></button><p>{group.description}</p></li>)}</ul>{!loading && !error && !groups.length && <p>No private groups yet.</p>}
    {(selected || creating) && <GroupEditor key={selected || "new-group"} id={selected} onUnavailable={unavailable} onSaved={saved} onExpired={props.onExpired} onBusy={value=>{setBusy(value);props.onBusy(value);}} onDirty={value=>{dirty.current=value;props.onDirty(value);}}/>}
  </section>;
}
function GroupEditor({id,onSaved,onExpired,onBusy,onDirty,onUnavailable}:{id:string | null;onUnavailable:(message:string)=>void;onSaved:()=>void;onExpired:()=>void;onBusy:(value:boolean)=>void;onDirty:(value:boolean)=>void}){
  const [group,setGroup]=useState<Group | null>(null),[members,setMembers]=useState<Member[]>([]),[name,setName]=useState(""),[description,setDescription]=useState(""),[archived,setArchived]=useState(false),[selected,setSelected]=useState<string[]>([]);
  const [error,setError]=useState(""),[loading,setLoading]=useState(true),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
  const live=useRef(true),pending=useRef(false),generation=useRef(0),request=useRef<AbortController | null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  useNavigationProtection(dirty || busy,"Discard unsaved group changes or leave before their save is confirmed?");
  useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
  function fail(value:unknown){
    if(!live.current || (value instanceof DOMException && value.name==="AbortError"))return;
    setError((value as Error).message);
    if(value instanceof ApiError && [401,403,404].includes(value.status)){
      setReady(false);setGroup(null);setMembers([]);setSelected([]);setName("");setDescription("");setArchived(false);setDirty(false);onDirty(false);onUnavailable((value as Error).message);
      if(value.status===401)onExpired();
      return;
    }
    heading.current?.focus();
  }
  async function load(){const current=++generation.current;request.current?.abort();const abort=new AbortController();request.current=abort;setLoading(true);setReady(false);setError("");try{const [eligible,currentGroup]=await Promise.all([api<Member[]>("/api/team/groups/eligible-members",{signal:abort.signal}),id ? api<Group>(`/api/team/groups/${id}`,{signal:abort.signal}) : Promise.resolve(null)]);if(live.current && current===generation.current){setMembers(eligible);setGroup(currentGroup);setName(currentGroup?.name || "");setDescription(currentGroup?.description || "");setArchived(currentGroup?.archived || false);setSelected(currentGroup?.members || []);setDirty(false);setReady(true);heading.current?.focus();}}catch(failure){if(current===generation.current)fail(failure);}finally{if(live.current && current===generation.current)setLoading(false);}}
  useEffect(()=>{live.current=true;void load();return()=>{live.current=false;generation.current++;request.current?.abort();};},[id]);
  function toggle(member:string){setSelected(values=>values.includes(member) ? values.filter(id=>id!==member) : [...values,member]);setDirty(true);}
  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();if(pending.current || !ready)return;if(archived && !group?.archived && !window.confirm("Archive this group and hide its channels from conversation access? Membership and messages are retained."))return;pending.current=true;setBusy(true);onBusy(true);setError("");try{await api(id ? `/api/team/groups/${id}` : "/api/team/groups",{method:id ? "PATCH" : "POST",body:JSON.stringify({name,description,archived,members:selected,expectedVersion:group?.version || 0})});if(live.current){setDirty(false);onDirty(false);onSaved();}}catch(failure){fail(failure);}finally{pending.current=false;if(live.current){setBusy(false);onBusy(false);}}}
  const unavailable=selected.filter(id=>!members.some(member=>member.id===id));
  return <section className="team-group-editor" aria-labelledby="group-editor-heading"><h3 id="group-editor-heading" ref={heading} tabIndex={-1}>{id ? "Group settings and membership" : "Create a private group"}</h3><OwnerError message={error}/>{loading && <p role="status">Opening group settings…</p>}{!loading && !ready && <button className="admin-secondary" onClick={()=>void load()}>Try again</button>}
    {ready && <form className="admin-form" onSubmit={event=>void save(event)}><fieldset className="admin-form-fields" disabled={busy}><label htmlFor="team-group-name">Group name</label><input id="team-group-name" required maxLength={80} value={name} onChange={event=>{setName(event.target.value);setDirty(true);}}/><label htmlFor="team-group-description">Description</label><textarea id="team-group-description" maxLength={500} value={description} onChange={event=>{setDescription(event.target.value);setDirty(true);}}/>
      <fieldset className="team-group-members"><legend>Active team members</legend>{members.map(member=><label key={member.id}><input type="checkbox" checked={selected.includes(member.id)} onChange={()=>toggle(member.id)}/><span>{member.displayName} · {member.role.toLowerCase()}</span></label>)}{!members.length && <p>No active team accounts are available. Workspace admins retain management access.</p>}{unavailable.map(member=><label key={member}><input type="checkbox" checked onChange={()=>toggle(member)}/><span>Inactive member — retained without access; untick to remove (<code>{member}</code>)</span></label>)}</fieldset>
      {id && <label className="team-group-archive"><input type="checkbox" checked={archived} onChange={event=>{setArchived(event.target.checked);setDirty(true);}}/> Archive group and hide its channels</label>}<p>Workspace admins retain management access to active groups. Restoring an archived group restores its eligible channels unless the channel itself is archived; it does not change their role permissions.</p><button className="admin-primary" disabled={!dirty}>{busy ? "Saving…" : "Save group and membership"}</button></fieldset>
    </form>}
  </section>;
}
