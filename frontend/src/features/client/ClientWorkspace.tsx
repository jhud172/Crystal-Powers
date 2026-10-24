import { ProjectProgress } from "../../components/ProjectProgress";
import { CopyButton } from "../../components/CopyButton";
import { PageFilter } from "../../components/PageFilter";
import { matchesFilter } from "../../lib/matchesFilter";
import { PersonAvatar } from "../../components/PersonAvatar";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";
import { PasswordField, validateOwnerPasswords } from "../admin/PasswordField";
import { useNavigationProtection } from "../../app/NavigationProtection";
import { ClientContactPreferences } from "./ClientContactPreferences";
import { ClientBilling } from "./ClientBilling";
import type { ClientDraftMemory } from "./clientDraftMemory";
import { ClientUpdateFeed } from "./ClientUpdateFeed";

type Project = { id: string; subject: string; state: string; progress: number; nextStep: string; projectScope?: string; updatedAt: string };
type ProjectPage={projects:Project[];nextCursor:string | null;total:number;clientId:string;workspaceId:string};
type Detail = { clientId:string;workspaceId:string;project: Project; files: { id: string; filename: string; sizeBytes: number }[] };
type Props = { client: { id: string; workspaceId: string; displayName: string }; draftMemory:ClientDraftMemory;onDraftPresence:(present:boolean)=>void; onExpired: () => void; onLogout: () => void };
export function ClientWorkspace({ client, onExpired, onLogout, draftMemory, onDraftPresence }: Props) {
  const [projects, setProjects] = useState<Project[]>([]), [selected, setSelected] = useState(""), [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [workspaceBusy, setBusy] = useState(false), [loading, setLoading] = useState(true), [passwordDirty, setPasswordDirty] = useState(false);
  const [projectsLoading,setProjectsLoading]=useState(false),[projectPage,setProjectPage]=useState<ProjectPage | null>(null),[projectCursor,setProjectCursor]=useState<string | null>(null),[projectHistory,setProjectHistory]=useState<(string | null)[]>([]);
  const overviewRequest=useRef<AbortController | null>(null);
  const projectGeneration=useRef(0),projectRequest=useRef<AbortController | null>(null),projectsHeading=useRef<HTMLHeadingElement>(null);
  const [billingBusy,setBillingBusy]=useState(false); const [preferencesBusy,setPreferencesBusy]=useState(false),[preferencesDirty,setPreferencesDirty]=useState(false); const busy=workspaceBusy || billingBusy || preferencesBusy;
  const [updateRevision,setUpdateRevision]=useState(0),[latestRevision,setLatestRevision]=useState(0),[historyOpen,setHistoryOpen]=useState(false);
  const [query, setQuery] = useState("");
  const [body, setBody] = useState(""); const live = useRef(true), pending = useRef(false), generation = useRef(0), key = useRef<{ body: string; key: string } | null>(null);
  const [ready,setReady]=useState(false),[identityRevision,setIdentityRevision]=useState(0);
  const verified=useRef(false),bootstrap=useRef(0),selection=useRef("");
  const scope=`${client.workspaceId}:${client.id}`;
  const draftDirty=Object.values(draftMemory.drafts).some(draft=>!!draft.body.trim());
  const dirty = draftDirty || !!body.trim() || passwordDirty || preferencesDirty;
  function publishDrafts(){onDraftPresence(Object.values(draftMemory.drafts).some(draft=>!!draft.body.trim()));}
  function changeBody(value:string){
    if(!verified.current || !ready || !selected || detail?.project.id!==selected)return;
    if(value.trim() && !draftMemory.drafts[selected] && Object.keys(draftMemory.drafts).length>=50){setError("This tab already holds 50 unsent project messages. Send or discard one before starting another.");return;}
    const previous=draftMemory.drafts[selected];
    if(value.trim())draftMemory.drafts[selected]={body:value,submission:previous?.submission?.body===value.trim() ? previous.submission : null};else delete draftMemory.drafts[selected];
    draftMemory.selected=selected;key.current=draftMemory.drafts[selected]?.submission || null;setBody(value);publishDrafts();
  }
  useNavigationProtection(dirty || busy, "Leave your workspace and discard unsaved changes?");
  function fail(value: unknown) {
    if (!live.current) return;
    setError((value as Error).message);
    if (value instanceof ApiError && value.status === 401) {
      verified.current=false; ++bootstrap.current; ++generation.current; ++projectGeneration.current;
      overviewRequest.current?.abort(); projectRequest.current?.abort();
      setReady(false); setLoading(false); setProjectsLoading(false); setDetail(null); setProjects([]); setProjectPage(null);
      selection.current=""; setSelected(""); setBody(""); key.current=null; setHistoryOpen(false);
      setBillingBusy(false); setPreferencesBusy(false); setPreferencesDirty(false); setPasswordDirty(false);
      setNotice("Your session has ended. Unsent project messages remain in this tab for recovery after sign-in.");
    }
  }
  function unavailable(id:string) {
    if (!live.current || selection.current!==id) return;
    ++generation.current; overviewRequest.current?.abort();
    delete draftMemory.drafts[id]; if(draftMemory.selected===id)draftMemory.selected="";
    selection.current=""; setSelected(""); setDetail(null); setBody(""); key.current=null; setHistoryOpen(false); setLoading(false);
    setProjects(values=>values.filter(project=>project.id!==id)); setProjectPage(null); publishDrafts();
    setNotice("This project is no longer available. Its retained message was discarded.");
    projectsHeading.current?.focus();
  }
  async function list(before:string | null=projectCursor,movement:"refresh"|"older"|"newer"|"first"="refresh") {
    if(!verified.current)return;const current=++projectGeneration.current;projectRequest.current?.abort();const abort=new AbortController();projectRequest.current=abort;setProjectsLoading(true);
    try{const result=await api<ProjectPage>(`/api/client/projects/page${before ? `?before=${encodeURIComponent(before)}` : ""}`,{signal:abort.signal});if(live.current && current===projectGeneration.current){if(result.clientId!==client.id || result.workspaceId!==client.workspaceId)throw new ApiError(401,"Your account changed. Confirm it again before opening projects.");setProjects(result.projects);setProjectPage(result);setProjectCursor(before);if(movement==="older")setProjectHistory(values=>[...values.slice(-99),projectCursor]);else if(movement==="newer")setProjectHistory(values=>values.slice(0,-1));else if(movement==="first")setProjectHistory([]);if(movement!=="refresh")projectsHeading.current?.focus();}}
    catch(failure){if(current===projectGeneration.current && !(failure instanceof DOMException && failure.name==="AbortError"))fail(failure);}finally{if(live.current && current===projectGeneration.current)setProjectsLoading(false);}
  }
  async function load(id:string,recover=false,refreshFeeds=true) {
    if(!verified.current)return;
    overviewRequest.current?.abort(); const abort=new AbortController(); overviewRequest.current=abort;
    const current=++generation.current; setLoading(true);
    try {
      const result=await api<Detail>(`/api/client/projects/${id}/overview`,{signal:abort.signal});
      if(!live.current || abort.signal.aborted || current!==generation.current || selection.current!==id || !verified.current)return;
      if(result.clientId!==client.id || result.workspaceId!==client.workspaceId)throw new ApiError(401,"Your account changed. Confirm it again before recovering or sending messages.");
      setDetail(result); if(refreshFeeds)setUpdateRevision(value=>value+1);
      if(recover && draftMemory.scope===scope){const draft=draftMemory.drafts[id];setBody(draft?.body || "");key.current=draft?.submission || null;if(draft?.body.trim())setNotice("Your unsent message was recovered after this account and project's access were confirmed.");}
    } catch(failure) {
      if(live.current && current===generation.current && !(failure instanceof DOMException && failure.name==="AbortError")){
        if(failure instanceof ApiError && [403,404].includes(failure.status))unavailable(id);
        fail(failure);
      }
    } finally { if(live.current && current===generation.current)setLoading(false); }
  }
  useEffect(() => {
    live.current=true;verified.current=false;setReady(false);const current=++bootstrap.current,abort=new AbortController();
    void (async()=>{try{
      const identity=await api<{authenticated:boolean;client?:{id:string;workspaceId:string}}>("/api/client/auth/session",{signal:abort.signal});
      if(!live.current || current!==bootstrap.current)return;
      if(!identity.authenticated || identity.client?.id!==client.id || identity.client.workspaceId!==client.workspaceId)throw new ApiError(401,"Confirm your account again before recovering messages.");
      if(draftMemory.scope!==scope){draftMemory.scope=scope;draftMemory.drafts={};draftMemory.selected="";publishDrafts();}
      verified.current=true;setReady(true);await list(null,"first");if(!live.current || current!==bootstrap.current || !verified.current)return;setLoading(false);
      if(draftMemory.selected){selection.current=draftMemory.selected;setSelected(draftMemory.selected);await load(draftMemory.selected,true);}
    }catch(failure){if(current===bootstrap.current && !(failure instanceof DOMException && failure.name==="AbortError")){setLoading(false);fail(failure);}}})();
    return()=>{live.current=false;verified.current=false;++bootstrap.current;++generation.current;++projectGeneration.current;projectRequest.current?.abort();overviewRequest.current?.abort();abort.abort();};
  },[scope,identityRevision]);
  async function perform(action: () => Promise<void>) { if (pending.current) return; pending.current = true; setBusy(true); setError(""); setNotice(""); try { await action(); } catch (failure) { fail(failure); } finally { pending.current = false; if (live.current) setBusy(false); } }
  function choose(id: string) { if(pending.current || busy || !ready || !verified.current)return;setBody("");setHistoryOpen(false);selection.current=id;setSelected(id);draftMemory.selected=id;setDetail(null);setError("");key.current=null;void load(id,true); }
  async function send(event: FormEvent<HTMLFormElement>) {event.preventDefault();if(!ready || !verified.current || !body.trim() || detail?.project.id!==selected)return;const target=selected,text=body.trim();await perform(async()=>{
    if(!key.current || key.current.body!==text)key.current={body:text,key:crypto.randomUUID()};
    draftMemory.drafts[target]={body,submission:key.current};publishDrafts();
    try { await api(`/api/client/projects/${target}/messages`,{method:"POST",body:JSON.stringify({body:text,submissionKey:key.current.key})}); }
    catch(failure){if(failure instanceof ApiError && [403,404].includes(failure.status))unavailable(target);throw failure;}
    if(live.current && draftMemory.scope===scope){if(draftMemory.drafts[target]?.body.trim()===text)delete draftMemory.drafts[target];publishDrafts();if(selection.current===target){setBody("");key.current=null;setNotice("Your message is saved in the team inbox. This does not confirm it has been read.");setLatestRevision(value=>value+1);await load(target);}}
  });}
  async function password(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; if (!validateOwnerPasswords(form)) return; if ((draftDirty || preferencesDirty) && !window.confirm("Changing your password signs you out. Discard retained project messages and unsaved contact preferences?")) return; const values = new FormData(form); await perform(async () => { await api("/api/client/auth/password", { method: "POST", body: JSON.stringify({ currentPassword: values.get("currentPassword"), password: values.get("password") }) }); if (live.current) { form.reset(); setPasswordDirty(false); setBody(""); onLogout(); } }); }
  const shownProjects = projects.filter(project => matchesFilter(query, project.subject, project.id, project.state, project.nextStep));
  return <section className="studio-section client-workspace"><header><div className="client-welcome-identity"><PersonAvatar name={client.displayName} /><div><p className="studio-eyebrow">PRIVATE CLIENT WORKSPACE</p><h1>Hello, {client.displayName}.</h1><p>See the next step, review updates and talk to the team about your project.</p></div></div><button className="admin-secondary" disabled={busy} onClick={() => { if (dirty && !window.confirm("Discard unsaved changes and sign out?")) return; void perform(async () => { await api("/api/client/auth/logout", { method: "POST" }); onLogout(); }); }}>Sign out</button></header><OwnerError message={error} />{notice && <p role="status" className="admin-notice">{notice}</p>}{error && <button className="admin-secondary" disabled={busy} onClick={() => { if ((!passwordDirty && !preferencesDirty) || window.confirm("Return to sign-in? Unsent project messages will stay in this tab; password input and unsaved contact preferences will be discarded.")) onExpired(); }}>Return to sign-in</button>}
    {!ready && error && <button className="admin-secondary" disabled={busy || loading} onClick={()=>{setError("");setLoading(true);setIdentityRevision(value=>value+1);}}>Retry workspace identity check</button>}
    <div className="support-inbox-layout"><aside><h2 ref={projectsHeading} tabIndex={-1}>Your projects</h2><p>Unsent messages stay separately for each project in this tab.</p><button className="admin-secondary" disabled={busy || projectsLoading || !ready} onClick={() => void list()}>Refresh projects</button>{projectPage && <p>{projectPage.total} linked projects at last refresh · newest created first.</p>}<nav className="team-history-nav" aria-label="Client project pages"><button className="admin-secondary" disabled={busy || projectsLoading || !ready || !projectHistory.length} onClick={()=>void list(projectHistory[projectHistory.length-1],"newer")}>Newer projects</button><button className="admin-secondary" disabled={busy || projectsLoading || !ready || !projectPage?.nextCursor} onClick={()=>{if(projectPage?.nextCursor)void list(projectPage.nextCursor,"older");}}>Older projects</button><button className="admin-text-button" disabled={busy || projectsLoading || !ready || projectCursor===null} onClick={()=>void list(null,"first")}>Newest projects</button></nav>{detail && !projects.some(project=>project.id===detail.project.id) && <p>Open project: {detail.project.subject}. It is outside this sidebar page.</p>}<PageFilter label="Find a loaded project" value={query} onChange={setQuery} shown={shownProjects.length} total={projects.length} disabled={busy || !ready} loading={projectsLoading} /><ul className="support-request-list" tabIndex={0} aria-label="Project choices">{shownProjects.map(project => <li key={project.id}><button disabled={busy || projectsLoading || !ready} aria-current={selected === project.id ? "page" : undefined} onClick={() => choose(project.id)}><strong>{project.subject}</strong><span>{draftMemory.drafts[project.id]?.body.trim() ? "Unsent message · " : ""}{project.state.toLowerCase().replace(/_/g," ")}</span><small>{project.progress}%</small></button></li>)}</ul>{projectsLoading && <p role="status">Loading projects…</p>}{!projectsLoading && !projects.length && <p>{!ready ? "Confirm your account to load linked projects." : projectCursor ? "No projects on this page. Return to the newest projects or refresh." : "No projects are linked yet. Contact the team if you expected one here."}</p>}</aside>
    <div>{detail ? <article className="support-request-detail"><h2>{detail.project.subject}</h2><p>Reference: <code>{detail.project.id}</code></p><CopyButton label="Copy project reference" value={detail.project.id} /><ProjectProgress state={detail.project.state} progress={detail.project.progress} nextStep={detail.project.nextStep} projectScope={detail.project.projectScope} showScope /><button className="admin-secondary" disabled={busy || loading} onClick={() => void load(selected)}>Refresh updates</button>
      <ClientUpdateFeed key={`${selected}:conversation`} project={selected} kind="conversation" revision={updateRevision} latestRevision={latestRevision} disabled={busy || !ready} onUnavailable={()=>void load(selected,false,false)} onExpired={()=>fail(new ApiError(401,"Your session has ended. Your unsaved project message remains here."))}/>
      <form className="admin-form" onSubmit={event => void send(event)}><label>Your message<textarea required disabled={busy || !ready} maxLength={4000} value={body} onChange={event => changeBody(event.target.value)} /></label><button className="admin-primary" disabled={busy || !ready || !body.trim()}>Send to the team</button><button type="button" className="admin-text-button" disabled={busy || !body.trim()} onClick={()=>{if(window.confirm("Discard this project’s unsent message?"))changeBody("");}}>Discard this message</button></form>
      {!!detail.files.length && <section><h3>Approved reference files</h3><ul>{detail.files.map(file => <li key={file.id}><a href={`/api/client/projects/files/${file.id}`}>Download {file.filename}</a> · {Math.ceil(file.sizeBytes/1024)}KB</li>)}</ul></section>}
      <details onToggle={event=>{if(event.target===event.currentTarget)setHistoryOpen(event.currentTarget.open);}}><summary>Project history</summary>{historyOpen && <ClientUpdateFeed key={`${selected}:history`} project={selected} kind="history" revision={updateRevision} disabled={busy || !ready} onUnavailable={()=>void load(selected,false,false)} onExpired={()=>fail(new ApiError(401,"Your session has ended. Your unsaved project message remains here."))}/>}</details>
    </article> : <p>{selected && loading ? "Opening your project…" : "Choose a project to see updates and messages."}</p>}</div></div>
    {ready && <ClientBilling accountId={client.id} workspaceId={client.workspaceId} disabled={busy || !ready} onBusy={setBillingBusy} onExpired={()=>fail(new ApiError(401,"Your session has ended. Sign in again before viewing billing."))}/>}
    <ClientContactPreferences clientId={client.id} workspaceId={client.workspaceId} ready={ready} disabled={busy} onBusy={setPreferencesBusy} onDirty={setPreferencesDirty} onExpired={()=>fail(new ApiError(401,"Your session has ended. Sign in again to change contact preferences."))}/>
    {ready && <details><summary>Change your password</summary><form className="admin-form" onInput={() => setPasswordDirty(true)} onSubmit={event => void password(event)}><fieldset disabled={busy}><PasswordField label="Current password" name="currentPassword" /><PasswordField label="New password" name="password" fresh /><PasswordField label="Confirm password" confirm="password" /><p>Changing your password signs out all existing sessions.</p><button className="admin-primary">Change password and sign out</button></fieldset></form></details>}
  </section>;
}
