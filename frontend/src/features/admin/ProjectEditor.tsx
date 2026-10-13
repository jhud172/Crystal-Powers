import type { ProjectEditorDraft } from "../portfolio/projectApi";
import { ProjectRevisions } from "./ProjectRevisions";
import { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, ApiError, categoryLabel, imageUrl, ProjectContent, ProjectDraft, ProjectImage } from "../portfolio/projectApi";
import { PrivateProjectPreview } from "./PrivateProjectPreview";
import { OwnerError } from "./OwnerError";
import { ProjectTeamAccess } from "./ProjectTeamAccess";
import { ProjectScreenFields } from "./ProjectScreenFields";
import { useNavigationProtection } from "../../app/NavigationProtection";

export function ProjectEditor({ project, onUpdate, onBack, onSessionExpired, onDirtyChange, onBusyChange, reauthenticationVersion, accessArea = "owner", canPublish = true, initialContent, recoveredConflict = false, recoveredNotice = "", onDraftChange }: { project: ProjectDraft; onUpdate: (project: ProjectDraft) => void; onBack: () => void; onSessionExpired: () => void; onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void; reauthenticationVersion: number; accessArea?: "owner" | "team"; canPublish?: boolean; initialContent?: ProjectContent; recoveredConflict?: boolean; recoveredNotice?: string; onDraftChange?: (draft:ProjectEditorDraft | null)=>void }) {
  const privateArea=accessArea==="team" ? "team" : "admin";
  const projectBase=`/api/${privateArea}/projects`;
  const [content, setContent] = useState<ProjectContent>(initialContent ?? project.content);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [step, setStep] = useState("Details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(recoveredNotice);
  const [conflict, setConflict] = useState(recoveredConflict);
  const [focusField, setFocusField] = useState("");
  const [publishReview, setPublishReview] = useState(false);
  const [approved, setApproved] = useState(false);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const publishButton = useRef<HTMLButtonElement>(null);
  const lastReauthentication = useRef(reauthenticationVersion);
  useEffect(() => {
    if (reauthenticationVersion === lastReauthentication.current) return;
    lastReauthentication.current = reauthenticationVersion;
    setError(""); setNotice("Signed in again. Your draft is still here. Review and retry the action; nothing has been retried automatically. For an interrupted upload, choose the image again.");
  }, [reauthenticationVersion]);
  const dirty = JSON.stringify(content) !== JSON.stringify(project.content);
  useLayoutEffect(()=>{onDraftChange?.(dirty ? {base:project,content} : null);},[project,content,dirty,onDraftChange]);
  useNavigationProtection(dirty, "Leave this editor and discard unsaved edits?");
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { onDirtyChange(false); onBusyChange(false); }, [onDirtyChange, onBusyChange]);
  const screenDescriptionsReady = Object.values(content.screens ?? {}).every(item => !item || !!item.alt.trim());
  const ready = !!(content.title.trim() && content.summary.trim() && content.coverMediaId && content.coverAlt.trim() && content.gallery.every(item => item.alt.trim()) && screenDescriptionsReady);
  const fail = (failure: unknown) => { if (failure instanceof ApiError && failure.status === 409) setConflict(true); setError(failure instanceof Error ? failure.message : "The change could not be completed."); if (failure instanceof ApiError && failure.status === 401) onSessionExpired(); };
  useLayoutEffect(() => { if (focusField) { const field = document.getElementById(focusField); field?.focus(); field?.scrollIntoView({ block: "center", behavior: "instant" }); setFocusField(""); } }, [step, focusField]);
  useEffect(() => { if (publishReview) reviewDialog.current?.showModal(); }, [publishReview]);
  function closeReview(returnFocus = true) {
    reviewDialog.current?.close(); setPublishReview(false); setApproved(false);
    if (returnFocus) queueMicrotask(() => publishButton.current?.focus({ preventScroll: true }));
  }
  function visit(section: string, field: string) { setStep(section); setFocusField(field); }
  const readiness = [
    { label: "Project title", complete: !!content.title.trim(), section: "Details", field: "project-title" },
    { label: "Short introduction", complete: !!content.summary.trim(), section: "Details", field: "project-summary" },
    { label: "Cover image", complete: !!content.coverMediaId, section: "Images", field: "project-upload" },
    { label: "Image descriptions", complete: !!content.coverAlt.trim() && content.gallery.every(item => item.alt.trim()) && screenDescriptionsReady, section: "Images", field: !content.coverAlt.trim() ? "project-cover-description" : content.gallery.some(item => !item.alt.trim()) ? `project-gallery-${content.gallery.findIndex(item => !item.alt.trim())}` : !content.screens?.desktop?.alt.trim() && content.screens?.desktop ? "project-desktop-description" : "project-mobile-description" },
    { label: "Latest changes saved", complete: !dirty && !conflict, section: step, field: conflict ? "project-reload" : "project-save" }
  ];
  useEffect(() => { let live = true; void api<ProjectImage[]>(`${projectBase}/${project.id}/media`).then(value => { if (live) setImages(value); }).catch(failure => { if (live) fail(failure); }); return () => { live = false; }; }, [project.id,projectBase]);
  const update = <K extends keyof ProjectContent>(key: K, value: ProjectContent[K]) => { setContent(current => ({ ...current, [key]: value })); setNotice(""); };
  async function save() {
    if (busy || (accessArea==="team" && conflict)) return;
    setBusy(true); setError(""); setNotice("");
    try { const result = await api<ProjectDraft>(`${projectBase}/${project.id}`, { method: "PUT", body: JSON.stringify({ expectedVersion: project.version, content }) }); onUpdate(result); setContent(result.content); setNotice("Draft saved. The public version stays as it was until you publish."); }
    catch (failure) { fail(failure); } finally { setBusy(false); }
  }
  async function action(kind: "publish" | "unpublish" | "archive" | "restore") {
    if (busy || (accessArea==="team" && conflict) || (!canPublish && (kind==="publish" || kind==="unpublish" || !!project.publishedVersion))) return;
    if (kind === "restore" && !window.confirm(`Restore “${project.content.title}”? ${project.publishedVersion ? `Published revision ${project.publishedVersion} will be visible again; newer draft edits stay private.` : "The project returns to your private drafts."}`)) return;
    if ((kind === "unpublish" || kind === "archive") && !window.confirm(`This will hide “${project.content.title}” from the public showcase. Continue?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const presentation = kind === "archive" || kind === "restore";
      const result = await api<ProjectDraft>(`${projectBase}/${project.id}/${presentation ? "presentation" : kind}`, { method: presentation ? "PATCH" : "POST", body: JSON.stringify(presentation ? { featured: project.featured, sortOrder: project.sortOrder, archived: kind === "archive", expectedUpdatedAt: project.updatedAt } : kind==="unpublish" && accessArea==="team" ? {expectedUpdatedAt:project.updatedAt} : { expectedVersion: project.version }) });
      onUpdate(result); if (publishReview) closeReview(); setNotice(kind === "publish" ? "Published. Existing pages refresh automatically while visible and connected." : kind === "unpublish" ? "Unpublished. Your draft and images are still here." : kind === "archive" ? "Project archived." : "Project restored.");
    } catch (failure) { if (publishReview) closeReview(false); fail(failure); } finally { setBusy(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (file.size > 12_000_000) { setError("Choose an image under 12 MB."); return; }
    setBusy(true); setError("");
    const body = new FormData(); body.append("file", file);
    try { const image = await api<ProjectImage>(`${projectBase}/${project.id}/media`, { method: "POST", body }); setImages(current => [image, ...current]); if (!content.coverMediaId) update("coverMediaId", image.id); setNotice("Image uploaded privately. Choose where it appears, then save your draft."); }
    catch (failure) { fail(failure); } finally { setBusy(false); }
  }
  async function reload() {
    if (busy) return;
    if (dirty && !window.confirm("Reloading will replace your unsaved edits with the latest saved draft. Continue?")) return;
    setBusy(true);
    try { const result = await api<ProjectDraft>(`${projectBase}/${project.id}`); onUpdate(result); setContent(result.content); setError(""); setConflict(false); setNotice("Latest draft loaded."); }
    catch (failure) { fail(failure); } finally { setBusy(false); }
  }
  function toggleGallery(id: string) { update("gallery", content.gallery.some(item => item.mediaId === id) ? content.gallery.filter(item => item.mediaId !== id) : [...content.gallery, { mediaId: id, alt: "" }].slice(0, 16)); }
  async function restoreRevision(version: number) {
    if(busy || (accessArea==="team" && conflict))return;
    if (!window.confirm(`Restore revision ${version} as a new private draft? ${dirty ? "Unsaved edits will be replaced. " : ""}The published version will stay as it is.`)) return;
    setBusy(true); setError("");
    try { const result = await api<ProjectDraft>(`${projectBase}/${project.id}/revisions/${version}/restore`, { method: "POST", body: JSON.stringify({ expectedVersion: project.version }) }); onUpdate(result); setContent(result.content); setNotice(`Revision ${version} restored as draft ${result.version}. Review it before publishing.`); }
    catch (failure) { fail(failure); } finally { setBusy(false); }
  }
  return <div className="admin-editor">
    <div className="admin-editor-heading"><button className="admin-text-button" disabled={busy} onClick={() => { if (!dirty || window.confirm("Leave this editor and discard unsaved edits?")) onBack(); }}>← All projects</button><div><span className="admin-status">{project.archived ? "Archived" : project.publishedVersion ? "Published" : "Private draft"}</span><span className="studio-soft"> / Draft {project.version}{dirty ? " · Unsaved changes" : " · Saved"}</span></div></div>
    <h1>{content.title || "Untitled project"}</h1><p className="studio-soft">/portfolio/{project.slug}</p>
    <div className="admin-editor-toolbar"><p className="admin-toolbar-identity">{content.title || "Untitled project"}<span>{dirty ? "Unsaved changes" : `Saved draft ${project.version}`} / {project.publishedVersion ? `Public revision ${project.publishedVersion}` : "Private"}</span></p><div className="studio-device-tabs" role="group" aria-label="Editor sections">{["Details", "Images", "Story", "History", "Preview"].map(item => <button disabled={busy} key={item} aria-pressed={item === step} onClick={() => setStep(item)}>{item}</button>)}</div><button id="project-reload" className="admin-secondary" disabled={busy} onClick={reload}>Reload saved draft</button><button id="project-save" className="studio-button" disabled={busy || !dirty || conflict} onClick={save}>{busy ? "Working…" : "Save draft"}</button></div>
    <OwnerError message={error} />{conflict && <p className="admin-preview-banner">Your edits are still in this page. Copy anything you need before loading the newer saved draft. Reload asks before replacing unsaved edits.</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    {step === "Preview" ? <PrivateProjectPreview privateArea={privateArea} project={{ ...project, content }} onBack={() => { setStep("Details"); setFocusField("project-title"); }} /> : <div className="admin-editor-grid"><fieldset className="admin-form admin-editor-fields" disabled={busy}>
      {step === "Details" && <>
        <label>Project title<input id="project-title" value={content.title} onChange={event => update("title", event.target.value)} maxLength={160} required /></label>
        <div className="admin-fields-row"><label>Project type<select value={content.category} onChange={event => update("category", event.target.value as ProjectContent["category"])}>{Object.entries(categoryLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>3D display<select value={content.displayDevice} onChange={event => update("displayDevice", event.target.value as ProjectContent["displayDevice"])}><option value="laptop">Laptop</option><option value="monitor">Desktop monitor</option><option value="phone">Phone</option></select></label></div>
        <label>Short introduction<textarea id="project-summary" value={content.summary} onChange={event => update("summary", event.target.value)} maxLength={600} rows={4} required /><small>What did you make, and who is it for?</small></label>
        <label>Live website address <span className="studio-soft">(optional)</span><input type="url" value={content.liveUrl} onChange={event => update("liveUrl", event.target.value)} placeholder="https://" maxLength={2048} /><small>Visitors open this in a new tab. The editor does not fetch or embed the website.</small></label>
        <label>Technologies <span className="studio-soft">(optional)</span><input value={content.technologies.join(", ")} onChange={event => update("technologies", event.target.value.split(",").map(value => value.trimStart()).slice(0, 20))} maxLength={1200} /><small>Separate names with commas.</small></label>
      </>}
      {step === "Images" && <>
        <label className="admin-upload">Upload a screenshot<input id="project-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={busy} /><small>PNG, JPEG or WebP · Under 12 MB / 16 megapixels. Images are optimised and metadata removed. Up to 40 uploads per project.</small></label>
        <div className="admin-image-library">{images.map((image, index) => <article key={image.id}><img src={imageUrl(image.id, true,privateArea)} alt={`Uploaded project screenshot ${index + 1}`} loading="lazy" /><p>Image {index + 1} · {image.width} × {image.height} · {Math.ceil(image.bytes / 1000)} KB</p><label className="admin-check"><input type="radio" name="cover" checked={content.coverMediaId === image.id} onChange={() => update("coverMediaId", image.id)} /> Cover image</label><label className="admin-check"><input type="checkbox" checked={content.gallery.some(item => item.mediaId === image.id)} onChange={() => toggleGallery(image.id)} disabled={!content.gallery.some(item => item.mediaId === image.id) && content.gallery.length >= 16} /> Include in gallery</label></article>)}</div>
        <label>Cover image description<input id="project-cover-description" value={content.coverAlt} onChange={event => update("coverAlt", event.target.value)} maxLength={300} /><small>Describe what a visitor would see. This is also used by screen readers.</small></label>
        <ProjectScreenFields idPrefix="project" screens={content.screens} images={images} onChange={value => update("screens", value)} />
        {content.gallery.map((item, index) => <div className="admin-gallery-row" key={item.mediaId}><img src={imageUrl(item.mediaId, true,privateArea)} alt="" /><label>Gallery image {index + 1} description<input id={`project-gallery-${index}`} value={item.alt} onChange={event => update("gallery", content.gallery.map(image => image.mediaId === item.mediaId ? { ...image, alt: event.target.value } : image))} maxLength={300} /></label><button className="admin-secondary" aria-label={`Move gallery image ${index + 1} up`} disabled={index === 0} onClick={() => { const reordered = [...content.gallery]; [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]]; update("gallery", reordered); }}>Move up</button><button className="admin-secondary" aria-label={`Move gallery image ${index + 1} down`} disabled={index === content.gallery.length - 1} onClick={() => { const reordered = [...content.gallery]; [reordered[index + 1], reordered[index]] = [reordered[index], reordered[index + 1]]; update("gallery", reordered); }}>Move down</button><button className="admin-text-button" aria-label={`Remove gallery image ${index + 1}`} onClick={() => update("gallery", content.gallery.filter(image => image.mediaId !== item.mediaId))}>Remove</button></div>)}
      </>}
      {step === "History" && <ProjectRevisions base={`${projectBase}/${project.id}`} currentVersion={project.version} publishedVersion={project.publishedVersion} busy={busy} canRestore={accessArea!=="team" || !conflict} onRestore={restoreRevision} onFailure={fail}/>}
      {step === "Story" && ([['overview', 'The idea', 'Describe the original need, audience and agreed scope. For example: a clear place to explain services and enquire.'], ['approach', 'The approach', 'Explain the decisions you made and why: content, layout, accessibility, technology and collaboration. Describe the actual delivered work.'], ['outcome', 'The outcome', 'Describe what was delivered and how it helps people use the site. Include metrics or testimonials only when you have evidence and permission.']] as const).map(([key, label, hint]) => <label key={key}>{label}<textarea value={content[key]} onChange={event => update(key, event.target.value)} maxLength={8000} rows={8} /><small>{hint}</small></label>)}
    </fieldset><aside className="admin-publish-panel"><p className="studio-eyebrow">READY TO SHARE?</p><h2>From draft<br />to live.</h2><ul>{readiness.map(item => <li key={item.label}><button className="admin-readiness-link" disabled={busy} onClick={() => visit(item.section, item.field)}><span aria-hidden="true">{item.complete ? "✓" : "○"}</span>{item.label}<span className="admin-readiness-state">{item.complete ? "Ready" : item.label === "Latest changes saved" ? conflict ? "Reload required" : "Save needed" : "Add this"}</span></button></li>)}</ul><p>{canPublish ? "Review the preview and confirm that the project and its claims are yours to share." : "Your role can edit private drafts. Publication and changes to published visibility require a separate permission."}</p><button ref={publishButton} className="studio-button" disabled={busy || dirty || !ready || conflict || !canPublish} onClick={() => { setApproved(false); setPublishReview(true); }}>{project.publishedVersion ? "Publish this revision ↗" : "Publish project ↗"}</button>{project.publishedVersion && <button className="admin-text-button" disabled={busy || !canPublish || (accessArea==="team" && conflict)} onClick={() => action("unpublish")}>Unpublish project</button>}<button className="admin-text-button" disabled={busy || (accessArea==="team" && conflict) || (!canPublish && !!project.publishedVersion)} onClick={() => action(project.archived ? "restore" : "archive")}>{project.archived ? "Restore project" : "Archive project"}</button>{accessArea==="owner" && <ProjectTeamAccess project={project} disabled={busy || dirty || conflict} onUpdate={onUpdate} onBusy={setBusy} onExpired={onSessionExpired}/>}</aside></div>}
    {publishReview && <dialog ref={reviewDialog} className="admin-publish-review" aria-labelledby="publish-review-title" onCancel={event => { event.preventDefault(); if (!busy) closeReview(); }}>
      <p className="studio-eyebrow">PUBLICATION REVIEW</p><h2 id="publish-review-title">Publish saved revision {project.version}?</h2><p><strong>{project.content.title}</strong> at /portfolio/{project.slug}</p>
      <p>{project.publishedVersion ? `Visitors currently see revision ${project.publishedVersion}. This replaces it with saved revision ${project.version}.` : "This makes the saved project and its selected images public."}{project.archived && " Publishing also restores this archived project."}</p>
      <p>The public version includes the saved story, cover, {project.content.gallery.length} gallery {project.content.gallery.length === 1 ? "image" : "images"} and any assigned device screenshots. Unselected uploads remain private.</p>
      <fieldset className="admin-form-fields" disabled={busy}><label className="admin-check"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} /> I have permission to share this project, its images and the claims in its story.</label></fieldset>
      <div className="admin-review-actions"><button className="admin-secondary" disabled={busy} onClick={() => closeReview()}>Keep as draft</button><button className="studio-button" disabled={busy || !approved || dirty || conflict || !canPublish} onClick={() => void action("publish")}>{busy ? "Publishing…" : `Publish revision ${project.version} ↗`}</button></div>
    </dialog>}
  </div>;
}

