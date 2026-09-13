import { NavLink } from "react-router-dom";
import { imageUrl, usePublishedProjects } from "./projectApi";

export function FeaturedProjects() {
  const { projects } = usePublishedProjects();
  const featured = projects.filter(project => project.featured).slice(0, 3);
  if (!featured.length) return null;
  return <section className="studio-section studio-featured"><div className="studio-section-heading"><div><p className="studio-eyebrow">SELECTED WORK</p><h2>From possibility<br /><span className="studio-soft">to something tangible.</span></h2></div><NavLink to="/portfolio" className="studio-text-link">All projects ↗</NavLink></div><div className="studio-featured-list">{featured.map(project => <NavLink to={`/portfolio/${project.slug}`} key={project.id}>{project.content.coverMediaId && <img src={imageUrl(project.content.coverMediaId)} alt={project.content.coverAlt} loading="lazy" />}<h3>{project.content.title} <span aria-hidden="true">↗</span></h3><p>{project.content.summary}</p></NavLink>)}</div></section>;
}
