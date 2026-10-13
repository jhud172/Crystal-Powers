import { useEffect, useId, useRef, useState } from "react";
import { ProjectArtwork } from "./ProjectArtwork";
import { imageUrl, ProjectContent } from "./projectApi";

export function ProjectGallery({ images, preview = false, privateArea = "admin" }: { images: ProjectContent["gallery"]; preview?: boolean; privateArea?: "admin" | "team" }) {
  const [index, setIndex] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt,setAttempt]=useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  const image = index === null ? null : images[index];
  function close() { setIndex(null); dialog.current?.close(); trigger.current?.focus(); }
  useEffect(() => {
    setFailed(null);setAttempt(0);
    if (image) { if (!dialog.current?.open) dialog.current?.showModal(); }
    else if (index !== null) close();
  }, [index, image?.mediaId]);
  if (!images.length) return null;
  return <section className="case-gallery" id="project-gallery" aria-labelledby={`${id}-heading`}>
    <div className="studio-section-heading"><div><p className="studio-eyebrow">THE DETAILS / IN FOCUS</p><h2 id={`${id}-heading`}>A closer look.</h2></div><p className="studio-soft">Open an image to explore it.</p></div>
    <div className="case-gallery-grid">{images.map((item, position) => <figure key={item.mediaId}><button type="button" aria-label={`Open image ${position + 1}: ${item.alt || "Project screenshot"}`} onClick={event => { trigger.current = event.currentTarget; setIndex(position); }}><ProjectArtwork src={imageUrl(item.mediaId, preview, privateArea)} alt={item.alt} /><span aria-hidden="true">0{position + 1} / Enlarge ↗</span></button><figcaption>{item.alt}</figcaption></figure>)}</div>
    <dialog className="case-lightbox" ref={dialog} aria-labelledby={`${id}-dialog-title`} onClose={()=>{setIndex(null);if(trigger.current?.isConnected)trigger.current.focus();}} onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => {
      if (index === null) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); setIndex(Math.max(0, index - 1)); }
      if (event.key === "ArrowRight") { event.preventDefault(); setIndex(Math.min(images.length - 1, index + 1)); }
    }}>
      <header><h2 id={`${id}-dialog-title`}>Project images</h2>{image && <button type="button" onClick={()=>{setAttempt(value=>value+1);setFailed(null);}}>Reload image</button>}<button type="button" onClick={close} aria-label="Close image gallery">Close ×</button></header>
      {image && <figure>{failed===image.mediaId ? <p role="status">This image couldn’t load. Reload it, try another image or close the gallery.</p> : <img key={`${image.mediaId}:${attempt}`} src={imageUrl(image.mediaId, preview, privateArea)} alt={image.alt} onError={() => setFailed(image.mediaId)} />}<figcaption>{image.alt}</figcaption></figure>}
      <footer><button type="button" disabled={index === 0} onClick={() => setIndex(current => Math.max(0, (current ?? 0) - 1))} aria-label="Previous image">← Previous</button><p role="status">Image {(index ?? 0) + 1} of {images.length}</p><button type="button" disabled={index === images.length - 1} onClick={() => setIndex(current => Math.min(images.length - 1, (current ?? 0) + 1))} aria-label="Next image">Next →</button></footer>
    </dialog>
  </section>;
}
