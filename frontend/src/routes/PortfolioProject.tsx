import { NavLink, useParams } from "react-router-dom";
import { useSiteTheme } from "../app/Layout";
import { PageHero } from "../components/PageHero";
import { getPortfolioProjectImage, getProject } from "../features/portfolio/portfolio";
import { NotFound } from "./NotFound";

export function PortfolioProject() {
  const { slug } = useParams();
  const { theme } = useSiteTheme();
  const project = getProject(slug);

  if (!project) {
    return <NotFound />;
  }

  return (
    <div className="page-stack">
      <PageHero
        eyebrow={project.company}
        signal={project.meta}
        title={project.title}
        body={project.summary}
        actions={<><NavLink to="/portfolio" className="secondary-button">Back to portfolio</NavLink><NavLink to="/contact" className="primary-button">Start something similar</NavLink></>}
        visual={<div className="floating-cluster"><article className="floating-panel floating-panel-display"><img src={getPortfolioProjectImage(project, theme)} alt={`${project.title} preview`} className="floating-panel-image themed-media" /></article></div>}
      />
      <section className="split-story-grid">
        <article className="story-panel story-panel-large" data-reveal="up">
          <span className="eyebrow">About the project</span>
          <h2 className="story-title">{project.about}</h2>
          <p className="story-copy">{project.creation}</p>
        </article>
        <article className="story-panel story-panel-highlight" data-reveal="up">
          <span className="eyebrow">Why it works</span>
          <h2 className="story-title-small">{project.whyItWorks}</h2>
          <div className="showcase-chip-row">
            {project.features.map((feature) => (
              <span className="surface-chip" key={feature}>{feature}</span>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
