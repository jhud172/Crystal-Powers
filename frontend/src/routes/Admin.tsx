import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { OwnerSession, OwnerSignIn } from "../features/admin/OwnerSignIn";
import { ProjectEditor } from "../features/admin/ProjectEditor";
import { OwnerRecovery } from "../features/admin/OwnerRecovery";
import { ProjectDashboard } from "../features/admin/ProjectDashboard";
import { OwnerError } from "../features/admin/OwnerError";
import { OwnerSettings } from "../features/admin/OwnerSettings";
import { TeamMembers } from "../features/admin/TeamMembers";
import { OwnerReauthentication } from "../features/admin/OwnerReauthentication";
import { api, ApiError, clearCsrf, ProjectContent, ProjectDraft } from "../features/portfolio/projectApi";

const blank: ProjectContent = { title: "", category: "WEBSITE", summary: "", overview: "", approach: "", outcome: "", liveUrl: "", technologies: [], displayDevice: "laptop", coverMediaId: null, coverAlt: "", gallery: [] };
export default function Admin() {
  const navigate = useNavigate();
  const [session, setSession] = useState<OwnerSession | null>(null);
  const [projects, setProjects] = useState<ProjectDraft[]>([]);
  const [selected, setSelected] = useState<ProjectDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const loadGeneration = useRef(0);
  const operation = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reauth, setReauth] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [reauthenticationVersion, setReauthenticationVersion] = useState(0);
  const reauthFocus = useRef<HTMLElement | null>(null);
  const requestReauthentication = useCallback(() => {
    reauthFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSessionEnded(true); setReauth(true);
  }, []);
  function closeReauthentication() {
    setReauth(false);
    requestAnimationFrame(() => {
      const previous = reauthFocus.current;
      if (previous?.isConnected && !previous.matches(":disabled")) previous.focus({ preventScroll: true });
      else document.getElementById("owner-resume-signin")?.focus({ preventScroll: true });
    });
  }
  const [settings, setSettings] = useState(false);
  const [team, setTeam] = useState(false);
  const loadProjects = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setProjectsLoading(true); setLoadError("");
    try { const result = await api<ProjectDraft[]>("/api/admin/projects"); if (generation === loadGeneration.current) setProjects(result); }
    catch (failure) { if (generation === loadGeneration.current) { setLoadError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) requestReauthentication(); } }
    finally { if (generation === loadGeneration.current) setProjectsLoading(false); }
  }, [requestReauthentication]);
  useEffect(() => () => { loadGeneration.current++; }, []);
  useEffect(() => { let live = true; void api<OwnerSession>("/api/admin/auth/session").then(value => { if (live) setSession(value); }).catch(failure => { if (live) setError(failure.message); }); return () => { live = false; }; }, []);
  useEffect(() => { if (session?.authenticated) void loadProjects(); }, [session?.authenticated, loadProjects]);
  async function newProject(title: string, slug: string) {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError("");
    try { const created = await api<ProjectDraft>("/api/admin/projects", { method: "POST", body: JSON.stringify({ slug, content: { ...blank, title } }) }); setProjects(current => [created, ...current]); setSelected(created); }
    catch (failure) { setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 401) requestReauthentication(); }
    finally { operation.current = false; setBusy(false); }
  }
  async function presentation(project: ProjectDraft, change: Partial<ProjectDraft>) {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError("");
    try { await api(`/api/admin/projects/${project.id}/presentation`, { method: "PATCH", body: JSON.stringify({ featured: project.featured, sortOrder: project.sortOrder, archived: project.archived, expectedUpdatedAt: project.updatedAt, ...change }) }); await loadProjects(); }
    catch (failure) { setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 409) setLoadError(failure.message); if (failure instanceof ApiError && failure.status === 401) requestReauthentication(); } finally { operation.current = false; setBusy(false); }
  }
  async function orderProjects(ordered: ProjectDraft[]) {
    if (operation.current) return;
    const items = ordered.map((project, index) => ({ id: project.id, expectedUpdatedAt: project.updatedAt, sortOrder: index }));
    if (!items.length || ordered.every((project, index) => project.sortOrder === index)) return;
    operation.current = true; setBusy(true); setError("");
    try { setProjects(await api<ProjectDraft[]>("/api/admin/projects/ordering", { method: "POST", body: JSON.stringify({ items }) })); }
    catch (failure) { setError((failure as Error).message); if (failure instanceof ApiError && failure.status === 409) setLoadError(failure.message); if (failure instanceof ApiError && failure.status === 401) requestReauthentication(); }
    finally { operation.current = false; setBusy(false); }
  }
  async function signOut() {
    if (operation.current || editorBusy || (dirty && !window.confirm("Sign out? Any unsaved changes in this editor will be lost."))) return;
    operation.current = true; setBusy(true); setError("");
    try {
      await api("/api/admin/auth/logout", { method: "POST" }); clearCsrf();
      setSessionEnded(false); setReauth(false);
      setSelected(null); setTeam(false); setSettings(false); loadGeneration.current++; setProjectsLoading(false); setProjects([]);
      setSession(null);
      setSession(await api<OwnerSession>("/api/admin/auth/session"));
    } catch (failure) { setError((failure as Error).message); }
    finally { operation.current = false; setBusy(false); }
  }
  if (window.location.pathname.replace(/\/+$/, "") === "/admin/reset") return <div className="admin-studio"><OwnerRecovery onBack={() => window.location.assign("/admin")} /></div>;
  if (!session) return <div className="studio-section admin-studio"><p role="status">{error || (busy ? "Finishing sign-out…" : "Opening the owner studio…")}</p>{error && <button className="admin-secondary" onClick={() => window.location.reload()}>Try again</button>}</div>;
  if (!session.authenticated) return <div className="admin-studio"><OwnerSignIn initial={session} onSignedIn={setSession} /></div>;
  return <div className="admin-studio studio-section">
    <div className="admin-topbar"><p className="studio-eyebrow">OWNER STUDIO / {session.email}</p>{!settings && <><button className="admin-text-button" disabled={busy || editorBusy} onClick={() => { if (dirty && !window.confirm("Open team members? Unsaved project edits will be lost.")) return; setSelected(null); setTeam(true); }}>Team members</button><button className="admin-text-button" disabled={busy || editorBusy} onClick={() => { if (dirty && !window.confirm("Open the workspace? Unsaved project edits will be lost.")) return; navigate("/team"); }}>Team workspace</button><button className="admin-text-button" disabled={busy || editorBusy} onClick={() => { if (dirty && !window.confirm("Open account security? Unsaved project edits will be lost.")) return; setSelected(null); setTeam(false); setSettings(true); }}>Account security</button><button className="admin-text-button" disabled={busy || editorBusy} onClick={() => void signOut()}>Sign out</button></>}</div>
    <OwnerError message={error} />
    {sessionEnded && <div className="admin-notice" role="status"><p>{selected ? "Your session has ended. You can keep shaping this draft in this tab, but you must sign in before saving, uploading or publishing. Refreshing or closing the tab will lose unsaved edits." : "Your session has ended. Sign in again before making changes in the owner studio."}</p><button id="owner-resume-signin" className="admin-secondary" disabled={busy || editorBusy} onClick={requestReauthentication}>Sign in again</button></div>}
    {settings ? <OwnerSettings onBack={() => setSettings(false)} onSessionExpired={requestReauthentication} reauthenticationVersion={reauthenticationVersion} /> : team ? <TeamMembers onBack={() => setTeam(false)} onSessionExpired={requestReauthentication} /> : selected ? <ProjectEditor key={selected.id} project={selected} reauthenticationVersion={reauthenticationVersion} onDirtyChange={setDirty} onBusyChange={setEditorBusy} onUpdate={project => { setSelected(project); setProjects(current => current.map(item => item.id === project.id ? project : item)); }} onBack={() => { setSelected(null); void loadProjects(); }} onSessionExpired={requestReauthentication} /> : <ProjectDashboard projects={projects} loading={projectsLoading} loadError={loadError} busy={busy} onReload={() => { setError(""); void loadProjects(); }} onOpen={setSelected} onCreate={newProject} onPresentation={presentation} onOrder={orderProjects} />}

    {reauth && <OwnerReauthentication hasDraft={!!selected} onClose={closeReauthentication} onResume={current => { setReauthenticationVersion(value => value + 1); setSession(current); setSessionEnded(false); setError(""); closeReauthentication(); void loadProjects(); }} onLeave={() => {
      // The owner has confirmed discard. Remove the private flow and its guard before navigating.
      flushSync(() => { loadGeneration.current++; setSelected(null); setProjects([]); setSettings(false); setReauth(false); });
      navigate("/");
    }} />}
  </div>;
}

