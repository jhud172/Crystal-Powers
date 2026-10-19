import { keepModalFocus } from "../../lib/dialogFocus";
import { useEffect, useId, useRef, useState } from "react";
import { ProjectArtwork } from "./ProjectArtwork";
import { imageUrl, ProjectContent } from "./projectApi";

export function ProjectGallery({ images, preview = false, privateArea = "admin" }: { images: ProjectContent["gallery"]; preview?: boolean; privateArea?: "admin" | "team" }) {
  const [index, setIndex] = useState<number | null>(null);
  const [attempt,setAttempt]=useState(0);
  const [zoomed, setZoomed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  const image = index === null ? null : images[index];
  const originalUrl = image ? imageUrl(image.mediaId, preview, privateArea) : "";
  const detailUrl = attempt ? `${originalUrl}${originalUrl.includes("?") ? "&" : "?"}galleryReload=${attempt}` : originalUrl;
  function choose(position: number) { setIndex(Math.max(0, Math.min(images.length - 1, position))); setZoomed(false); }
  function close() { setIndex(null); dialog.current?.close(); trigger.current?.focus(); }
  useEffect(() => {
    if (image) { if (!dialog.current?.open) dialog.current?.showModal(); }
    else if (index !== null) close();
  }, [index, image?.mediaId]);
  if (!images.length) return null;
  return <section className="case-gallery" id="project-gallery" aria-labelledby={`${id}-heading`}>
    <div className="studio-section-heading"><div><p className="studio-eyebrow">THE DETAILS / IN FOCUS</p><h2 id={`${id}-heading`}>A closer look.</h2></div><p className="studio-soft">Open an image to explore it.</p></div>
    <div className="case-gallery-grid">{images.map((item, position) => <figure key={item.mediaId}><button type="button" aria-label={`Open image ${position + 1}: ${item.alt || "Project screenshot"}`} onClick={event => { trigger.current = event.currentTarget; choose(position); }}><ProjectArtwork src={imageUrl(item.mediaId, preview, privateArea)} alt={item.alt} /><span aria-hidden="true">{String(position + 1).padStart(2, "0")} / Enlarge ↗</span></button><figcaption>{item.alt}</figcaption></figure>)}</div>
    <dialog className="case-lightbox" ref={dialog} aria-labelledby={`${id}-dialog-title`} onClose={()=>{setIndex(null);if(trigger.current?.isConnected)trigger.current.focus();}} onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => {
      keepModalFocus(event);
      if (event.defaultPrevented) return;
      if (index === null) return;
      if (zoomed && event.target instanceof Element && event.target.closest(".case-image-viewport")) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); choose(index - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); choose(index + 1); }
    }}>
      <header><div><p className="studio-eyebrow">THE DETAILS / IN FOCUS</p><h2 id={`${id}-dialog-title`}>Project images</h2></div><button type="button" onClick={close} aria-label="Close image gallery">Close ×</button></header>
      <div className="case-image-tools" role="group" aria-label="Image tools">{image && <><button type="button" onClick={()=>setAttempt(value=>Math.max(Date.now(),value+1))}>Reload image</button><button type="button" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? "Fit image" : "Actual size"}</button></>}<p>{zoomed ? "Focus the image area to pan with the arrow keys." : "Use ← and → to browse. Escape closes the gallery."}</p></div>
      {image && <figure><GalleryImageDetail key={`${image.mediaId}:${attempt}`} src={detailUrl} alt={image.alt} zoomed={zoomed} /><figcaption>{image.alt}</figcaption></figure>}
      {images.length > 1 && <div className="case-gallery-thumbnails" role="group" aria-label="Choose project image">{images.map((item, position) => <button type="button" key={item.mediaId} aria-label={`View image ${position + 1}: ${item.alt || "Project screenshot"}`} aria-current={position === index ? "true" : undefined} onClick={() => choose(position)}><ProjectArtwork src={imageUrl(item.mediaId, preview, privateArea)} alt="" /><span aria-hidden="true">{String(position + 1).padStart(2, "0")}</span></button>)}</div>}
      <footer><button type="button" disabled={index === 0} onClick={() => choose((index ?? 0) - 1)} aria-label="Previous image">← Previous</button><p role="status">Image {(index ?? 0) + 1} of {images.length}</p><button type="button" disabled={index === images.length - 1} onClick={() => choose((index ?? 0) + 1)} aria-label="Next image">Next →</button></footer>
    </dialog>
  </section>;
}

/** Request-owned state: an older image cannot replace a new image's status. */
function GalleryImageDetail({ src, alt, zoomed }: { src: string; alt: string; zoomed: boolean }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  return <div className="case-image-viewport" data-zoomed={zoomed} role="region" aria-label="Project image viewing area" tabIndex={zoomed ? 0 : -1} aria-busy={state === "loading"}>
    {state !== "ready" && <p role="status">{state === "loading" ? "Loading image…" : "This image couldn’t load. Reload it, try another image or close the gallery."}</p>}
    {state !== "failed" && <img src={src} alt={alt} onLoad={() => setState("ready")} onError={() => setState("failed")} />}
  </div>;
}
