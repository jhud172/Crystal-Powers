import { useEffect, useId, useRef, useState } from "react";
import type { RenderQuality } from "./renderQuality";

const options = [
  { value: "automatic", label: "Automatic", detail: "Adapts detail during sustained animation" },
  { value: "low", label: "Lighter", detail: "Gentler reflections · uses less power" },
  { value: "standard", label: "Balanced", detail: "Rich materials and smooth exploration" },
  { value: "high", label: "Detailed", detail: "Sharper reflections · uses more power" },
] as const;

/** Custom disclosure with native radio navigation and one preference owner. */
export function AppearanceQuality({ value, onChange, disabled }: { value: RenderQuality; onChange: (value: RenderQuality) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !host.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div ref={host} className="studio-quality" onKeyDown={event => {
    if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <p id={`${id}-label`} className="studio-quality-label">3D detail</p>
    <button ref={trigger} type="button" className="studio-quality-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-options`} aria-describedby={`${id}-description`} disabled={disabled} onClick={() => setOpen(current => !current)}>
      <span id={`${id}-value`}>{options.find(option => option.value === value)!.label}</span><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
    </button>
    <fieldset id={`${id}-options`} className="studio-quality-options" hidden={!open}><legend>Choose 3D detail</legend>{options.map(option => <label key={option.value} className="studio-quality-option">
      <input type="radio" name={`${id}-quality`} value={option.value} aria-label={option.label} aria-describedby={`${id}-${option.value}-description`} checked={value === option.value} onChange={() => onChange(option.value)} />
      <span className="studio-choice-mark" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3 8 3 3 7-7" /></svg></span><span><strong>{option.label}</strong><small id={`${id}-${option.value}-description`}>{option.detail}</small></span>
    </label>)}</fieldset>
    <p id={`${id}-description`}>{disabled ? "Turn off Reduce effects to explore 3D." : "Optional 3D views are available on tablet-sized screens and larger."}</p>
  </div>;
}
