import { ScenePoster } from "./ScenePoster";
import { Component, lazy, PropsWithChildren, Suspense, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useSiteTheme } from "../../app/Layout";
import { useExperience } from "./ExperienceContext";

const loadModelCanvas = () => import("./ModelCanvas");
const ModelCanvas = lazy(loadModelCanvas);
const WARMUP_TIMEOUT_MS = 12_000;
export type ModelKind = "crystal" | "laptop" | "monitor" | "phone" | "observatory";
type Props = { model: Exclude<ModelKind, "observatory">; image?: string; imageAlt?: string; title?: string; className?: string };

class SceneBoundary extends Component<PropsWithChildren<{ onFailure: () => void }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function ModelStage({ model, image, imageAlt = "Project screenshot", title = "Explore the details", className = "" }: Props) {
  const { theme } = useSiteTheme();
  const appearance = ["clean", "fresh", "summer-vibes"].includes(theme) ? "light" : "dark";
  const id = useId();
  const { activeStage, activate, release, reduceEffects, reducedMotion: reduced, pageVisible, ambientMotion } = useExperience();
  const active = activeStage === id && !reduceEffects;
  const host = useRef<HTMLDivElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const returnLaunchFocus = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [angle, setAngle] = useState(0);
  const [reset, setReset] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [film, setFilm] = useState(false);
  const [filmFailed, setFilmFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryGeneration = useRef(0);
  const displayImage = image ?? (model === "crystal" ? undefined : `/renders/studio-${model === "phone" ? "mobile" : "screen"}.png`);
  const handleFailure = useCallback(() => { setFailed(true); setPlaying(false); setReady(false); }, []);
  const handleReady = useCallback(() => setReady(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const open = () => {
    // A visible launch control is authoritative even before the observer reports.
    setVisible(true);
    activate(id); setFilm(false); setPlaying(false); setFailed(false);
  };
  const close = () => { returnLaunchFocus.current = true; activate(null); setPlaying(false); };
  useLayoutEffect(() => {
    if (!active && returnLaunchFocus.current) { returnLaunchFocus.current = false; launch.current?.focus(); }
  }, [active]);
  useEffect(() => {
    retryGeneration.current += 1;
    setRetrying(false);
    return () => { retryGeneration.current += 1; };
  }, [model, image, active]);
  const retry = async () => {
    const generation = retryGeneration.current;
    setRetrying(true);
    try {
      const renderer = await loadModelCanvas();
      if (generation !== retryGeneration.current) return;
      renderer.clearModelCache(model, displayImage);
      setReady(false); setFailed(false); setReset(value => value + 1);
    } catch {
      if (generation === retryGeneration.current) handleFailure();
    } finally {
      if (generation === retryGeneration.current) setRetrying(false);
    }
  };
  useEffect(() => {
    if (!host.current || typeof IntersectionObserver !== "function") { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    observer.observe(host.current); return () => observer.disconnect();
  }, []);
  useEffect(() => () => release(id), [release, id]);
  useEffect(() => { setReady(false); setPlaying(false); setFailed(false); }, [model, image, active]);
  useEffect(() => {
    if (!active || !visible || !pageVisible) { setReady(false); setPlaying(false); return; }
    if (ready || failed) return;
    const timer = window.setTimeout(handleFailure, WARMUP_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [active, visible, pageVisible, ready, failed, handleFailure]);
  useEffect(() => { if (active && ready) host.current?.querySelector<HTMLElement>(".stage-canvas")?.focus({ preventScroll: true }); }, [active, ready]);
  useEffect(() => { if (reduced) { setPlaying(false); setFilm(false); } }, [reduced]);
  useEffect(() => {
    const player = video.current;
    if (film && visible && pageVisible && activeStage === null && ambientMotion) void player?.play().catch(() => setFilm(false));
    else player?.pause();
    return () => player?.pause();
  }, [film, visible, pageVisible, activeStage, ambientMotion, appearance]);
  return <div ref={host} className={`model-stage ${className}`} data-active={active} data-ready={ready}>
    {image && model !== "crystal" ? <div className={`stage-poster stage-project-poster stage-project-${model}`}><div className="stage-project-device"><img src={image} alt={imageAlt} loading="lazy" /></div></div> : <ScenePoster model={model} light={appearance === "light"} className="stage-poster stage-live-poster" sizes="(max-width: 700px) 100vw, 70vw" eager={model === "crystal"} alt={model === "crystal" ? "Faceted optical crystals on a polished metal plinth" : `Custom ${model} display`} />}
    {film && activeStage === null && ambientMotion && <video key={appearance} ref={video} className="stage-film" src={`/renders/crystal-${appearance}-orbit.mp4`} poster={`/renders/crystal-${appearance}.webp`} muted loop playsInline aria-label="Cinematic crystal orbit" onError={() => { setFilm(false); setFilmFailed(true); }} />}
    {active && visible && pageVisible && !failed && <div className="stage-canvas" tabIndex={0} role="region" aria-label={`${model} 3D view. Use left and right arrow keys to rotate. Press Escape to close.`} onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); setAngle(value => value + (event.key === "ArrowLeft" ? -0.3 : 0.3)); }
      if (event.key === "Escape") { event.stopPropagation(); close(); }
    }}><SceneBoundary key={`${model}:${displayImage ?? ""}`} onFailure={handleFailure}><Suspense fallback={null}><ModelCanvas model={model} image={displayImage} light={appearance === "light"} angle={angle} reset={reset} playing={playing} onInteraction={pause} onFinished={pause} onFailure={handleFailure} onReady={handleReady} /></Suspense></SceneBoundary></div>}
    {active && visible && pageVisible && !ready && !failed && <p className="stage-status" role="status">Loading the 3D view… You can close this view and keep browsing.</p>}
    {(active && failed || filmFailed) && <p className="stage-error" role="status">{failed ? "3D is unavailable on this device. The rendered view is still available." : "The film could not load. The rendered view is still available."}</p>}
    <div className="stage-controls">{reduceEffects ? <p className="stage-reduced-note">Rendered view · effects reduced</p> : !active ? <>{model === "crystal" && ambientMotion && <button type="button" aria-pressed={film} onClick={() => { setFilm(!film); setFilmFailed(false); }}>{film ? "Pause film" : "Play film"}</button>}<button ref={launch} type="button" className="stage-launch" onClick={open}><span aria-hidden="true">◇</span> {title} <span aria-hidden="true">↗</span></button></> : <>
      {failed ? <button type="button" disabled={retrying} onClick={() => void retry()}>{retrying ? "Preparing retry…" : "Retry 3D view"}</button> : <><button type="button" aria-label="Rotate left" disabled={!ready} onClick={() => setAngle(value => value - 0.35)}>←</button><button type="button" aria-label="Rotate right" disabled={!ready} onClick={() => setAngle(value => value + 0.35)}>→</button><button type="button" disabled={!ready} onClick={() => { setAngle(0); setPlaying(false); setReset(value => value + 1); }}>Reset</button>{!reduced && (model === "crystal" || model === "laptop") && <button type="button" disabled={!ready} aria-pressed={playing} onClick={() => setPlaying(value => !value)}>{playing ? "Pause" : "Animate"}</button>}</>}
      <button type="button" aria-label="Close 3D view" onClick={close}>Close ×</button>
    </>}</div>
  </div>;
}
