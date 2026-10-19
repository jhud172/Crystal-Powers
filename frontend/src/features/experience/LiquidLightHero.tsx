import { ProjectArtwork } from "../portfolio/ProjectArtwork";
import { LiquidLightArtwork } from "./LiquidLightArtwork";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import { useSiteTheme } from "../../app/Layout";
import { imageUrl, type PublicProject } from "../portfolio/projectApi";
import { useExperience } from "./ExperienceContext";

export type LiquidSettings = { colour: "coral" | "cyan" | "violet"; intensity: number; scale: number; duration: number; reduceEffects: boolean };
export const defaultLiquidSettings: LiquidSettings = { colour: "coral", intensity: 85, scale: 100, duration: 750, reduceEffects: false };
type PreviewProject = { title: string; image: string; href: string };
type Props = { project?: PublicProject; settings?: LiquidSettings; previewProject?: PreviewProject };

/** CSS owns the ambient loop; the separate veil owns the reversible work reveal. */
function LightVeil({ open, settings, reduceEffects, paused }: { open: boolean; settings: LiquidSettings; reduceEffects: boolean; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const timeline = useRef<Animation | null>(null);
  const [visible, setVisible] = useState(true);
  const [failed, setFailed] = useState(false);
  const policy = useExperience();
  const quiet = reduceEffects || settings.reduceEffects || policy.reducedMotion || !policy.pageVisible || !visible;
  useEffect(() => {
    if (!host.current || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = veil.current;
    if (!node) return;
    const current = getComputedStyle(node);
    const from = { transform: current.transform, opacity: current.opacity };
    timeline.current?.cancel();
    const to = { transform: open ? "translate3d(18%, -12%, 0) scale(1.12)" : "translate3d(0, 0, 0) scale(1)", opacity: open ? "0.16" : "1" };
    node.style.transform = to.transform;
    node.style.opacity = to.opacity;
    if (!quiet && typeof node.animate === "function") {
      const animation = node.animate([from, to], { duration: settings.duration, easing: "cubic-bezier(.22, 1, .36, 1)" });
      timeline.current = animation;
      animation.onfinish = () => { if (timeline.current === animation) timeline.current = null; };
    }
    return () => {
      // Preserve the actual in-flight frame before cancellation so reversal
      // starts here rather than snapping to the old inline endpoint.
      if (timeline.current) {
        const frame = getComputedStyle(node);
        node.style.transform = frame.transform;
        node.style.opacity = frame.opacity;
        timeline.current.cancel();
        timeline.current = null;
      }
    };
  }, [open, settings.duration, quiet, failed]);
  const hue = settings.colour === "cyan" ? 155 : settings.colour === "violet" ? 255 : 0;
  const variables = { "--liquid-hue": `${hue}deg`, "--liquid-intensity": settings.intensity / 100, "--liquid-scale": settings.scale / 100 } as CSSProperties;
  return <div ref={host} className="liquid-light-art" style={variables} aria-hidden="true" data-failed={failed} data-ambient-paused={quiet || paused}>
    {!failed && <div ref={veil} className="liquid-light-veil"><div className="liquid-light-flow"><LiquidLightArtwork alt="" priority onUnavailable={()=>setFailed(true)}/></div></div>}
  </div>;
}

export function LiquidLightHero({ project, settings = defaultLiquidSettings, previewProject }: Props) {
  const { theme } = useSiteTheme();
  const { reduceEffects, reducedMotion } = useExperience();
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const revealId = useId();
  const light = ["clean", "fresh", "summer-vibes"].includes(theme);
  const [replay, setReplay] = useState(0);
  const opener = useRef<HTMLButtonElement>(null);
  const shown = previewProject ?? (project ? { title: project.content.title, image: project.content.coverMediaId ? imageUrl(project.content.coverMediaId) : "", href: `/portfolio/${project.slug}` } : null);
  const calm = reduceEffects || reducedMotion || settings.reduceEffects;
  return <section className="liquid-hero" data-light={light} data-open={open} data-calm={calm} aria-labelledby="hero-title" onKeyDown={event => { if (event.key === "Escape" && open) { event.stopPropagation(); opener.current?.focus(); setOpen(false); } }}>
    <LightVeil key={replay} open={open} settings={settings} reduceEffects={reduceEffects} paused={paused} />
    <div className="liquid-hero-content">
      <p className="liquid-wordmark" aria-label="Crystal Powers"><span aria-hidden="true">Crystal</span><span aria-hidden="true">Powers</span></p>
      <div className="liquid-hero-copy"><p className="studio-eyebrow">INDEPENDENT DIGITAL STUDIO</p><h1 id="hero-title">Your idea.<br />A new dimension.</h1><p>Websites, apps and bespoke systems.<br />Designed and developed by James.</p>
        <div className="liquid-actions"><NavLink to="/contact?intent=general" className="liquid-primary">Start a project</NavLink><button ref={opener} type="button" className="liquid-explore" aria-expanded={open} aria-controls={revealId} onClick={() => setOpen(value => !value)}>{open ? "Close the experience" : "Explore the work"}</button>{!calm && <button type="button" className="liquid-replay liquid-pause" onClick={() => setPaused(value => !value)}>{paused ? "Resume animation" : "Pause animation"}</button>}</div>
      </div>
      <div className="liquid-reveal" data-open={open}><div className="liquid-reveal-copy"><p className="studio-eyebrow">SELECTED WORK</p><h2>{shown?.title ?? "An idea. Made real."}</h2><p>{shown ? "A closer look at the work behind the light." : "Explore the published portfolio and the way we would work together."}</p><NavLink to={shown?.href ?? "/portfolio"} className="studio-text-link">{shown ? "Explore the project" : "View the portfolio"}</NavLink></div>
        <div id={revealId} className="liquid-reveal-detail" hidden={!open}>
          {open && shown ? <div className="liquid-reveal-media"><ProjectArtwork src={shown.image || undefined} alt={`${shown.title} — project screenshot`} retry /></div> : <p>View the portfolio for project details, screenshots and the work behind each experience.</p>}
          {open && <div className="liquid-reveal-controls">{!calm && <button type="button" className="liquid-replay" onClick={() => setReplay(value => value + 1)}>Replay opening</button>}<button type="button" className="liquid-replay" onClick={()=>{opener.current?.focus();setOpen(false);}}>Close preview</button></div>}
        </div>
      </div>
    </div>
  </section>;
}
