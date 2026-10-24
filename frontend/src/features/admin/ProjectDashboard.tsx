import { useState } from "react";
import { categoryLabel, imageUrl, ProjectDraft } from "../portfolio/projectApi";
import { NewProjectForm } from "./NewProjectForm";

type Filter = "current" | "draft" | "published" | "archived";
type Props = { projects: ProjectDraft[]; loading: boolean; loadError: string; busy: boolean; onReload: () => void; onOpen: (project: ProjectDraft) => void; onCreate: (title: string, slug: string) => Promise<void>; onPresentation: (project: ProjectDraft, change: Partial<ProjectDraft>) => Promise<void>; onOrder: (projects: ProjectDraft[]) => Promise<void> };

export function ProjectDashboard({ projects, loading, loadError, busy, onReload, onOpen, onCreate, onPresentation, onOrder }: Props) {
  const [filter, setFilter] = useState<Filter>("current");
  const [sort, setSort] = useState("display");
  const [create, setCreate] = useState(false);
  const [search, setSearch] = useState("");
  const current = projects.filter(project => !project.archived);
  const groups: Record<Filter, ProjectDraft[]> = { current, draft: current.filter(project => project.publishedVersion === null), published: current.filter(project => project.publishedVersion !== null), archived: projects.filter(project => project.archived) };
  const visible = groups[filter].filter(project => !search || `${project.content.title} ${project.slug}`.toLocaleLowerCase("en-GB").includes(search.toLocaleLowerCase("en-GB"))).slice();
  if (sort === "recent") visible.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  if (sort === "title") visible.sort((a, b) => a.content.title.localeCompare(b.content.title, "en-GB"));
  const disabled = busy || loading || !!loadError;
  async function move(project: ProjectDraft, offset: number) {
    const neighbour = visible[visible.findIndex(item => item.id === project.id) + offset];
    if (!neighbour || disabled || sort !== "display") return;
    const ordered = projects.filter(item => item.archived === project.archived);
    const from = ordered.findIndex(item => item.id === project.id), to = ordered.findIndex(item => item.id === neighbour.id);
    ordered.splice(from, 1); ordered.splice(to, 0, project);
    await onOrder(ordered);
  }
  function archive(project: ProjectDraft) {
    const consequence = project.archived ? project.publishedVersion ? `Its published revision ${project.publishedVersion} will be visible again. Newer draft edits stay private.` : "It returns to your private drafts." : "It will disappear from the public showcase. Its drafts, revisions and images are kept.";
    if (window.confirm(`${project.archived ? "Restore" : "Archive"} “${project.content.title}”? ${consequence}`)) void onPresentation(project, { archived: !project.archived });
  }
  return <>
    <div className="admin-dashboard-heading"><div><p className="studio-eyebrow">PROJECT LIBRARY</p><h1>Your work,<br /><span className="studio-soft">ready for the world.</span></h1><p>Shape the story. Preview the details. Publish when it feels right.</p></div><button className="studio-button" disabled={busy} onClick={() => setCreate(value => !value)}>{create ? "Cancel" : "New project +"}</button></div>
    {create && <NewProjectForm busy={busy} onCreate={onCreate} />}
    <div className="admin-collection-controls"><div className="studio-device-tabs" role="group" aria-label="Project list">{([["current", "Current projects"], ["draft", "Private drafts"], ["published", "Published"], ["archived", "Archived"]] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span aria-hidden="true"> {groups[value].length}</span></button>)}</div>
      <div className="admin-sort-field"><label htmlFor="dashboard-sort">Sort projects</label><select id="dashboard-sort" value={sort} onChange={event => setSort(event.target.value)}><option value="display">Display order</option><option value="recent">Recently updated</option><option value="title">Project title</option></select></div>
      <label>Find a project<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Title or address" /></label>
    </div>
    <p className="admin-list-summary" role="status" aria-live="polite">{loading ? "Loading saved projects…" : `${visible.length} ${visible.length === 1 ? "project" : "projects"}${search ? " matching your search" : " in this view"}.`}{sort !== "display" && " Choose Display order to move projects."}</p>
    {loading && <p role="status" className="admin-notice">Loading your project library…</p>}
    {loadError && <div className="admin-error" role="alert"><p>{loadError}</p><p>Any projects shown below are from your last successful load. Reload before making changes.</p><button className="admin-secondary" disabled={loading} onClick={onReload}>Reload projects</button></div>}
    <div className="admin-projects">{visible.map((project, index) => <article key={project.id} className="admin-project-row" data-spotlight>
      <div className="admin-project-identity">{project.content.coverMediaId ? <img className="admin-project-thumbnail" src={imageUrl(project.content.coverMediaId, true)} alt={project.content.coverAlt || ""} loading="lazy" /> : <div className="admin-project-thumbnail admin-no-cover" aria-label="No cover image yet">◇</div>}<div><p className="studio-eyebrow">{categoryLabel[project.content.category]} / {project.archived ? "ARCHIVED" : project.publishedVersion ? `PUBLISHED · REVISION ${project.publishedVersion}` : "PRIVATE DRAFT"}</p><h2><button className="admin-title-button" onClick={() => onOpen(project)}>{project.content.title || "Untitled project"}</button></h2><p className="studio-soft">/portfolio/{project.slug}</p><p className="admin-draft-state">Draft {project.version}{project.publishedVersion ? project.version === project.publishedVersion ? " · Matches the published version" : " · Newer edits are private" : " · Not published"}{project.featured ? " · Featured" : ""}</p><p className="studio-soft">Updated <time dateTime={project.updatedAt}>{new Date(project.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time></p></div></div>
      <div className="admin-project-actions"><label className="admin-check"><input type="checkbox" checked={project.featured} disabled={disabled} onChange={event => void onPresentation(project, { featured: event.target.checked })} /> Featured</label><label>Order<input type="number" aria-label={`Display order for ${project.content.title}`} defaultValue={project.sortOrder} key={`${project.id}-${project.sortOrder}`} min={-10000} max={10000} disabled={disabled} onBlur={async event => { const input = event.currentTarget; const value = input.valueAsNumber; if (!Number.isInteger(value) || Math.abs(value) > 10000) { event.target.value = String(project.sortOrder); return; } if (value !== project.sortOrder) { await onPresentation(project, { sortOrder: value }); input.value = String(project.sortOrder); } }} /></label>
        <div className="admin-order-controls" role="group" aria-label={`Move ${project.content.title}`}><button className="admin-secondary" aria-label={`Move ${project.content.title} up`} disabled={disabled || sort !== "display" || index === 0} onClick={() => void move(project, -1)}>↑</button><button className="admin-secondary" aria-label={`Move ${project.content.title} down`} disabled={disabled || sort !== "display" || index === visible.length - 1} onClick={() => void move(project, 1)}>↓</button></div><button className="admin-secondary" disabled={disabled} onClick={() => archive(project)}>{project.archived ? "Restore project" : "Archive project"}</button><button className="admin-secondary" onClick={() => onOpen(project)}>Edit project ↗</button>
      </div>
    </article>)}</div>
    {!loading && !loadError && visible.length === 0 && <div className="studio-empty"><h2>{filter === "archived" ? "No archived projects." : search ? "No matching projects." : filter === "published" ? "Nothing published yet." : filter === "draft" ? "No private drafts." : "Your next story starts here."}</h2><p>{filter === "current" && !search ? "Create a private draft, add the real project details and preview it before publishing." : "Choose another view to see the rest of your library."}</p>{search && <button className="admin-secondary" onClick={() => setSearch("")}>Clear search</button>}</div>}
  </>;
}
