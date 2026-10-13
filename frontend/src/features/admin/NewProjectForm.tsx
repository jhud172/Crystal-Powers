import type { ProjectCreationDraft } from "../portfolio/projectApi";
type Fields=Pick<ProjectCreationDraft,"title"|"slug"|"editedSlug">;
import { FormEvent, useEffect, useLayoutEffect, useState } from "react";

export function suggestProjectSlug(title: string) {
  return title.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120).replace(/-+$/g, "");
}

export function NewProjectForm({ busy, onCreate, onDirty, initial, onDraft }: { busy: boolean; onCreate: (title: string, slug: string) => Promise<void>; onDirty?: (dirty: boolean) => void; initial?: Fields; onDraft?: (fields:Fields | null)=>void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [editedSlug, setEditedSlug] = useState(initial?.editedSlug ?? false);
  useLayoutEffect(()=>{onDraft?.(title.trim() || slug ? {title,slug,editedSlug} : null);},[title,slug,editedSlug,onDraft]);
  useEffect(()=>{onDirty?.(!!(title.trim() || slug));},[title,slug,onDirty]);
  useEffect(()=>()=>onDirty?.(false),[onDirty]);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!busy) void onCreate(title.trim(), slug); }
  return <form className="admin-form admin-create" aria-busy={busy} onSubmit={submit}><fieldset className="admin-form-fields" disabled={busy}>
    <div><p className="studio-eyebrow">PRIVATE UNTIL YOU PUBLISH</p><h2>A new beginning.</h2></div>
    <label>Project title<input name="title" value={title} onChange={event => { setTitle(event.target.value); if (!editedSlug) setSlug(suggestProjectSlug(event.target.value)); }} required maxLength={160} autoFocus /></label>
    <label>Project address<input name="slug" value={slug} onChange={event => { setEditedSlug(true); setSlug(event.target.value); }} required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="my-project" aria-describedby="project-address-hint" /></label>
    <p id="project-address-hint" className="studio-soft">Lowercase letters, numbers and hyphens. You can edit this suggestion now; the address stays with the project after creation.</p>
    <div className="admin-address-preview"><span>Public address after publishing</span><code>/portfolio/{slug || "your-project"}</code></div>
    <button className="studio-button" disabled={busy}>{busy ? "Creating…" : "Create private draft ↗"}</button>
  </fieldset></form>;
}
