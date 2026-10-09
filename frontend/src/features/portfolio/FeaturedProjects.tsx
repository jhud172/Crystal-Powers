import { NavLink } from "react-router-dom";
import { imageUrl, usePublishedProjects } from "./projectApi";

export function FeaturedProjects() {
  const { projects, loading, error, refresh } = usePublishedProjects();
  const featured = projects.filter(project => project.featured).slice(0, 3);
  if (!featured.length) return <section className="studio-section studio-featured studio-featured-fallback" aria-labelledby="featured-fallback-title">
    <p className="studio-eyebrow">SELECTED WORK</p>
    <h2 id="featured-fallback-title">{loading ? "A closer look at the work." : error ? "The showcase is taking a moment." : "The next chapter is taking shape."}</h2>
    <p role={loading || error ? "status" : undefined}>{loading ? "Loading published projects…" : error ? "The work could not load just now. Please try again, or talk to James about what you have in mind." : "Selected projects will appear here when they are ready to share. In the meantime, explore the studio’s approach or discuss your idea with James."}</p>
    <div className="studio-actions">{error && <button type="button" className="studio-button" onClick={refresh}>Try again</button>}<NavLink className="studio-text-link" to={error ? "/contact" : "/portfolio"}>{error ? "Start a conversation" : "Explore the portfolio"} <span aria-hidden="true">↗</span></NavLink></div>
  </section>;
  return <section className="studio-section studio-featured"><div className="studio-section-heading"><div><p className="studio-eyebrow">SELECTED WORK</p><h2>From possibility<br /><span className="studio-soft">to something tangible.</span></h2></div><NavLink to="/portfolio" className="studio-text-link">All projects ↗</NavLink></div><div className="studio-featured-list">{featured.map(project => <NavLink to={`/portfolio/${project.slug}`} key={project.id}>{project.content.coverMediaId && <img src={imageUrl(project.content.coverMediaId)} alt={project.content.coverAlt} loading="lazy" />}<h3>{project.content.title} <span aria-hidden="true">↗</span></h3><p>{project.content.summary}</p></NavLink>)}</div></section>;
}
