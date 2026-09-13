import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { OwnerSession, OwnerSignIn } from "../features/admin/OwnerSignIn";
import { ProjectEditor } from "../features/admin/ProjectEditor";
import { OwnerRecovery } from "../features/admin/OwnerRecovery";
import { OwnerSettings } from "../features/admin/OwnerSettings";
import { api, ApiError, clearCsrf, ProjectContent, ProjectDraft } from "../features/portfolio/projectApi";

const blank: ProjectContent = { title: "", category: "WEBSITE", summary: "", overview: "", approach: "", outcome: "", liveUrl: "", technologies: [], displayDevice: "laptop", coverMediaId: null, coverAlt: "", gallery: [] };
export default function Admin() {
  const [session, setSession] = useState<OwnerSession | null>(null);
  const [projects, setProjects] = useState<ProjectDraft[]>([]);
  const [selected, setSelected] = useState<ProjectDraft | null>(null);
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reauth, setReauth] = useState(false);
  const reauthDialog = useRef<HTMLDialogElement>(null);
  const [archive, setArchive] = useState(false);
  const [settings, setSettings] = useState(false);
  const loadProjects = useCallback(async () => { try { setProjects(await api("/api/admin/projects")); setError(""); } catch (failure) { setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) setReauth(true); } }, []);
  useEffect(() => { if (reauth) reauthDialog.current?.showModal(); }, [reauth]);
  useEffect(() => { let live = true; void api<OwnerSession>("/api/admin/auth/session").then(value => { if (live) setSession(value); }).catch(failure => { if (live) setError(failure.message); }); return () => { live = false; }; }, []);
  useEffect(() => { if (session?.authenticated) void loadProjects(); }, [session?.authenticated, loadProjects]);
  useEffect(() => {
    const previous = document.title; document.title = "Owner studio | Crystal Powers";
    const robots = document.createElement("meta"); robots.name = "robots"; robots.content = "noindex, nofollow"; document.head.append(robots);
    return () => { document.title = previous; robots.remove(); };
  }, []);
  async function newProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try { const created = await api<ProjectDraft>("/api/admin/projects", { method: "POST", body: JSON.stringify({ slug: form.get("slug"), content: { ...blank, title: form.get("title") } }) }); setProjects(current => [created, ...current]); setSelected(created); setCreate(false); }
    catch (failure) { setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) setReauth(true); } finally { setBusy(false); }
  }
  async function presentation(project: ProjectDraft, change: Partial<ProjectDraft>) {
    setBusy(true); setError("");
    try { await api(`/api/admin/projects/${project.id}/presentation`, { method: "PATCH", body: JSON.stringify({ featured: project.featured, sortOrder: project.sortOrder, archived: project.archived, ...change }) }); await loadProjects(); }
    catch (failure) { setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) setReauth(true); } finally { setBusy(false); }
  }
  if (window.location.pathname === "/admin/reset") return <div className="admin-studio"><OwnerRecovery onBack={() => window.location.assign("/admin")} /></div>;
  if (!session) return <div className="studio-section admin-studio"><p role="status">{error || "Opening the owner studio…"}</p>{error && <button className="admin-secondary" onClick={() => window.location.reload()}>Try again</button>}</div>;
  if (!session.authenticated) return <div className="admin-studio"><OwnerSignIn initial={session} onSignedIn={setSession} /></div>;
  return <div className="admin-studio studio-section">
    <div className="admin-topbar"><p className="studio-eyebrow">OWNER STUDIO / {session.email}</p><button className="admin-text-button" onClick={() => { if (selected && !window.confirm("Open account security? Unsaved project edits will be lost.")) return; setSelected(null); setSettings(true); }}>Account security</button><button className="admin-text-button" onClick={async () => { if (selected && !window.confirm("Sign out? Any unsaved changes in this editor will be lost.")) return; try { await api("/api/admin/auth/logout", { method: "POST" }); clearCsrf(); setSelected(null); setProjects([]); setSession(await api("/api/admin/auth/session")); } catch (failure) { setError((failure as Error).message); } }}>Sign out</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {settings ? <OwnerSettings onBack={() => setSettings(false)} /> : selected ? <ProjectEditor key={selected.id} project={selected} onUpdate={project => { setSelected(project); setProjects(current => current.map(item => item.id === project.id ? project : item)); }} onBack={() => { setSelected(null); void loadProjects(); }} onSessionExpired={() => setReauth(true)} /> : <>
      <div className="admin-dashboard-heading"><div><h1>Your work,<br /><span className="studio-soft">ready for the world.</span></h1><p>Shape the story. Preview the details. Publish when it feels right.</p></div><button className="studio-button" onClick={() => setCreate(!create)}>{create ? "Cancel" : "New project +"}</button></div>
      {create && <form className="admin-form admin-create" onSubmit={newProject}><h2>A new beginning.</h2><label>Project title<input name="title" required maxLength={160} autoFocus /></label><label>Project address<input name="slug" required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="my-project" /><small>Lowercase letters, numbers and hyphens. This address stays with the project.</small></label><button className="studio-button" disabled={busy}>Create private draft ↗</button></form>}
      <div className="studio-device-tabs" role="group" aria-label="Project list"><button aria-pressed={!archive} onClick={() => setArchive(false)}>Current projects</button><button aria-pressed={archive} onClick={() => setArchive(true)}>Archived</button></div>
      <div className="admin-projects">{projects.filter(project => project.archived === archive).map(project => <article key={project.id}><div><p className="studio-eyebrow">{project.archived ? "ARCHIVED" : project.publishedVersion ? `PUBLISHED · REVISION ${project.publishedVersion}` : "PRIVATE DRAFT"}</p><h2><button className="admin-title-button" onClick={() => setSelected(project)}>{project.content.title || "Untitled project"}</button></h2><p className="studio-soft">/portfolio/{project.slug}</p></div><div className="admin-project-actions"><label className="admin-check"><input type="checkbox" checked={project.featured} disabled={busy} onChange={event => presentation(project, { featured: event.target.checked })} /> Featured</label><label>Order<input type="number" aria-label={`Display order for ${project.content.title}`} defaultValue={project.sortOrder} key={`${project.id}-${project.sortOrder}`} min={-10000} max={10000} disabled={busy} onBlur={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value !== project.sortOrder && Math.abs(value) <= 10000) void presentation(project, { sortOrder: value }); }} /></label><button className="admin-secondary" onClick={() => setSelected(project)}>Edit project ↗</button></div></article>)}</div>
      {projects.filter(project => project.archived === archive).length === 0 && <p className="studio-empty">{archive ? "No archived projects." : "Create your first project to begin."}</p>}
    </>}
    {reauth && <dialog ref={reauthDialog} className="admin-reauth" onCancel={event => event.preventDefault()} aria-label="Sign in again"><p>Your unsaved draft is held in this page. Sign in again to continue.</p><OwnerSignIn initial={{ authenticated: false, mfaRequired: false, enrolmentRequired: false, setupAvailable: false }} onSignedIn={current => { setSession(current); setReauth(false); void loadProjects(); }} /></dialog>}
  </div>;
}

