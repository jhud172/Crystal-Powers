import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";
import { useNavigationProtection } from "../../app/NavigationProtection";

type Attachment = { id: string; channelId: string; messageId: number; authorOwnerId: string | null; authorTeamId: string | null; filename: string; contentType: string; sizeBytes: number; reviewState: string; reviewNote: string; scanState: string; removedAt: string | null; version: number };
type Page = { channelId: string; messageId: number; files: Attachment[]; scannerConfigured: boolean };
type ReviewDraft = { version: number; state: string; note: string };
type Props = { channelId: string; messageId: number; ownerId: string | null; memberId: string | null; canUpload: boolean; canReview: boolean; canRemove: boolean; inactive?: boolean; disabled: boolean; onBusy: (value: boolean) => void; onDirty: (value: boolean) => void; onExpired: () => void; onClose: () => void };

export function MessageAttachments({ channelId, messageId, ownerId, memberId, canUpload, canReview, canRemove, inactive = false, disabled, onBusy, onDirty, onExpired, onClose }: Props) {
  const [page, setPage] = useState<Page | null>(null), [file, setFile] = useState<File | null>(null), [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [names,setNames]=useState<Record<string,{version:number;filename:string}>>({});
  const [loading, setLoading] = useState(true), [working, setWorking] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [mustReload, setMustReload] = useState(false);
  const live = useRef(false), pending = useRef(false), generation = useRef(0), request = useRef<AbortController | null>(null), uploadKey = useRef<string | null>(null);
  const callbacks=useRef({onBusy,onDirty});callbacks.current={onBusy,onDirty};
  const input = useRef<HTMLInputElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const path = "/api/team/channels/" + channelId + "/messages/" + messageId + "/attachments";
  const cleanupPath="/api/team/channel-uploads/"+channelId+"/messages/"+messageId;
  const dirty = !!file || Object.keys(drafts).length > 0 || Object.keys(names).length > 0;
  const blocked = disabled || working || loading || mustReload || !page;
  useNavigationProtection(dirty || working, "Leave this attachment panel? Selected files and unsaved reviews will be discarded.");
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  function fail(failure: unknown) {
    setError(failure instanceof Error ? failure.message : "The attachment action could not be confirmed.");
    if (failure instanceof ApiError && [401,403,404].includes(failure.status)) { setPage(null); setFile(null); uploadKey.current=null; setDrafts({}); setNames({}); if(input.current)input.current.value=""; }
    if (failure instanceof ApiError && failure.status === 401) onExpired();
  }
  async function load() {
    const current = ++generation.current; request.current?.abort(); const abort = new AbortController(); request.current = abort;
    setLoading(true); setError("");
    try {
      const result = await api<Page>(inactive ? cleanupPath : path, { signal: abort.signal });
      if (!live.current || current !== generation.current) return;
      if (result.channelId !== channelId || result.messageId !== messageId || result.files.some(value => value.channelId !== channelId || value.messageId !== messageId)) throw new ApiError(403, "Attachment access could not be confirmed. Reopen this channel.");
      setPage(result); setMustReload(false); heading.current?.focus();
    } catch (failure) {
      if (live.current && current === generation.current && !(failure instanceof DOMException && failure.name === "AbortError")) { setMustReload(true); fail(failure); }
    } finally { if (live.current && current === generation.current) setLoading(false); }
  }
  useEffect(() => {
    live.current = true; void load();
    return () => { live.current = false; ++generation.current; request.current?.abort(); callbacks.current.onDirty(false); if(pending.current)callbacks.current.onBusy(false); };
  }, [channelId, messageId, inactive]);
  async function perform(action: () => Promise<void>) {
    if (pending.current || blocked) return;
    pending.current = true; setWorking(true); onBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (failure) { if (live.current) { setMustReload(true); fail(failure); } }
    finally { pending.current = false; if (live.current) { setWorking(false); onBusy(false); } }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file || !canUpload) return;
    const selected = file;
    await perform(async () => {
      if (!uploadKey.current) uploadKey.current = crypto.randomUUID();
      const data = new FormData(); data.set("file", selected); data.set("submissionKey", uploadKey.current);
      const saved = await api<Attachment>(path, { method: "POST", body: data });
      if (saved.channelId !== channelId || saved.messageId !== messageId) throw new ApiError(403, "The upload result could not be confirmed for this message.");
      if (live.current) { setFile(null); uploadKey.current = null; if (input.current) input.current.value = ""; setNotice(saved.removedAt ? "The original upload was already saved and subsequently removed. It has not been uploaded again." : "Attachment saved privately. It needs a clean scan and approval before ordinary channel readers can download it."); await load(); }
    });
  }
  function own(value: Attachment) { return memberId ? value.authorTeamId === memberId : !!ownerId && value.authorOwnerId === ownerId; }
  function edit(value: Attachment, change: Partial<ReviewDraft>) {
    setDrafts(current => ({ ...current, [value.id]: { ...(current[value.id] ?? { version: value.version, state: value.reviewState === "PENDING" ? "" : value.reviewState, note: value.reviewNote }), ...change } }));
  }
  async function review(value: Attachment) {
    const draft = drafts[value.id]; if (!draft?.state) return;
    await perform(async () => {
      await api(path + "/" + value.id + "/review", { method: "PATCH", body: JSON.stringify(draft) });
      if (live.current) { setDrafts(current => { const next = { ...current }; delete next[value.id]; return next; }); setNotice("Review saved. Approval does not publish this file outside the channel."); await load(); }
    });
  }
  function reload() {
    if ((Object.keys(drafts).length || Object.keys(names).length) && !window.confirm("Reload attachment status and discard unsaved reviews? The selected upload will stay here with its retry key.")) return;
    setDrafts({}); setNames({}); void load();
  }
  return <section className="support-request-detail team-attachment-panel" aria-labelledby="message-attachment-title">
    <h3 id="message-attachment-title" ref={heading} tabIndex={-1}>Message attachments</h3>
    <p>Private to people with access to this channel. Images: JPEG, PNG, GIF, WebP. Videos: MP4, WebM, MOV. Five active files and 15 MB total per message.</p>
    <OwnerError message={error} />{notice && <p role="status" className="admin-notice">{notice}</p>}{loading && <p role="status">Loading attachment status…</p>}
    {mustReload && <p>The latest status must be reloaded before another action. Your selected file and retry key remain in this panel.</p>}
    <div><button className="admin-secondary" disabled={disabled || working || loading} onClick={reload}>Refresh attachment status</button><button className="admin-text-button" disabled={disabled || working} onClick={onClose}>Close attachments</button></div>
    {inactive && <p>The message was removed or its channel is archived. Download, upload, scan and approval stay blocked. Moderators with file-edit permission can remove retained bytes here.</p>}
    {canUpload && !inactive && <form className="admin-form" onSubmit={event => void upload(event)}><fieldset disabled={blocked}><legend>Add a file to your message</legend><label>Reference image or video<input ref={input} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime" onChange={event => {
      const selected = event.target.files?.[0] || null;
      if (selected && (!selected.size || selected.size > 15 * 1024 * 1024)) { setError("Choose a non-empty file under 15 MB."); event.target.value = ""; setFile(null); uploadKey.current = null; return; }
      setFile(selected); uploadKey.current = selected ? crypto.randomUUID() : null; setError("");
    }} /></label><button className="admin-primary" disabled={!file}>{working ? "Saving attachment…" : "Upload privately"}</button></fieldset></form>}
    {page && !page.files.length && <p>No attachments are visible to your account for this message.</p>}
    <ul>{page?.files.map(value => <li key={value.id} className="team-attachment-item"><strong>{value.filename}</strong><p>{Math.ceil(value.sizeBytes / 1024)} KB · {value.removedAt ? "Removed" : value.scanState.toLowerCase() + " scan · " + value.reviewState.toLowerCase() + " review"}</p>
      {!inactive && !value.removedAt && value.scanState === "CLEAN" && (canReview || value.reviewState === "APPROVED") && <a href={path + "/" + value.id + "/download"}>Download {value.filename}</a>}
      {value.reviewNote && <p>Review note: {value.reviewNote}</p>}
      {!inactive && !value.removedAt && canReview && <><button className="admin-secondary" disabled={blocked || (!!Object.keys(drafts).length || !!Object.keys(names).length) || !page.scannerConfigured || !["UNSCANNED", "ERROR", "SCANNING"].includes(value.scanState)} onClick={() => {
        if (!window.confirm("Scan this file? It stays quarantined and needs separate approval after a clean scan.")) return;
        void perform(async () => { await api(path + "/" + value.id + "/scan", { method: "POST", body: JSON.stringify({ version: value.version }) }); if (live.current) { setNotice("Scan status updated. Check the result before reviewing."); await load(); } });
      }}>Scan / retry scan</button>{!page.scannerConfigured && <p>The scanner is not configured. Files remain quarantined.</p>}
      <form className="admin-form" onSubmit={event => { event.preventDefault(); void review(value); }}><fieldset disabled={blocked || value.scanState === "SCANNING"}><legend>Review {value.filename}</legend><label>Decision<select value={drafts[value.id]?.state ?? (value.reviewState === "PENDING" ? "" : value.reviewState)} onChange={event => edit(value, { state: event.target.value })}><option value="">Choose a decision</option><option value="APPROVED" disabled={value.scanState !== "CLEAN"}>Approve</option><option value="REJECTED">Reject</option></select></label><label>Review note<textarea maxLength={1000} value={drafts[value.id]?.note ?? value.reviewNote} onChange={event => edit(value, { note: event.target.value })} /></label><button className="admin-secondary" disabled={!drafts[value.id]?.state}>Save review</button></fieldset></form></>}
      {!inactive && !value.removedAt && canRemove && <form className="admin-form" onSubmit={event=>{event.preventDefault();const draft=names[value.id];if(!draft)return;void perform(async()=>{await api(path+"/"+value.id+"/filename",{method:"PATCH",body:JSON.stringify(draft)});if(live.current){setNames(current=>{const next={...current};delete next[value.id];return next;});setNotice("Filename updated. The original bytes, format and upload retry identity are unchanged.");await load();}});}}><fieldset disabled={blocked || value.scanState==="SCANNING"}><legend>File metadata</legend><label>Filename<input required maxLength={510} value={names[value.id]?.filename ?? value.filename} onChange={event=>{const filename=event.target.value;setNames(current=>({...current,[value.id]:{version:current[value.id]?.version ?? value.version,filename}}));}}/></label><p>Keep the matching file extension. Names cannot contain paths or control characters.</p><button className="admin-secondary" disabled={!names[value.id]}>Save filename</button></fieldset></form>}
      {!value.removedAt && (canRemove || (canUpload && own(value))) && <button className="admin-text-button" disabled={blocked || !!Object.keys(drafts).length || !!Object.keys(names).length} onClick={() => {
        if (!window.confirm("Remove this attachment's current stored bytes? Audit metadata stays; backups follow the operator's retention policy.")) return;
        void perform(async () => { await api(inactive ? cleanupPath + "/" + value.id + "/remove" : path + "/" + value.id + "/remove", { method: "POST", body: JSON.stringify({ version: value.version }) }); if (live.current) { setNotice("Current attachment bytes removed. Audit metadata remains."); await load(); } });
      }}>Remove attachment</button>}
    </li>)}</ul>
  </section>;
}
