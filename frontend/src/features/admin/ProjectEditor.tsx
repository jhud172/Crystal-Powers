import { ChangeEvent, useEffect, useState } from "react";
import { api, ApiError, categoryLabel, imageUrl, ProjectContent, ProjectDraft, ProjectImage } from "../portfolio/projectApi";
import { ProjectPresentation } from "../portfolio/ProjectPresentation";

export function ProjectEditor({ project, onUpdate, onBack, onSessionExpired }: { project: ProjectDraft; onUpdate: (project: ProjectDraft) => void; onBack: () => void; onSessionExpired: () => void }) {
  const [content, setContent] = useState<ProjectContent>(project.content);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [step, setStep] = useState("Details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revisions, setRevisions] = useState<{ version: number; createdAt: string; title: string }[]>([]);
  const dirty = JSON.stringify(content) !== JSON.stringify(project.content);
  const ready = !!(content.title.trim() && content.summary.trim() && content.coverMediaId && content.coverAlt.trim() && content.gallery.every(item => item.alt.trim()));
  const fail = (failure: unknown) => { setError(failure instanceof Error ? failure.message : "The change could not be completed."); if (failure instanceof ApiError && failure.status === 401) onSessionExpired(); };
  useEffect(() => { let live = true; void api<ProjectImage[]>(`/api/admin/projects/${project.id}/media`).then(value => { if (live) setImages(value); }).catch(failure => { if (live) fail(failure); }); return () => { live = false; }; }, [project.id]);
  useEffect(() => { if (step !== "History") return; let live = true; void api<typeof revisions>(`/api/admin/projects/${project.id}/revisions`).then(value => { if (live) setRevisions(value); }).catch(failure => { if (live) fail(failure); }); return () => { live = false; }; }, [step, project.id, project.version]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    const warnOnLink = (event: MouseEvent) => {
      if (!dirty || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.origin === window.location.origin) return;
      if (!window.confirm("Leave this editor and discard unsaved edits?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", warnOnLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", warnOnLink, true); };
  }, [dirty]);
  const update = <K extends keyof ProjectContent>(key: K, value: ProjectContent[K]) => { setContent(current => ({ ...current, [key]: value })); setNotice(""); };
  async function save() {
    setBusy(true); setError(""); setNotice("");
    try { const result = await api<ProjectDraft>(`/api/admin/projects/${project.id}`, { method: "PUT", body: JSON.stringify({ expectedVersion: project.version, content }) }); onUpdate(result); setContent(result.content); setNotice("Draft saved. The public version stays as it was until you publish."); }
    catch (failure) { fail(failure); } finally { setBusy(false); }
  }
  async function action(kind: "publish" | "unpublish" | "archive" | "restore") {
    if ((kind === "unpublish" || kind === "archive") && !window.confirm(`This will hide “${project.content.title}” from the public showcase. Continue?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const presentation = kind === "archive" || kind === "restore";
      const result = await api<ProjectDraft>(`/api/admin/projects/${project.id}/${presentation ? "presentation" : kind}`, { method: presentation ? "PATCH" : "POST", body: JSON.stringify(presentation ? { featured: project.featured, sortOrder: project.sortOrder, archived: kind === "archive" } : { expectedVersion: project.version }) });
      onUpdate(result); setNotice(kind === "publish" ? "Published. Visitors will see the update within 30 seconds." : kind === "unpublish" ? "Unpublished. Your draft and images are still here." : kind === "archive" ? "Project archived." : "Project restored.");
    } catch (failure) { fail(failure); } finally { setBusy(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (file.size > 12_000_000) { setError("Choose an image under 12 MB."); return; }
    setBusy(true); setError("");
    const body = new FormData(); body.append("file", file);
    try { const image = await api<ProjectImage>(`/api/admin/projects/${project.id}/media`, { method: "POST", body }); setImages(current => [image, ...current]); if (!content.coverMediaId) update("coverMediaId", image.id); setNotice("Image uploaded privately. Choose where it appears, then save your draft."); }
    catch (failure) { fail(failure); } finally { setBusy(false); }
  }
  async function reload() {
    if (dirty && !window.confirm("Reloading will replace your unsaved edits with the latest saved draft. Continue?")) return;
    setBusy(true);
    try { const result = await api<ProjectDraft>(`/api/admin/projects/${project.id}`); onUpdate(result); setContent(result.content); setError(""); setNotice("Latest draft loaded."); }
    catch (failure) { fail(failure); } finally { setBusy(false); }
  }
  function toggleGallery(id: string) { update("gallery", content.gallery.some(item => item.mediaId === id) ? content.gallery.filter(item => item.mediaId !== id) : [...content.gallery, { mediaId: id, alt: "" }].slice(0, 16)); }
  async function restoreRevision(version: number) {
    if (!window.confirm(`Restore revision ${version} as a new private draft? ${dirty ? "Unsaved edits will be replaced. " : ""}The published version will stay as it is.`)) return;
    setBusy(true); setError("");
    try { const result = await api<ProjectDraft>(`/api/admin/projects/${project.id}/revisions/${version}/restore`, { method: "POST", body: JSON.stringify({ expectedVersion: project.version }) }); onUpdate(result); setContent(result.content); setNotice(`Revision ${version} restored as draft ${result.version}. Review it before publishing.`); }
    catch (failure) { fail(failure); } finally { setBusy(false); }
  }
  return <div className="admin-editor">
    <div className="admin-editor-heading"><button className="admin-text-button" onClick={() => { if (!dirty || window.confirm("Leave this editor and discard unsaved edits?")) onBack(); }}>← All projects</button><div><span className="admin-status">{project.archived ? "Archived" : project.publishedVersion ? "Published" : "Private draft"}</span><span className="studio-soft"> / Draft {project.version}{dirty ? " · Unsaved changes" : " · Saved"}</span></div></div>
    <h1>{content.title || "Untitled project"}</h1><p className="studio-soft">/portfolio/{project.slug}</p>
    <div className="admin-editor-toolbar"><div className="studio-device-tabs" role="group" aria-label="Editor sections">{["Details", "Images", "Story", "History", "Preview"].map(item => <button key={item} aria-pressed={item === step} onClick={() => setStep(item)}>{item}</button>)}</div><button className="admin-secondary" disabled={busy} onClick={reload}>Reload saved draft</button><button className="studio-button" disabled={busy || !dirty} onClick={save}>{busy ? "Working…" : "Save draft"}</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    {step === "Preview" ? <><p className="admin-preview-banner">Private preview · Includes your current unsaved edits. Only your signed-in session can load these images.</p><ProjectPresentation project={{ ...project, content }} preview onExitPreview={() => setStep("Details")} /></> : <div className="admin-editor-grid"><fieldset className="admin-form admin-editor-fields" disabled={busy}>
      {step === "Details" && <>
        <label>Project title<input value={content.title} onChange={event => update("title", event.target.value)} maxLength={160} required /></label>
        <div className="admin-fields-row"><label>Project type<select value={content.category} onChange={event => update("category", event.target.value as ProjectContent["category"])}>{Object.entries(categoryLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>3D display<select value={content.displayDevice} onChange={event => update("displayDevice", event.target.value as ProjectContent["displayDevice"])}><option value="laptop">Laptop</option><option value="monitor">Desktop monitor</option><option value="phone">Phone</option></select></label></div>
        <label>Short introduction<textarea value={content.summary} onChange={event => update("summary", event.target.value)} maxLength={600} rows={4} required /><small>What did you make, and who is it for?</small></label>
        <label>Live website address <span className="studio-soft">(optional)</span><input type="url" value={content.liveUrl} onChange={event => update("liveUrl", event.target.value)} placeholder="https://" maxLength={2048} /><small>Visitors open this in a new tab. The editor does not fetch or embed the website.</small></label>
        <label>Technologies <span className="studio-soft">(optional)</span><input value={content.technologies.join(", ")} onChange={event => update("technologies", event.target.value.split(",").map(value => value.trimStart()).slice(0, 20))} maxLength={1200} /><small>Separate names with commas.</small></label>
      </>}
      {step === "Images" && <>
        <label className="admin-upload">Upload a screenshot<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={busy} /><small>PNG, JPEG or WebP · Under 12 MB / 16 megapixels. Images are optimised and metadata removed. Up to 40 uploads per project.</small></label>
        <div className="admin-image-library">{images.map(image => <article key={image.id}><img src={imageUrl(image.id, true)} alt="Uploaded project screenshot" loading="lazy" /><p>{image.width} × {image.height} · {Math.ceil(image.bytes / 1000)} KB</p><label className="admin-check"><input type="radio" name="cover" checked={content.coverMediaId === image.id} onChange={() => update("coverMediaId", image.id)} /> Cover & 3D screen</label><label className="admin-check"><input type="checkbox" checked={content.gallery.some(item => item.mediaId === image.id)} onChange={() => toggleGallery(image.id)} disabled={!content.gallery.some(item => item.mediaId === image.id) && content.gallery.length >= 16} /> Include in gallery</label></article>)}</div>
        <label>Cover image description<input value={content.coverAlt} onChange={event => update("coverAlt", event.target.value)} maxLength={300} /><small>Describe what a visitor would see. This is also used by screen readers.</small></label>
        {content.gallery.map((item, index) => <div className="admin-gallery-row" key={item.mediaId}><img src={imageUrl(item.mediaId, true)} alt="" /><label>Gallery image {index + 1} description<input value={item.alt} onChange={event => update("gallery", content.gallery.map(image => image.mediaId === item.mediaId ? { ...image, alt: event.target.value } : image))} maxLength={300} /></label><button className="admin-secondary" disabled={index === 0} onClick={() => { const reordered = [...content.gallery]; [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]]; update("gallery", reordered); }}>Move up</button></div>)}
      </>}
      {step === "History" && <div className="admin-revisions"><h2>Every saved version.</h2><p>Restoring creates a new private draft. Your existing revisions and published work are preserved.</p>{revisions.map(revision => <article key={revision.version}><div><h3>Revision {revision.version}{revision.version === project.publishedVersion ? " · Published" : ""}</h3><p>{revision.title}</p><small>{new Date(revision.createdAt).toLocaleString("en-GB")}</small></div><button className="admin-secondary" disabled={busy || revision.version === project.version} onClick={() => restoreRevision(revision.version)}>{revision.version === project.version ? "Current draft" : "Restore as draft"}</button></article>)}</div>}
      {step === "Story" && ([['overview', 'The idea', 'What problem or opportunity started the project?'], ['approach', 'The approach', 'Explain your design and development decisions.'], ['outcome', 'The outcome', 'Describe what was delivered. Only include claims you can verify.']] as const).map(([key, label, hint]) => <label key={key}>{label}<textarea value={content[key]} onChange={event => update(key, event.target.value)} maxLength={8000} rows={8} /><small>{hint}</small></label>)}
    </fieldset><aside className="admin-publish-panel"><p className="studio-eyebrow">READY TO SHARE?</p><h2>From draft<br />to live.</h2><ul><li>{content.title.trim() ? "✓" : "○"} Project title</li><li>{content.summary.trim() ? "✓" : "○"} Short introduction</li><li>{content.coverMediaId ? "✓" : "○"} Cover image</li><li>{content.coverAlt.trim() && content.gallery.every(item => item.alt.trim()) ? "✓" : "○"} Image descriptions</li><li>{!dirty ? "✓" : "○"} Latest changes saved</li></ul><p>Review the preview and confirm that the project and its claims are yours to share.</p><button className="studio-button" disabled={busy || dirty || !ready} onClick={() => action("publish")}>{project.publishedVersion ? "Publish this revision ↗" : "Publish project ↗"}</button>{project.publishedVersion && <button className="admin-text-button" disabled={busy} onClick={() => action("unpublish")}>Unpublish project</button>}<button className="admin-text-button" disabled={busy} onClick={() => action(project.archived ? "restore" : "archive")}>{project.archived ? "Restore project" : "Archive project"}</button></aside></div>}
  </div>;
}

