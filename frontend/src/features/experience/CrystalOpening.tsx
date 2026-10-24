import { Component, lazy, PropsWithChildren, Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useSiteTheme } from "../../app/Layout";
import { useExperience } from "./ExperienceContext";
import type { CrystalInteraction } from "./ModelCanvas";
import { PrismStarfield } from "./PrismStarfield";

const loadCanvas = () => import("./ModelCanvas");
const Canvas = lazy(loadCanvas);
type Phase = "closed" | "loading" | "opening" | "open" | "closing";

class OpeningBoundary extends Component<PropsWithChildren<{ fail: () => void }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.fail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** The canvas owns physical motion; CSS owns only the optional DOM reveal. */
export function CrystalOpening() {
  const { theme } = useSiteTheme();
  const { activeStage, activate, release, reduceEffects, threeDAllowed, systemReducedMotion: systemReduced, pageVisible } = useExperience();
  const reduced = systemReduced || reduceEffects || !threeDAllowed;
  const light = ["clean", "fresh", "summer-vibes"].includes(theme);
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  const latestStage = useRef(activeStage);
  latestStage.current = activeStage;
  const interaction = useRef<CrystalInteraction>({ yaw: 0, pitch: 0, hoverX: 0, hoverY: 0, palette: 0, pulse: 0 });
  const [info, setInfo] = useState(0);
  const posterElement = useRef<HTMLPictureElement>(null);
  const projectionShown = useRef(false);
  const retireOnClose = useRef(false);
  const drag = useRef<{ id: number; x: number; y: number; yaw: number; pitch: number; moved: boolean } | null>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(true);

  const [attempt, setAttempt] = useState(0);
  const [boundaryVersion, setBoundaryVersion] = useState(0);
  const active = activeStage === id && !reduced;
  const moving = phase === "opening" || phase === "closing";
  const revealed = phase === "open";
  if (revealed) projectionShown.current = true;
  if (phase === "closed" || phase === "loading") projectionShown.current = false;
  const finish = useCallback(() => {
    const controlsHadFocus = host.current?.querySelector(".opening-controls")?.contains(document.activeElement);
    setPhase(phase === "closing" ? "closed" : "open");
    if (phase === "closing") {
      if (retireOnClose.current) { release(id); setReady(false); }
      requestAnimationFrame(() => launch.current?.focus({ preventScroll: true })); }
    else if (controlsHadFocus) requestAnimationFrame(() => launch.current?.focus({ preventScroll: true }));
  }, [phase, release, id]);
  const fail = useCallback(() => {
    if (host.current?.querySelector(".opening-controls")?.contains(document.activeElement)) launch.current?.focus({ preventScroll: true });
    setFailed(true); setReady(false); setPhase("open");
  }, []);
  const onReady = useCallback(() => {
    setReady(true);
    setPhase(current => current === "loading" ? "opening" : current);
  }, []);
  const settle = useCallback(() => setPhase(current => current === "closing" ? "closed" : current === "closed" ? "closed" : "open"), []);

  useEffect(() => {
    return () => { generation.current += 1; if (latestStage.current === id) release(id); };
  }, [id, release]);
  useEffect(() => {
    if (!host.current || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      if (entry) setVisible(entry.isIntersecting);
    }, { rootMargin: "100px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!active || !visible || !pageVisible) { generation.current += 1; setReady(false); settle(); }
  }, [active, visible, pageVisible, settle]);
  useEffect(() => {
    if (reduced) { release(id); settle(); }
  }, [reduced, release, id, settle]);
  useEffect(() => {
    if (!active || !visible || !pageVisible || ready || failed) return;
    const timer = window.setTimeout(fail, 12_000);
    return () => window.clearTimeout(timer);
  }, [active, visible, pageVisible, ready, failed, fail]);
  useEffect(() => {
    if (!active || !moving) return;
    // A stalled animation must never gate content indefinitely.
    const timer = window.setTimeout(() => { settle(); activate(null); }, 4000);
    return () => window.clearTimeout(timer);
  }, [active, moving, phase, settle, activate]);

  function prepareInteraction() {
    if (!reduced && !active && !failed) { setVisible(true); activate(id); }
  }
  function updateView() {
    const motion = interaction.current;
    motion.invalidate?.();
    // Direct manipulation remains visible while the lazy renderer is preparing,
    // and on compact devices which deliberately retain the rendered artwork.
    if (posterElement.current) posterElement.current.style.transform = `perspective(1000px) rotateX(${motion.pitch}rad) rotateY(${motion.yaw}rad)`;
  }
  function close() {
    if ((phase === "open" || phase === "opening") && active && ready && !failed && !reduced) {
      retireOnClose.current = true;
      if (host.current?.querySelector(".prism-projection")?.contains(document.activeElement)) launch.current?.focus({ preventScroll: true });
      setPhase("closing");
    } else dismiss();
  }
  function open() {
    retireOnClose.current = false;
    generation.current += 1;
    setFailed(false); setVisible(true);
    setAttempt(value => value + 1);
    if (reduced) { setPhase("open"); release(id); return; }
    setPhase(active && ready ? "opening" : "loading");
    activate(id);

  }
  function dismiss() {
    generation.current += 1;
    Object.assign(interaction.current, { yaw: 0, pitch: 0, hoverX: 0, hoverY: 0, pulse: 0 });
    if (posterElement.current) posterElement.current.style.transform = "";
    release(id); setPhase("closed"); setReady(false);
    requestAnimationFrame(() => launch.current?.focus({ preventScroll: true }));
  }
  async function retry() {
    const request = ++generation.current;
    try {
      const renderer = await loadCanvas();
      if (request !== generation.current) return;
      renderer.clearModelCache("prism-gate");
      setBoundaryVersion(value => value + 1);
      setReady(false);
      // The Retry control disappears on success; retain keyboard ownership.
      launch.current?.focus({ preventScroll: true });
      open();
    } catch { if (request === generation.current) fail(); }
  }
  function toggle() {
    if (phase === "loading") return;
    if (revealed || phase === "opening") close();
    else if (phase === "closing") { retireOnClose.current = false; setPhase("opening"); }
    else open();
  }


  const poster = `/renders/prism-gate-${revealed ? "open" : "closed"}`;
  return <div ref={host} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close(); } }} className="crystal-opening" data-phase={phase} data-ready={ready} data-reduced={reduced}>
    <PrismStarfield paused={false} departing={phase === "opening" || phase === "open"} light={light} />
    <div className="opening-caption"><span>PRISM GATE / 01</span>{revealed ? <NavLink to="/portfolio">Explore the work ↗</NavLink> : <span>Turn a little. Discover more.</span>}</div>
    <div className="opening-viewport"><div className="opening-scene-frame">
    <div className="opening-surface" role="button" tabIndex={0} aria-pressed={revealed || phase === "opening"} aria-label="Interactive Prism Gate. Click or press Enter to open or close. Drag to rotate; arrow keys also rotate. Escape returns to rest." onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (!event.repeat) toggle(); }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        prepareInteraction();
        const motion = interaction.current;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") motion.yaw += event.key === "ArrowLeft" ? -0.25 : 0.25;
        else motion.pitch = Math.max(-0.65, Math.min(0.65, motion.pitch + (event.key === "ArrowUp" ? -0.15 : 0.15)));
        updateView();
      }
    }} onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      const motion = interaction.current;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: motion.yaw, pitch: motion.pitch, moved: false };
      // Touch keeps native vertical scrolling; capture only a deliberate drag.
      if (event.pointerType !== "touch") event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={event => {
      const motion = interaction.current;
      const pointer = drag.current;
      if (pointer && pointer.id === event.pointerId) {
        const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
        if (Math.hypot(dx, dy) > 6) pointer.moved = true;
        if (pointer.moved) {
          prepareInteraction();
          motion.yaw = pointer.yaw + dx * 0.007;
          motion.pitch = Math.max(-0.65, Math.min(0.65, pointer.pitch + dy * 0.005));
          motion.hoverX = 0; motion.hoverY = 0;
          updateView();
        }
      } else if (!reduced && event.pointerType === "mouse") {
        const bounds = event.currentTarget.getBoundingClientRect();
        motion.hoverX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.18;
        motion.hoverY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.12;
        motion.invalidate?.();
      }
    }} onPointerUp={event => {
      const pointer = drag.current;
      if (!pointer || pointer.id !== event.pointerId) return;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (!pointer.moved) toggle();
    }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onPointerLeave={() => {
      interaction.current.hoverX = 0; interaction.current.hoverY = 0; interaction.current.invalidate?.();
    }}>
    <picture ref={posterElement} className="opening-poster"><source type="image/webp" srcSet={`${poster}-800.webp?v=prism-optical-06 800w, ${poster}.webp?v=prism-optical-06 1600w`} sizes="(max-width: 1000px) 100vw, 50vw" /><img src={`${poster}.png?v=prism-optical-06`} alt={revealed ? "Four softly rounded glass corners expanded around an upward-facing diamond projector" : "Softly curved liquid-glass gate with a subtle neon tint and a faceted diamond projector"} width="1600" height="1200" loading="lazy" draggable={false} /></picture>
    {active && visible && pageVisible && !failed && <div className="opening-canvas" ><OpeningBoundary key={boundaryVersion} fail={fail}><Suspense fallback={null}><Canvas model="prism-gate" light={light} clip={phase === "closing" ? "CrystalClose" : "CrystalOpen"} pose={revealed ? "open" : "closed"} angle={0} interaction={interaction} reset={attempt} playing={ready && moving} onReady={onReady} onFinished={finish} onFailure={fail} onInteraction={settle} /></Suspense></OpeningBoundary></div>}
    </div>
    <section className="prism-projection" data-visible={revealed || (phase === "closing" && projectionShown.current)} aria-label="Studio information" aria-hidden={!revealed} inert={!revealed}>
      <div className="prism-beam" aria-hidden="true" />
      <div className="prism-hologram">
        <span className="prism-signal">CRYSTAL POWERS / STUDIO TRANSMISSION</span>
        <div className="prism-copy" key={info}>
          <span className="prism-index">0{info + 1} / 03</span>
          <h2>{["Websites with presence.", "Ideas, made interactive.", "Built around your business."][info]}</h2>
          <p>{["Distinctive design. Thoughtful development. A clear path from first impression to conversation.", "Purposeful apps and digital experiences, crafted to feel intuitive on every screen.", "Client portals, integrations and bespoke systems that make everyday work simpler."][info]}</p>
        </div>
        <nav className="prism-tabs" aria-label="Explore studio services">{["Websites", "Apps", "Systems"].map((label, index) => <button key={label} type="button" aria-pressed={info === index} onClick={() => setInfo(index)}>{label}</button>)}</nav>
        <NavLink to="/services" className="prism-link">Explore the possibilities <span aria-hidden="true">↗</span></NavLink>
      </div>
    </section>
    </div></div>
    <div className="opening-controls">
      <p role="status">{failed ? "3D is unavailable. Explore the rendered experience." : phase === "loading" ? "Preparing Prism Gate…" : reduced ? "Still experience · motion reduced" : moving ? "Click again to reverse · drag to explore" : revealed ? "Click to close · drag to rotate" : "Click to project · drag to rotate"}</p>
      <div className="opening-actions">
        <button ref={launch} type="button" onClick={() => phase === "loading" ? dismiss() : toggle()}>{phase === "loading" ? "Cancel" : revealed || phase === "opening" ? "Close projector" : "Open projector"} <span aria-hidden="true">◇</span></button>
        {failed ? <button type="button" onClick={() => void retry()}>Retry 3D</button> : !reduced && <>
          <button type="button" disabled={!ready} onClick={() => { interaction.current.pulse += 1; interaction.current.invalidate?.(); }}>Pulse light</button>
          <button type="button" disabled={!ready} onClick={() => { Object.assign(interaction.current, { yaw: 0, pitch: 0, hoverX: 0, hoverY: 0 }); updateView(); }}>Reset view</button>
        </>}
      </div>

    </div>
  </div>;
}
