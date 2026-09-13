import { NavLink } from "react-router-dom";
import { useEffect } from "react";
import { ModelStage } from "../experience/ModelStage";
import { categoryLabel, imageUrl, PublicProject } from "./projectApi";
import { usePageMetadata } from "../../hooks/usePageMetadata";

export function ProjectPresentation({ project, preview = false, onExitPreview }: { project: PublicProject; preview?: boolean; onExitPreview?: () => void }) {
  const { content } = project;
  useEffect(() => { document.querySelector('meta[name="robots"]')?.setAttribute("content", preview ? "noindex, nofollow" : "index, follow"); }, [project.id, preview]);
  usePageMetadata(preview ? "Private project preview | Crystal Powers" : `${content.title} | Crystal Powers`, preview ? "Private project preview." : content.summary, preview ? "/admin" : `/portfolio/${project.slug}`);
  const cover = content.coverMediaId ? imageUrl(content.coverMediaId, preview) : undefined;
  return <article className="studio-project">
    <header className="studio-page-heading studio-section">
      {preview ? <button type="button" className="admin-text-button" onClick={onExitPreview}>← Back to editor</button> : <NavLink className="studio-text-link" to="/portfolio">← All projects</NavLink>}
      <p className="studio-eyebrow">{categoryLabel[content.category]} / CRYSTAL POWERS</p>
      <h1>{content.title || "Untitled project"}</h1><p className="studio-page-lead">{content.summary || (preview ? "Add a project summary in the editor." : "")}</p>
      <div className="studio-actions">{content.liveUrl && <a className="studio-button" href={content.liveUrl} target="_blank" rel="noopener noreferrer">Visit live website <span aria-hidden="true">↗</span></a>}
        {!preview && <NavLink className="studio-text-link" to="/contact">Start something together <span aria-hidden="true">↗</span></NavLink>}</div>
    </header>
    {cover && <figure className="studio-project-cover"><img src={cover} alt={content.coverAlt} fetchPriority="high" /><figcaption>{content.coverAlt}</figcaption></figure>}
    <section className="studio-section studio-project-explore"><div className="studio-section-heading"><div><p className="studio-eyebrow">A DIFFERENT PERSPECTIVE</p><h2>Made to be explored.</h2></div><p className="studio-soft">Drag to turn. Discover the details.</p></div><ModelStage model={content.displayDevice} image={cover} title="Explore this project in 3D" className="studio-device-stage" /></section>
    <section className="studio-section studio-project-story">
      <aside><p className="studio-eyebrow">THE PROJECT</p><p>{categoryLabel[content.category]}</p>{content.technologies.length > 0 && <ul aria-label="Technologies">{content.technologies.map((technology, index) => <li key={`${technology}-${index}`}>{technology}</li>)}</ul>}</aside>
      <div>{[["The idea", content.overview], ["The approach", content.approach], ["The outcome", content.outcome]].filter(([, copy]) => copy).map(([title, copy]) => <section key={title}><h2>{title}</h2><p>{copy}</p></section>)}</div>
    </section>
    {content.gallery.length > 0 && <section className="studio-project-gallery" aria-label="Project gallery">{content.gallery.map(item => <figure key={item.mediaId}><img src={imageUrl(item.mediaId, preview)} alt={item.alt} loading="lazy" /><figcaption>{item.alt}</figcaption></figure>)}</section>}
    {!preview && <section className="studio-final studio-section"><p className="studio-eyebrow">WHAT COULD WE CREATE?</p><h2>Your next idea.<br /><span>Let’s bring it to life.</span></h2><NavLink to="/contact" className="studio-button">Start a conversation <span aria-hidden="true">↗</span></NavLink></section>}
  </article>;
}
