import { Component, lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useExperience } from "./ExperienceContext";

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
  const [pulse, setPulse] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const home = useRef<HTMLAnchorElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const live = open && threeDAllowed && !reducedMotion && pageVisible && activeStage === id && !failed;
  const onFailure = useCallback(() => setFailed(true), []);
  const onReady = useCallback(() => setReady(true), []);
  const close = () => { setOpen(false); release(id); if (reducedMotion) home.current?.focus(); else trigger.current?.focus(); };
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
      <img key={pulse} className={pulse ? "brand-crystal-pulse" : undefined} src="/branding/crystal-powers-emblem.webp" alt="" width={153} height={240} /><span className="brand-light-sweep" aria-hidden="true" />
    </button>
    <NavLink ref={home} to="/" className="brand-home-link" aria-label="Crystal Powers home" onClick={() => { setOpen(false); release(id); }}>{footer ? <img src="/branding/crystal-powers-wordmark.webp" width={1000} height={154} alt="Crystal Powers" loading="lazy" /> : <span>Crystal<br />Powers</span>}</NavLink>
    {open && <section id={`${id}-experience`} className="brand-experience" aria-label="Crystal Powers logo experience">
      <div className="brand-experience-heading"><p>CRYSTAL POWERS / IN ANOTHER DIMENSION</p><button type="button" onClick={close} aria-label="Close logo experience">×</button></div>
      <div className="brand-scene" data-ready={ready && live}>
        <img src="/branding/crystal-powers-logo.webp" width={1200} height={320} alt="Blue faceted Crystal Powers logo with extruded lettering" />
        {live && <BrandBoundary key={failed ? "failed" : "live"} onFailure={onFailure}><Suspense fallback={null}><BrandCanvas unfolded={unfold} onReady={onReady} onFailure={onFailure} /></Suspense></BrandBoundary>}
      </div>
      {failed && <p role="status" className="brand-status">The still logo is available. The 3D view could not load.</p>}
      {live && !ready && <p role="status" className="brand-status">Preparing the crystal…</p>}
      <div className="brand-experience-actions">{live && <button type="button" disabled={!ready} aria-pressed={unfold} onClick={() => setUnfold(value => !value)}>{unfold ? "Bring it together" : "Unfold the crystal"}</button>}<NavLink to="/portfolio">Explore the work ↗</NavLink></div>
    </section>}
  </div>;
}
