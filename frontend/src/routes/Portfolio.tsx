import { NavLink } from "react-router-dom";
import { useSiteTheme } from "../app/Layout";
import { PageHero } from "../components/PageHero";
import { getPortfolioProjectImage, portfolioProjects } from "../features/portfolio/portfolio";

export function Portfolio() {
  const { assets, theme } = useSiteTheme();

  return (
    <div className="page-stack">
      <PageHero
        eyebrow="Portfolio"
        signal="Selected digital surfaces"
        title="Work framed around clearer presentation, stronger hierarchy, and more confident first impressions."
        body="These project views show the type of direction Crystal Powers brings to websites, launch pages, portfolios, storefronts, and structured service surfaces."
        actions={<><NavLink to="/services" className="primary-button">Plan a build</NavLink><NavLink to="/contact" className="secondary-button">Send a brief</NavLink></>}
        visual={<div className="floating-cluster"><article className="floating-panel floating-panel-display"><img src={assets.portfolioFeatured} alt="Featured portfolio preview" className="floating-panel-image themed-media" /></article></div>}
      />
      <section className="project-band">
        {portfolioProjects.map((project) => (
          <NavLink key={project.slug} to={`/portfolio/${project.slug}`} className="project-band-card" data-tilt data-tilt-max="4" data-tilt-scale="1.01">
            <img src={getPortfolioProjectImage(project, theme)} alt={`${project.title} preview`} className="project-band-image themed-media" />
            <div className="project-band-copy">
              <p className="section-tag">{project.meta}</p>
              <h2 className="project-band-title">{project.title}</h2>
              <p className="project-band-body">{project.summary}</p>
            </div>
          </NavLink>
        ))}
      </section>
    </div>
  );
}
