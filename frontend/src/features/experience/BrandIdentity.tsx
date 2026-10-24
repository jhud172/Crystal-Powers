import { Component, lazy, Suspense, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useExperience } from "./ExperienceContext";
import { brandFinishes, brandLighting, type BrandFinish, type BrandLighting, type BrandPart } from "./brandFinishes";

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
  const [size, setSize] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [lighting, setLighting] = useState<BrandLighting>("studio");
  const [part, setPart] = useState<BrandPart>("complete");
  const [topology, setTopology] = useState(false);
  const [reset, setReset] = useState(0);
  const resetStudio = () => { setRotation(0); setUnfold(false); setFinish("glacier"); setSize(100); setBrightness(100); setLighting("studio"); setPart("complete"); setTopology(false); setReset(value => value + 1); };
  const trigger = useRef<HTMLButtonElement>(null);
  const home = useRef<HTMLAnchorElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const liveActionFocused = useRef(false);
  useLayoutEffect(() => {
    if (!open) return;
    const panel = host.current?.querySelector<HTMLElement>(".brand-experience");
    if (!panel) return;
    const position = () => {
      panel.style.translate = "none";
      const bounds = panel.getBoundingClientRect();
      const x = bounds.left < 12 ? 12 - bounds.left : Math.min(0, window.innerWidth - 12 - bounds.right);
      const y = bounds.top < 12 ? 12 - bounds.top : Math.min(0, window.innerHeight - 12 - bounds.bottom);
      panel.style.translate = `${x}px ${y}px`;
    };
    position();
    const sizing = new ResizeObserver(position); sizing.observe(panel);
    window.addEventListener("resize", position); window.addEventListener("scroll", position, { passive: true });
    return () => { sizing.disconnect(); window.removeEventListener("resize", position); window.removeEventListener("scroll", position); };
  }, [open]);
  const live = open && visible && threeDAllowed && !reducedMotion && pageVisible && activeStage === id && !failed;
  const onFailure = useCallback(() => setFailed(true), []);
  const onReady = useCallback(() => setReady(true), []);
  const close = () => { setOpen(false); release(id); trigger.current?.focus({ preventScroll: true }); };
  useLayoutEffect(() => {
    // Preference, screen and failure changes remove the live-only action.
    // Preserve its keyboard user's place without stealing focus from other controls.
    if (!live && liveActionFocused.current && (!host.current?.contains(document.activeElement) || document.activeElement?.matches(":disabled"))) {
      liveActionFocused.current = false;
      (reducedMotion ? home.current : trigger.current)?.focus({ preventScroll: true });
    }
  }, [live, reducedMotion]);
  useEffect(() => {
    if (!open || !host.current || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(entries => { const entry = entries[entries.length - 1]; if (entry) setVisible(entry.isIntersecting); }, { rootMargin: "100px" });
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
    setPulse(value => value + 1);
    setFailed(false); setReady(false); setUnfold(false); setOpen(true);
    if (threeDAllowed && !reducedMotion) activate(id);
  };
  return <div ref={host} className="brand-identity" data-footer={footer} data-calm={reducedMotion} onKeyDown={event => {
    if (event.key === "Escape" && open) { event.stopPropagation(); close(); }
  }}>
    <button ref={trigger} type="button" className="brand-crystal-button" aria-label={open ? "Close Crystal Powers logo experience" : threeDAllowed ? "Explore Crystal Powers logo" : "Illuminate Crystal Powers logo"} aria-expanded={open} aria-controls={`${id}-experience`} onClick={interact}>
      <img draggable={false} key={pulse} className={pulse ? "brand-crystal-pulse" : undefined} src="/branding/crystal-powers-liquid-mark.svg" alt="" width={96} height={120} /><span className="brand-light-sweep" aria-hidden="true" />
    </button>
    <NavLink ref={home} to="/" className="brand-home-link" aria-label="Crystal Powers home" onClick={() => { setOpen(false); release(id); }}><span>Crystal<br />Powers</span></NavLink>
    {open && <section id={`${id}-experience`} className="brand-experience" aria-label="Crystal Powers logo experience">
      <div className="brand-experience-heading"><div><p>CRYSTAL POWERS / INTERACTIVE OBJECTS</p><h2>Crystal Studio<span>.</span></h2></div><button type="button" onClick={close} aria-label="Close logo experience">×</button></div>
      <p className="brand-studio-intro">A signature, in your hands. Shape the light. Explore every angle.</p>
      <div className="brand-variant-options" role="group" aria-label="Logo style">
        {(["liquid", "faceted"] as const).map(option => <button type="button" key={option} aria-pressed={variant === option} onClick={() => { if (variant === option) return; setReady(false); setFailed(false); setVariant(option); setRotation(0); }}>{option === "liquid" ? "Liquid Light" : "Original crystal"}</button>)}
      </div>
      <div className="brand-studio-grid">
        <div className="brand-stage-column">
          <div className="brand-stage-label"><span>{live && ready ? "LIVE / 3D" : "RENDERED / PREVIEW"}</span><span>{variant === "liquid" ? "01 — SIGNATURE" : "02 — HERITAGE"}</span></div>
          <div className="brand-scene" data-variant={variant} data-finish={finish} data-ready={ready && live} data-lighting={lighting}>
            <div className="brand-stage-orbit" aria-hidden="true" />
            <img draggable={false} src={variant === "liquid" ? "/renders/liquid-brand-crystal.png?v=studio-02" : "/branding/crystal-powers-logo.webp"} width={variant === "liquid" ? 720 : 1200} height={variant === "liquid" ? 800 : 320} style={{ transform: `scale(${size / 100}) rotateY(${rotation}deg)`, filter: `brightness(${brightness / 100})${finish === "rose" ? " hue-rotate(110deg)" : finish === "pearl" ? " saturate(0)" : ""}` }} alt={variant === "liquid" ? "Blender-built Crystal Powers signature: a cyan-to-violet optical shell around a floating mint crystal" : "Original blue faceted Crystal Powers logo"} />
            {live && <BrandBoundary key={variant} onFailure={onFailure}><Suspense fallback={null}><BrandCanvas key={variant} variant={variant} rotation={rotation} finish={finish} unfolded={unfold} scale={size / 100} brightness={brightness} lighting={lighting} part={part} topology={topology} reset={reset} onReady={onReady} onFailure={onFailure} /></Suspense></BrandBoundary>}
          </div>
          <div className="brand-scene-caption"><strong>Crystal Powers</strong><span>{live ? "Drag to orbit · scroll to continue the page" : "Rendered artwork · live 3D on larger screens"}</span></div>
          <p className="brand-object-note">{variant === "liquid" ? "Original Blender geometry. Three optical layers. One recognisable signature." : "The original faceted identity, preserved in three dimensions."}</p>
          <p role="status" className="brand-status">{failed ? "The still logo is available. The 3D view could not load." : live && !ready ? "Preparing the crystal…" : live ? "Ready to explore." : "Preview mode. Size, finish and intensity remain adjustable."}</p>
        </div>
        <div className="brand-studio-controls" onFocusCapture={() => { liveActionFocused.current = true; }} onBlurCapture={event => { liveActionFocused.current = event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget); }}>
          {variant === "liquid" && <fieldset className="brand-finish-options"><legend>01 / Material finish</legend>{(Object.keys(brandFinishes) as BrandFinish[]).map(value => <button type="button" key={value} aria-pressed={finish === value} onClick={() => setFinish(value)}><span className={`brand-finish-swatch brand-finish-${value}`} aria-hidden="true" />{brandFinishes[value].label}</button>)}</fieldset>}
          <fieldset className="brand-lighting-options"><legend>02 / Lighting studio</legend>{(Object.keys(brandLighting) as BrandLighting[]).map(value => <button type="button" key={value} aria-pressed={lighting === value} onClick={() => setLighting(value)}>{brandLighting[value].label}</button>)}</fieldset>
          <label className="brand-range-control"><span>Light intensity <output>{brightness}%</output></span><input type="range" min={30} max={180} step={5} value={brightness} aria-label="Light intensity" aria-valuetext={`${brightness} per cent`} onChange={event => setBrightness(Number(event.target.value))} /></label>
          <label className="brand-range-control"><span>Object size <output>{size}%</output></span><input type="range" min={65} max={120} step={5} value={size} aria-label="Object size" aria-valuetext={`${size} per cent`} onChange={event => setSize(Number(event.target.value))} /></label>
          {variant === "liquid" && <>
            <label className="brand-range-control brand-rotation-control"><span>Rotate the crystal <output>{rotation}°</output></span><input type="range" min={-120} max={120} step={5} value={rotation} aria-label="Rotate the crystal" aria-valuetext={`${rotation} degrees`} onChange={event => setRotation(Number(event.target.value))} /></label>
            <fieldset className="brand-part-options" disabled={!live || !ready}><legend>03 / Inspect a part</legend>{([['complete', 'Complete mark'], ['shell', 'Outer shell'], ['core', 'Inner crystal']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={part === value} onClick={() => setPart(value)}>{label}</button>)}</fieldset>
            <label className="brand-topology-choice"><input type="checkbox" checked={topology} disabled={!live || !ready} onChange={event => setTopology(event.target.checked)} />Show mesh construction</label>
          </>}
        </div>
      </div>
      <div className="brand-experience-actions"><button className="brand-reset" type="button" onClick={resetStudio}>Reset view <span aria-hidden="true">↺</span></button>{live && <button type="button" disabled={!ready} aria-pressed={unfold} onFocus={() => { liveActionFocused.current = true; }} onBlur={() => { liveActionFocused.current = false; }} onClick={() => setUnfold(value => !value)}>{unfold ? "Bring it together" : "Unfold the crystal"}</button>}<span className="brand-built-label">MODELLED IN BLENDER · MADE INTERACTIVE FOR THE WEB</span><NavLink to="/portfolio">Explore the work ↗</NavLink></div>
    </section>}
  </div>;
}
