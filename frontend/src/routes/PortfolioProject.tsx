import { useParams } from "react-router-dom";
import { ProjectPresentation } from "../features/portfolio/ProjectPresentation";
import { usePublishedProjects } from "../features/portfolio/projectApi";
import { NotFound } from "./NotFound";

export function PortfolioProject() {
  const { slug } = useParams();
  const { projects, loading, error, refresh } = usePublishedProjects(slug);
  if (loading) return <div className="studio-section studio-empty" role="status">Loading the project…</div>;
  if (error?.status === 404 || (!error && !projects[0])) return <NotFound />;
  if (error) return <div className="studio-section studio-empty" role="status"><h1>The project couldn’t load.</h1><p>Please try again in a moment.</p><button className="studio-button" onClick={refresh}>Try again</button></div>;
  return <ProjectPresentation project={projects[0]} />;
}
