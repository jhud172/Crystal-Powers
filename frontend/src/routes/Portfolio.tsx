import { NavLink } from "react-router-dom";
import { PageHero } from "../components/PageHero";
import { portfolioProjects } from "../features/portfolio/portfolio";

export function Portfolio() {
  return (
    <div className="page-stack">
      <PageHero
        eyebrow="Portfolio"
        signal="Selected digital surfaces"
        title="Work framed around clearer presentation, stronger hierarchy, and more confident first impressions."
        body="These project views show the type of direction Crystal Powers brings to websites, launch pages, portfolios, storefronts, and structured service surfaces."
        actions={<><NavLink to="/services" className="primary-button">Plan a build</NavLink><NavLink to="/contact" className="secondary-button">Send a brief</NavLink></>}
        visual={<div className="floating-cluster"><article className="floating-panel floating-panel-display"><img src="/images/project1.png" alt="Featured portfolio preview" className="floating-panel-image" /></article></div>}
      />
      <section className="project-band">
        {portfolioProjects.map((project) => (
          <NavLink key={project.slug} to={`/portfolio/${project.slug}`} className="project-band-card">
            <img src={project.image} alt={`${project.title} preview`} className="project-band-image" />
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
