import { NavLink } from "react-router-dom";
import { ApiError, categoryLabel, imageUrl, PublicProject } from "./projectApi";
import { ProjectDevicePreview } from "./ProjectDevicePreview";
import { projectAddress } from "./portfolioNavigation";

type Props = { projects: PublicProject[]; loading: boolean; error: ApiError | null; refresh: () => void };

/** Home owns one published collection for both the opening reveal and the showcase. */
export function FeaturedProjects({ projects, loading, error, refresh }: Props) {
  const featured = projects.filter(project => project.featured).slice(0, 3);
  const primary = featured[0];
  if (!primary || loading || error) return <section id="selected-work" className="studio-section studio-featured studio-featured-fallback home-proof" aria-labelledby="selected-work-title">
    <p className="studio-eyebrow">01 / SELECTED WORK</p>
    <h2 id="selected-work-title" tabIndex={-1}>{loading ? "Preparing the showcase." : error ? "The showcase is taking a moment." : "The next chapter is taking shape."}</h2>
    <p role={loading || error ? "status" : undefined}>{loading ? "Loading published projects…" : error ? "The work could not load just now. Please try again, or tell James what you have in mind." : projects.length ? "Explore the published work, or talk to James about your idea." : "Projects appear here when they are ready to share. In the meantime, meet James and explore how we would work together."}</p>
    <div className="studio-actions">{error && <button type="button" className="studio-button" onClick={refresh}>Try again</button>}<NavLink className="studio-text-link" to={error ? "/contact?intent=general" : "/portfolio"}>{error ? "Start a conversation" : "Explore the portfolio"} <span aria-hidden="true">↗</span></NavLink></div>
  </section>;
  return <section id="selected-work" className="studio-section studio-featured home-proof" aria-labelledby="selected-work-title">
    <div className="studio-section-heading"><div><p className="studio-eyebrow">01 / SELECTED WORK</p><h2 id="selected-work-title" tabIndex={-1}>An idea.<br /><span className="studio-soft">Made real.</span></h2></div><NavLink to="/portfolio" className="studio-text-link">All projects ↗</NavLink></div>
    <article className="home-project"><div className="home-project-story"><p className="studio-eyebrow">{categoryLabel[primary.content.category]} / DESIGN & DEVELOPMENT</p><h3>{primary.content.title}</h3><p>{primary.content.summary}</p><NavLink to={projectAddress(primary.slug)} className="studio-button">Explore the project ↗</NavLink><p className="home-project-guidance">Choose a screen to see the actual project. The 3D view is optional.</p></div><ProjectDevicePreview key={primary.id} project={primary} /></article>
    {featured.length > 1 && <div className="studio-featured-list">{featured.slice(1).map(project => <NavLink to={projectAddress(project.slug)} key={project.id}>{project.content.coverMediaId && <img src={imageUrl(project.content.coverMediaId)} alt={project.content.coverAlt} loading="lazy" />}<h3>{project.content.title} <span aria-hidden="true">↗</span></h3><p>{project.content.summary}</p></NavLink>)}</div>}
  </section>;
}
