import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useSiteTheme } from "../../app/Layout";
import { useExperience } from "../experience/ExperienceContext";
import { ProjectPresentation } from "../portfolio/ProjectPresentation";
import { ProjectDraft } from "../portfolio/projectApi";

const viewports = { desktop: { label: "Desktop", width: 1440, height: 900 }, tablet: { label: "Tablet", width: 768, height: 1024 }, phone: { label: "Phone", width: 390, height: 844 } };
type Viewport = keyof typeof viewports;

export function PrivateProjectPreview({ project, onBack, privateArea = "admin" }: { project: ProjectDraft; onBack: () => void; privateArea?: "admin" | "team" }) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [fit, setFit] = useState(true);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [styleError, setStyleError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [reload, setReload] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { theme } = useSiteTheme();
  const { reduceEffects } = useExperience();
  const id = useId();
  const size = viewports[viewport];
  const scale = fit ? Math.min(1, availableWidth / size.width) : 1;
  const previewDocument = mount?.ownerDocument;
  useLayoutEffect(() => {
    // An initial about:blank document can already be complete before its load listener attaches.
    if (frame.current?.contentDocument?.readyState === "complete") initialise();
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [reload]);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(host.current); return () => observer.disconnect();
  }, []);
  useEffect(() => { if (previewDocument) previewDocument.body.dataset.theme = theme; }, [previewDocument, theme]);
  useEffect(() => {
    if (!previewDocument) return;
    let live = true;
    // Copy only styles. No app scripts, credentials or draft JSON enter the frame source.
    const syncStyles = () => {
      previewDocument.head.querySelectorAll("[data-preview-style]").forEach(node => node.remove());
      document.head.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]').forEach(source => {
        const clone = source.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;
        clone.setAttribute("data-preview-style", "");
        if (source instanceof HTMLLinkElement) {
          (clone as HTMLLinkElement).href = source.href;
          if (new URL(source.href).origin === location.origin) clone.addEventListener("error", () => { if (live) setStyleError(true); }, { once: true });
        }
        previewDocument.head.appendChild(clone);
      });
    };
    syncStyles();
    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => { live = false; observer.disconnect(); };
  }, [previewDocument]);
  useEffect(() => {
    if (!previewDocument) return;
    const failedImage = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "IMG" && target.getAttribute("src")?.startsWith(`/api/${privateArea}/media/`)) setImageError(true);
    };
    previewDocument.addEventListener("error", failedImage, true);
    return () => previewDocument.removeEventListener("error", failedImage, true);
  }, [previewDocument,privateArea]);
  function initialise() {
    const target = frame.current?.contentDocument;
    if (!target) { setStyleError(true); return; }
    if (target.body.querySelector("[data-private-preview-root]")) return;
    target.documentElement.lang = "en";
    target.title = "Private project preview | Crystal Powers";
    const robots = target.createElement("meta"); robots.name = "robots"; robots.content = "noindex, nofollow"; target.head.appendChild(robots);
    target.body.dataset.theme = theme;
    const element = target.createElement("div"); element.dataset.privatePreviewRoot = ""; target.body.appendChild(element); setMount(element);
  }
  function retry() { setMount(null); setStyleError(false); setImageError(false); setReload(value => value + 1); }
  return <section className="admin-responsive-preview" aria-labelledby={`${id}-title`}>
    <div className="admin-preview-controls"><div><p className="studio-eyebrow">PRIVATE / CURRENT EDITS</p><h2 id={`${id}-title`} ref={heading} tabIndex={-1}>Preview the whole page.</h2><p>The same public layout, with your current unsaved edits. Only your signed-in session can load these images.</p></div><button className="admin-secondary" onClick={onBack}>← Back to editor</button>
      <div className="studio-device-tabs" role="group" aria-label="Preview viewport">{(Object.keys(viewports) as Viewport[]).map(value => <button key={value} type="button" aria-pressed={viewport === value} aria-controls={`${id}-frame`} onClick={() => setViewport(value)}>{viewports[value].label}</button>)}</div>
      <div className="studio-device-tabs" role="group" aria-label="Preview magnification"><button aria-pressed={fit} onClick={() => setFit(true)}>Fit to workspace</button><button aria-pressed={!fit} onClick={() => setFit(false)}>Actual size</button></div>
      <p className="admin-preview-dimensions" role="status">{size.label} · {size.width} × {size.height} px · {Math.round(scale * 100)}%{!fit ? " · Scroll across if needed." : " · Choose Actual size to inspect text and controls."}</p>
    </div>
    {styleError && <div className="admin-error" role="alert"><p>The preview styles couldn’t load. Your edits are still in the editor.</p><button className="admin-secondary" onClick={retry}>Reload preview</button></div>}
    {imageError && <div className="admin-error" role="alert"><p>A private preview image couldn’t load. Check your connection or sign in again through the editor, then reload this preview. Your edits are still here.</p><button className="admin-secondary" onClick={retry}>Reload preview</button></div>}
    <div ref={host} className="admin-preview-scroll" tabIndex={0} role="region" aria-label="Private preview workspace">
      <div className="admin-preview-frame-space" style={{ width: size.width * scale, height: size.height * scale }}>
        <iframe key={reload} ref={frame} id={`${id}-frame`} title="Private project page preview" src="about:blank" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className="admin-preview-frame" style={{ width: size.width, height: size.height, transform: `scale(${scale})` }} onLoad={initialise} />
      </div>
    </div>
    {mount && createPortal(<div className="studio-shell" data-appearance={["clean", "fresh", "summer-vibes"].includes(theme) ? "light" : "dark"} data-reduced-effects={reduceEffects}><ProjectPresentation project={project} preview privateArea={privateArea} metadataDocument={previewDocument} onExitPreview={onBack} /></div>, mount)}
  </section>;
}
