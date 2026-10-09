import { Component, lazy, PropsWithChildren, Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useSiteTheme } from "../../app/Layout";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useExperience } from "./ExperienceContext";
import type { CrystalInteraction } from "./ModelCanvas";

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
  const { activeStage, activate, reduceEffects } = useExperience();
  const systemReduced = usePrefersReducedMotion();
  const reduced = systemReduced || reduceEffects;
  const light = ["clean", "fresh", "summer-vibes"].includes(theme);
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  const latestStage = useRef(activeStage);
  latestStage.current = activeStage;
  const interaction = useRef<CrystalInteraction>({ yaw: 0, pitch: 0, hoverX: 0, hoverY: 0, palette: 0, pulse: 0 });
  const [palette, setPalette] = useState(0);
  const drag = useRef<{ id: number; x: number; y: number; yaw: number; pitch: number; moved: boolean } | null>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(document.visibilityState === "visible");

  const [attempt, setAttempt] = useState(0);
  const [boundaryVersion, setBoundaryVersion] = useState(0);
  const active = activeStage === id && !reduced;
  const moving = phase === "opening" || phase === "closing";
  const revealed = phase === "open";
  const finish = useCallback(() => {
    const controlsHadFocus = host.current?.querySelector(".opening-controls")?.contains(document.activeElement);
    setPhase(phase === "closing" ? "closed" : "open");
    if (phase === "closing") { requestAnimationFrame(() => launch.current?.focus({ preventScroll: true })); }
    else if (controlsHadFocus) requestAnimationFrame(() => launch.current?.focus({ preventScroll: true }));
  }, [phase]);
  const fail = useCallback(() => { setFailed(true); setReady(false); setPhase("open"); }, []);
  const onReady = useCallback(() => {
    setReady(true);
    setPhase(current => current === "loading" ? "opening" : current);
  }, []);
  const settle = useCallback(() => setPhase(current => current === "closing" ? "closed" : current === "closed" ? "closed" : "open"), []);

  useEffect(() => {
    return () => { generation.current += 1; if (latestStage.current === id) activate(null); };
  }, [id, activate]);
  useEffect(() => {
    if (!host.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const changed = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", changed);
    return () => document.removeEventListener("visibilitychange", changed);
  }, []);
  useEffect(() => {
    if (!active || !visible || !pageVisible) { generation.current += 1; setReady(false); settle(); }
  }, [active, visible, pageVisible, settle]);
  useEffect(() => {
    if (reduced) { activate(null); settle(); }
  }, [reduced, activate, settle]);
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

  function open() {
    generation.current += 1;
    setFailed(false); setVisible(true);
    setPageVisible(document.visibilityState === "visible");
    setAttempt(value => value + 1);
    if (reduced) { setPhase("open"); activate(null); return; }
    setPhase(active && ready ? "opening" : "loading");
    activate(id);
    if (document.activeElement === launch.current) requestAnimationFrame(() => host.current?.querySelector<HTMLButtonElement>(".opening-controls button")?.focus({ preventScroll: true }));
  }
  function dismiss() {
    generation.current += 1;
    Object.assign(interaction.current, { yaw: 0, pitch: 0, hoverX: 0, hoverY: 0, pulse: 0 });
    activate(null); setPhase("closed"); setReady(false);
    requestAnimationFrame(() => launch.current?.focus({ preventScroll: true }));
  }
  async function retry() {
    const request = ++generation.current;
    try {
      const renderer = await loadCanvas();
      if (request !== generation.current) return;
      renderer.clearModelCache("observatory");
      setBoundaryVersion(value => value + 1);
      setReady(false);
      open();
    } catch { if (request === generation.current) fail(); }
  }
  function toggle() {
    if (phase === "loading") return;
    if ((revealed || phase === "opening") && active && ready && !failed && !reduced) setPhase("closing");
    else if (phase === "closing") setPhase("opening");
    else if (revealed) dismiss();
    else open();
  }
  useEffect(() => {
    if (visible && pageVisible && !reduced && !failed && activeStage === null) activate(id);
  }, [visible, pageVisible, reduced, failed, activeStage, activate, id]);

  const poster = `/renders/observatory-${light ? "light" : "dark"}${revealed ? "-open" : ""}`;
  return <div ref={host} className="crystal-opening" data-phase={phase} data-ready={ready} data-reduced={reduced}>
    <div className="opening-caption"><span>AURORA / 02</span>{revealed ? <NavLink to="/portfolio">Explore the work ↗</NavLink> : <span>Turn a little. Discover more.</span>}</div>
    <div className="opening-surface" role="button" tabIndex={0} aria-pressed={revealed || phase === "opening"} aria-label="Interactive crystal. Click or press Enter to open or close. Drag to rotate; arrow keys also rotate. Escape returns to rest." onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss(); }
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (!event.repeat) toggle(); }
      if (!reduced && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const motion = interaction.current;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") motion.yaw += event.key === "ArrowLeft" ? -0.25 : 0.25;
        else motion.pitch = Math.max(-0.65, Math.min(0.65, motion.pitch + (event.key === "ArrowUp" ? -0.15 : 0.15)));
        motion.invalidate?.();
      }
    }} onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      const motion = interaction.current;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: motion.yaw, pitch: motion.pitch, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={event => {
      const motion = interaction.current;
      const pointer = drag.current;
      if (pointer && pointer.id === event.pointerId) {
        const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
        if (Math.hypot(dx, dy) > 6) pointer.moved = true;
        if (pointer.moved && !reduced) {
          motion.yaw = pointer.yaw + dx * 0.007;
          motion.pitch = Math.max(-0.65, Math.min(0.65, pointer.pitch + dy * 0.005));
          motion.hoverX = 0; motion.hoverY = 0;
          motion.invalidate?.();
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
    <picture className="opening-poster"><source type="image/webp" srcSet={`${poster}-800.webp?v=aurora-02 800w, ${poster}.webp?v=aurora-02 1600w`} sizes="(max-width: 1000px) 100vw, 50vw" /><img src={`${poster}.png?v=aurora-02`} alt={revealed ? "Jewel-coloured crystal petals unfolding around a luminous heart and fine gold orbits" : "A sculpted prismatic crystal with mineral textures, gold inlays and suspended jewel fragments"} width="1600" height="1000" fetchPriority="high" draggable={false} /></picture>
    {active && visible && pageVisible && !failed && <div className="opening-canvas" ><OpeningBoundary key={boundaryVersion} fail={fail}><Suspense fallback={null}><Canvas model="observatory" light={light} clip={phase === "closing" ? "CrystalClose" : "CrystalOpen"} pose={revealed ? "open" : "closed"} angle={0} interaction={interaction} reset={attempt} playing={ready && moving} onReady={onReady} onFinished={finish} onFailure={fail} onInteraction={settle} /></Suspense></OpeningBoundary></div>}
    </div>
    <div className="opening-controls">
      <p role="status">{failed ? "3D is unavailable. Explore the rendered experience." : phase === "loading" ? "Preparing the crystal…" : reduced ? "Still experience · motion reduced" : moving ? "Click again to reverse · drag to explore" : revealed ? "Click to close · drag to rotate" : "Click to unfold · drag to rotate"}</p>
      <div className="opening-actions">
        <button ref={launch} type="button" onClick={() => phase === "loading" ? dismiss() : toggle()}>{phase === "loading" ? "Cancel" : revealed || phase === "opening" ? "Close crystal" : "Unfold crystal"} <span aria-hidden="true">◇</span></button>
        {failed ? <button type="button" onClick={() => void retry()}>Retry 3D</button> : !reduced && <>
          <button type="button" disabled={!ready} onClick={() => { interaction.current.pulse = 1; interaction.current.invalidate?.(); }}>Pulse light</button>
          <button type="button" disabled={!ready} onClick={() => { Object.assign(interaction.current, { yaw: 0, pitch: 0, hoverX: 0, hoverY: 0 }); interaction.current.invalidate?.(); }}>Reset view</button>
        </>}
      </div>
      {!reduced && !failed && <div className="opening-palettes" role="group" aria-label="Crystal colours">{["Aurora", "Ember", "Tide"].map((name, index) => <button key={name} type="button" aria-pressed={palette === index} disabled={!ready} onClick={() => { setPalette(index); interaction.current.palette = index; interaction.current.invalidate?.(); }}><span className={`opening-swatch opening-swatch-${index}`} aria-hidden="true" />{name}</button>)}</div>}
    </div>
  </div>;
}
