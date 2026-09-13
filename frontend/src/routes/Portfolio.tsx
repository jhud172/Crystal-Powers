import { useState } from "react";
import { NavLink } from "react-router-dom";
import { categoryLabel, imageUrl, ProjectContent, usePublishedProjects } from "../features/portfolio/projectApi";

export function Portfolio() {
  const { projects, loading, error, refresh } = usePublishedProjects();
  const [filter, setFilter] = useState<ProjectContent["category"] | "ALL">("ALL");
  const shown = projects.filter(project => filter === "ALL" || project.content.category === filter);
  return <div className="studio-portfolio">
    <header className="studio-page-heading studio-section"><p className="studio-eyebrow">THE WORK / CRYSTAL POWERS</p><h1>Ideas, made real.</h1><p className="studio-page-lead">A closer look at the websites, apps and systems I’ve designed and developed. Each one with a purpose. Each one its own.</p></header>
    <section className="studio-section studio-project-list" aria-label="Projects">
      <div className="studio-device-tabs" role="group" aria-label="Filter projects">{(["ALL", "WEBSITE", "APP", "SYSTEM"] as const).map(category => <button type="button" key={category} onClick={() => setFilter(category)} aria-pressed={category === filter}>{category === "ALL" ? "All work" : categoryLabel[category]}</button>)}</div>
      {loading ? <p className="studio-empty" role="status">Loading the work…</p> : error ? <div className="studio-empty" role="status"><h2>The showcase is taking a moment.</h2><p>Please try again, or get in touch to discuss your project.</p><button className="studio-button" onClick={refresh}>Try again</button></div> : shown.length === 0 ? <div className="studio-empty"><h2>{projects.length ? "More to come." : "The next chapter is taking shape."}</h2><p>{projects.length ? "There are no published projects in this category yet." : "New projects will appear here as they’re ready to share. In the meantime, let’s talk about what you have in mind."}</p><NavLink className="studio-text-link" to="/contact">Start a conversation ↗</NavLink></div> : shown.map((project, index) => <article className="studio-project-entry" key={project.id}>
        <NavLink className="studio-project-image-link" to={`/portfolio/${project.slug}`} aria-label={`Explore ${project.content.title}`}>{project.content.coverMediaId && <img src={imageUrl(project.content.coverMediaId)} alt={project.content.coverAlt} loading={index === 0 ? "eager" : "lazy"} />}<span>Explore project <span aria-hidden="true">↗</span></span></NavLink>
        <div className="studio-project-entry-copy"><p className="studio-eyebrow">{String(index + 1).padStart(2, "0")} / {categoryLabel[project.content.category]}</p><div><h2><NavLink to={`/portfolio/${project.slug}`}>{project.content.title}</NavLink></h2><p>{project.content.summary}</p></div><NavLink className="studio-text-link" to={`/portfolio/${project.slug}`}>View project ↗</NavLink></div>
      </article>)}
    </section>
  </div>;
}
