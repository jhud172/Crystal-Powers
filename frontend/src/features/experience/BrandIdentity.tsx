import { Component, lazy, Suspense, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useExperience } from "./ExperienceContext";
import { brandFinishes, type BrandFinish } from "./brandFinishes";

const BrandCanvas = lazy(() => import("./BrandLogoCanvas"));
class BrandBoundary extends Component<PropsWithChildren<{ onFailure: () => void }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function BrandIdentity({ footer = false }: { footer?: boolean }) {
  const id = useId();
  const location = useLocation();
  const { activeStage, activate, release, threeDAllowed, reducedMotion, pageVisible } = useExperience();
  const [open, setOpen] = useState(false);
  const [unfold, setUnfold] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pulse, setPulse] = useState(0);
  const [variant, setVariant] = useState<"liquid" | "faceted">("liquid");
  const [rotation, setRotation] = useState(0);
  const [finish, setFinish] = useState<BrandFinish>("glacier");
  const trigger = useRef<HTMLButtonElement>(null);
  const home = useRef<HTMLAnchorElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const liveActionFocused = useRef(false);
  const live = open && visible && threeDAllowed && !reducedMotion && pageVisible && activeStage === id && !failed;
  const onFailure = useCallback(() => setFailed(true), []);
  const onReady = useCallback(() => setReady(true), []);
  const close = () => { setOpen(false); release(id); if (reducedMotion) home.current?.focus(); else trigger.current?.focus(); };
  useLayoutEffect(() => {
    // Preference, screen and failure changes remove the live-only action.
    // Preserve its keyboard user's place without stealing focus from other controls.
    if (!live && liveActionFocused.current) {
      liveActionFocused.current = false;
      (reducedMotion ? home.current : trigger.current)?.focus({ preventScroll: true });
    }
  }, [live, reducedMotion]);
  useEffect(() => {
    if (!open || !host.current || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [open]);
  useEffect(() => { if (reducedMotion) release(id); }, [reducedMotion, id, release]);
  useEffect(() => { setOpen(false); setUnfold(false); release(id); }, [location.pathname, id, release]);
  useEffect(() => () => release(id), [id, release]);
  useEffect(() => { if (!live) setReady(false); }, [live]);
  useEffect(() => {
    if (!live || ready) return;
    const timeout = window.setTimeout(() => setFailed(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [live, ready]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !host.current?.contains(event.target)) { setOpen(false); release(id); }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, id, release]);
  const interact = () => {
    if (open) { close(); return; }
    if (reducedMotion || !threeDAllowed) { setPulse(value => value + 1); return; }
    setFailed(false); setReady(false); setUnfold(true); setOpen(true); activate(id);
  };
  return <div ref={host} className="brand-identity" data-footer={footer} data-calm={reducedMotion} onKeyDown={event => {
    if (event.key === "Escape" && open) { event.stopPropagation(); close(); }
  }}>
    <button ref={trigger} type="button" className="brand-crystal-button" disabled={reducedMotion && !open} aria-label={open ? "Close Crystal Powers logo experience" : threeDAllowed ? "Explore Crystal Powers logo" : "Illuminate Crystal Powers logo"} aria-expanded={open} aria-controls={threeDAllowed ? `${id}-experience` : undefined} onClick={interact}>
      <img key={pulse} className={pulse ? "brand-crystal-pulse" : undefined} src="/branding/crystal-powers-liquid-mark.svg" alt="" width={96} height={120} /><span className="brand-light-sweep" aria-hidden="true" />
    </button>
    <NavLink ref={home} to="/" className="brand-home-link" aria-label="Crystal Powers home" onClick={() => { setOpen(false); release(id); }}><span>Crystal<br />Powers</span></NavLink>
    {open && <section id={`${id}-experience`} className="brand-experience" aria-label="Crystal Powers logo experience">
      <div className="brand-experience-heading"><p>CRYSTAL POWERS / IN ANOTHER DIMENSION</p><button type="button" onClick={close} aria-label="Close logo experience">×</button></div>
      <div className="brand-variant-options" role="group" aria-label="Logo style">
        {(["liquid", "faceted"] as const).map(option => <button type="button" key={option} aria-pressed={variant === option} onClick={() => { if (variant === option) return; setReady(false); setFailed(false); setVariant(option); setRotation(0); }}>{option === "liquid" ? "Liquid Light" : "Original crystal"}</button>)}
      </div>
      {variant === "liquid" && <fieldset className="brand-finish-options"><legend>Material finish</legend>{(Object.keys(brandFinishes) as BrandFinish[]).map(value => <button type="button" key={value} aria-pressed={finish === value} onClick={() => setFinish(value)}><span className={`brand-finish-swatch brand-finish-${value}`} aria-hidden="true" />{brandFinishes[value].label}</button>)}</fieldset>}
      <div className="brand-scene" data-variant={variant} data-finish={finish} data-ready={ready && live}>
        <img src={variant === "liquid" ? "/branding/crystal-powers-liquid-mark.svg" : "/branding/crystal-powers-logo.webp"} width={variant === "liquid" ? 96 : 1200} height={variant === "liquid" ? 120 : 320} alt={variant === "liquid" ? "Liquid Light crystal: a smooth open silhouette around a floating centre" : "Original blue faceted Crystal Powers logo"} />
        {live && <BrandBoundary key={variant} onFailure={onFailure}><Suspense fallback={null}><BrandCanvas key={variant} variant={variant} rotation={rotation} finish={finish} unfolded={unfold} onReady={onReady} onFailure={onFailure} /></Suspense></BrandBoundary>}
      </div>
      <div className="brand-scene-caption"><strong>Crystal Powers</strong><span>{variant === "liquid" ? "Light, given form." : "The original signature."}</span></div>
      {failed && <p role="status" className="brand-status">The still logo is available. The 3D view could not load.</p>}
      {live && !ready && <p role="status" className="brand-status">Preparing the crystal…</p>}
      {live && variant === "liquid" && <div className="brand-view-controls" onFocusCapture={() => { liveActionFocused.current = true; }} onBlurCapture={event => { liveActionFocused.current = event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget); }}><label className="brand-rotation-control"><span>Rotate the crystal</span><input type="range" min={-120} max={120} step={5} value={rotation} disabled={!ready} aria-valuetext={`${rotation} degrees`} onChange={event => setRotation(Number(event.target.value))} /></label><button type="button" disabled={!ready} onClick={() => { setRotation(0); setUnfold(true); setFinish("glacier"); }}>Reset view</button></div>}
      <div className="brand-experience-actions">{live && <button type="button" disabled={!ready} aria-pressed={unfold} onFocus={() => { liveActionFocused.current = true; }} onBlur={() => { liveActionFocused.current = false; }} onClick={() => setUnfold(value => !value)}>{unfold ? "Bring it together" : "Unfold the crystal"}</button>}<NavLink to="/portfolio">Explore the work ↗</NavLink></div>
    </section>}
  </div>;
}
