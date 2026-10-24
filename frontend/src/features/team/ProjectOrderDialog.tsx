import { useEffect, useId, useRef, useState } from "react";
import { keepModalFocus } from "../../lib/dialogFocus";
import { useNavigationProtection } from "../../app/NavigationProtection";
import { OwnerError } from "../admin/OwnerError";

export function ProjectOrderDialog({ title, order, busy, error, onClose, onSave }: { title: string; order: number; busy: boolean; error: string; onClose: () => void; onSave: (order: number) => void }) {
  const modal = useRef<HTMLDialogElement>(null), field = useRef<HTMLInputElement>(null), id = useId();
  const [value, setValue] = useState(String(order));
  const parsed = Number(value), valid = value.trim() !== "" && Number.isInteger(parsed) && parsed >= -10000 && parsed <= 10000;
  useNavigationProtection(busy || value !== String(order), "Leave and discard the unsaved project display order, or leave before its result is confirmed?");
  useEffect(() => { const dialog = modal.current; dialog?.showModal(); field.current?.select(); return () => dialog?.close(); }, []);
  return <dialog ref={modal} className="admin-publish-review project-order-dialog" aria-labelledby={`${id}-title`} onKeyDown={keepModalFocus} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><p className="studio-eyebrow">PROJECT PRESENTATION</p><h2 id={`${id}-title`}>Set public display order</h2><p>{title}</p><p id={`${id}-help`}>Lower numbers appear first in the public showcase. This management list stays in creation order. Setting an order does not publish a draft.</p><OwnerError message={error} /><form className="admin-form" aria-busy={busy} onSubmit={event => { event.preventDefault(); if (valid && !busy && parsed !== order) onSave(parsed); }}><label htmlFor={`${id}-order`}>Display order</label><input ref={field} id={`${id}-order`} type="number" required min={-10000} max={10000} step={1} value={value} disabled={busy} aria-describedby={`${id}-help`} onChange={event => setValue(event.target.value)} /><div className="admin-review-actions"><button type="button" className="admin-secondary" disabled={busy} onClick={onClose}>Cancel order change</button><button className="admin-primary" disabled={busy || !valid || parsed === order}>{busy ? "Saving display order…" : "Save display order"}</button></div></form></dialog>;
}
