import { useEffect, useRef, useState } from "react";
import { api, ApiError, type ProjectDraft } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";

type Scope = { workspaceId: string | null; updatedAt: string };
type Props = { project: ProjectDraft; disabled: boolean; onUpdate: (project: ProjectDraft) => void; onBusy: (busy: boolean) => void; onExpired: () => void };
export function ProjectTeamAccess({ project, disabled, onUpdate, onBusy, onExpired }: Props) {
  const [scope,setScope]=useState<Scope | null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[revision,setRevision]=useState(0);
  const alive=useRef(true),pending=useRef(false);
  useEffect(()=>{alive.current=true;const abort=new AbortController();setLoading(true);setScope(null);setError("");void api<Scope>(`/api/admin/projects/${project.id}/team-access`,{signal:abort.signal}).then(value=>{if(!abort.signal.aborted)setScope(value);}).catch(failure=>{if(!abort.signal.aborted){setError((failure as Error).message);if(failure instanceof ApiError && failure.status===401)onExpired();}}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>{alive.current=false;abort.abort();};},[project.id,project.updatedAt,revision]);
  async function change() {
    if(pending.current || disabled || !scope || scope.updatedAt!==project.updatedAt)return;
    const enabled=scope.workspaceId===null;
    if(!window.confirm(enabled ? "Allow your team's authorised project editors to access this project's private drafts and revision history? This does not publish it." : "Remove this project from team access? The owner keeps access, and its public publication status does not change."))return;
    pending.current=true;setBusy(true);onBusy(true);setError("");
    try {const value=await api<Scope>(`/api/admin/projects/${project.id}/team-access`,{method:"PATCH",body:JSON.stringify({enabled,expectedUpdatedAt:project.updatedAt})});if(alive.current){setScope(value);onUpdate({...project,updatedAt:value.updatedAt});}}
    catch(failure){if(alive.current){setError((failure as Error).message);if(failure instanceof ApiError && failure.status===401)onExpired();}}
    finally{pending.current=false;if(alive.current){setBusy(false);onBusy(false);}}
  }
  return <section className="admin-team-project-access"><h3>Team project access</h3><p>Only the owner assigns existing projects to the team. Project permissions apply separately; this control does not publish work.</p><OwnerError message={error}/>{loading ? <p role="status">Checking team access…</p> : scope && <p>{scope.workspaceId ? "Assigned to your team's workspace." : "Owner access only."}</p>}{scope && scope.updatedAt!==project.updatedAt && <p role="status">The saved project changed. Reload its draft before changing team access.</p>}<button type="button" className="admin-secondary" disabled={disabled || busy || loading || !scope || scope.updatedAt!==project.updatedAt} onClick={()=>void change()}>{scope?.workspaceId ? "Remove team access" : "Allow team access"}</button><button type="button" className="admin-text-button" disabled={disabled || busy || loading} onClick={()=>setRevision(value=>value+1)}>Refresh access status</button></section>;
}
