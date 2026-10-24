import { CopyButton } from "../../components/CopyButton";
import { NavLink, useSearchParams } from "react-router-dom";
import { MouseEvent, useEffect } from "react";
import { ProjectDevicePreview } from "./ProjectDevicePreview";
import { ProjectArtwork } from "./ProjectArtwork";
import { ProjectGallery } from "./ProjectGallery";
import { categoryLabel, imageUrl, PublicProject } from "./projectApi";
import { projectAddress, projectFilter, workAddress } from "./portfolioNavigation";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import { useEnquiry } from "../contact/EnquiryContext";

export function ProjectPresentation({ project, projects = [], preview = false, privateArea = "admin", onExitPreview, metadataDocument = document }: { project: PublicProject; projects?: PublicProject[]; preview?: boolean; privateArea?: "admin" | "team"; onExitPreview?: () => void; metadataDocument?: Document }) {
  const { content } = project;
  const [search] = useSearchParams();
  const filter = projectFilter(search.get("category"));
  const { setForm } = useEnquiry();
  const cover = content.coverMediaId ? imageUrl(content.coverMediaId, preview, privateArea) : undefined;
  const intent = content.category === "APP" ? "app" : content.category === "SYSTEM" ? "system" : "website";
  const startConversation = () => setForm(current => ({ ...current, projectInterest: content.title }));
  const story = [{ id: "project-idea", title: "The idea", copy: content.overview }, { id: "project-approach", title: "The approach", copy: content.approach }, { id: "project-outcome", title: "The outcome", copy: content.outcome }].filter(chapter => chapter.copy.trim());
  const collection = projects.filter(item => filter === "ALL" || item.content.category === filter);
  const position = collection.findIndex(item => item.id === project.id);
  const previous = position > 0 ? collection[position - 1] : null;
  const next = position >= 0 && position < collection.length - 1 ? collection[position + 1] : null;
  useEffect(() => { metadataDocument.querySelector('meta[name="robots"]')?.setAttribute("content", preview ? "noindex, nofollow" : "index, follow"); }, [project.id, preview, metadataDocument]);
  usePageMetadata(preview ? "Private project preview | Crystal Powers" : `${content.title} | Crystal Powers`, preview ? "Private project preview." : content.summary, preview ? `/${privateArea}` : `/portfolio/${project.slug}`, preview ? undefined : cover, metadataDocument);
  function visitChapter(event: MouseEvent<HTMLAnchorElement>, chapter: string) {
    if (!preview) return;
    event.preventDefault(); event.currentTarget.ownerDocument.getElementById(chapter)?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  return <article className="studio-project case-study liquid-case">
    <header className="studio-section case-heading refined-heading">
      {preview ? <button type="button" className="admin-text-button" onClick={onExitPreview}>← Back to editor</button> : <NavLink className="studio-text-link" to={workAddress(filter)}>← All projects</NavLink>}
      <p className="studio-eyebrow">{categoryLabel[content.category]} / CRYSTAL POWERS</p>
      <h1>{content.title || "Untitled project"}</h1><div className="case-introduction"><p className="studio-page-lead">{content.summary || (preview ? "Add a project summary in the editor." : "")}</p><dl><div><dt>Project</dt><dd>{categoryLabel[content.category]}</dd></div><div><dt>By</dt><dd>Crystal Powers</dd></div></dl></div>
      <div className="studio-actions">{content.liveUrl && <a className="studio-button" href={content.liveUrl} target="_blank" rel="noopener noreferrer">Visit live website <span aria-hidden="true">↗</span></a>}{!preview && <NavLink className="studio-text-link" to={`/contact?intent=${intent}`} onClick={startConversation}>Discuss a project like this ↗</NavLink>}{!preview && <CopyButton label="Copy project link" value={`${window.location.origin}/portfolio/${encodeURIComponent(project.slug)}`} />}</div>
    </header>
    {cover && <figure className="studio-project-cover"><ProjectArtwork src={cover} alt={content.coverAlt} loading="eager" fetchPriority="high" /><figcaption>{content.coverAlt}</figcaption></figure>}
    <nav className="case-chapter-nav studio-section" aria-label="Explore this case study">{story.map((chapter, index) => <a href={`#${chapter.id}`} key={chapter.id} onClick={event => visitChapter(event, chapter.id)}><span>0{index + 1}</span>{chapter.title}</a>)}<a href="#project-device" onClick={event => visitChapter(event, "project-device")}><span>↗</span>Explore the screens</a>{content.gallery.length > 0 && <a href="#project-gallery" onClick={event => visitChapter(event, "project-gallery")}><span>＋</span>Gallery</a>}</nav>
    {story.length > 0 && <section className="studio-section case-story" aria-label="Project story"><aside><p className="studio-eyebrow">THE PROJECT / IN CONTEXT</p><p>{categoryLabel[content.category]}</p>{content.technologies.length > 0 && <ul aria-label="Technologies">{content.technologies.map((technology, index) => <li key={`${technology}-${index}`}>{technology}</li>)}</ul>}</aside><div>{story.map((chapter, index) => <section key={chapter.id} id={chapter.id}><span className="studio-eyebrow">0{index + 1} / THE STORY</span><h2>{chapter.title}</h2><p>{chapter.copy}</p></section>)}</div></section>}
    <section className="studio-section studio-project-explore" id="project-device"><div className="studio-section-heading"><div><p className="studio-eyebrow">A DIFFERENT PERSPECTIVE</p><h2>Made to be explored.</h2></div></div><ProjectDevicePreview project={project} preview={preview} privateArea={privateArea} /></section>
    <ProjectGallery images={content.gallery} preview={preview} privateArea={privateArea} />
    {!preview && <><section className="studio-section case-continuity" aria-label="More work">{previous && <NavLink to={projectAddress(previous.slug, filter)}><span className="studio-eyebrow">← PREVIOUS PROJECT</span><h2>{previous.content.title}</h2></NavLink>}{next && <NavLink to={projectAddress(next.slug, filter)}><span className="studio-eyebrow">NEXT PROJECT →</span><h2>{next.content.title}</h2></NavLink>}{!next && !previous && <NavLink to={workAddress(filter)} className="studio-text-link">Explore all work ↗</NavLink>}</section><section className="studio-final studio-section"><p className="studio-eyebrow">A STARTING POINT FOR YOUR IDEA</p><h2>Something like this.<br /><span>Unmistakably yours.</span></h2><NavLink to={`/contact?intent=${intent}`} onClick={startConversation} className="studio-button">Start with this project ↗</NavLink></section></>}
  </article>;
}
