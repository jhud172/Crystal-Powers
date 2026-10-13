import { NavLink, useParams } from "react-router-dom";
import { ProjectPresentation } from "../features/portfolio/ProjectPresentation";
import { usePublishedProjects } from "../features/portfolio/projectApi";
import { NotFound } from "./NotFound";

export function PortfolioProject() {
  const { slug } = useParams();
  const { projects, loading, error, refresh } = usePublishedProjects(slug);
  const { projects: collection } = usePublishedProjects();
  if (loading) return <div className="studio-section studio-empty" role="status">Loading the project…</div>;
  if (error?.status === 404 || (!error && !projects[0])) return <NotFound />;
  if (error) return <section className="studio-section project-unavailable" role="status"><p className="studio-eyebrow">CONNECTION INTERRUPTED</p><h1>The project couldn’t load.</h1><p>This may be temporary. Try again, explore the other work, or talk to James about your idea.</p><div className="studio-actions"><button className="studio-button" onClick={refresh}>Try again</button><NavLink to="/portfolio" className="studio-text-link">Explore the work ↗</NavLink><NavLink to="/contact?intent=general" className="studio-text-link">Contact James ↗</NavLink></div></section>;
  return <ProjectPresentation project={projects[0]} projects={collection} />;
}
