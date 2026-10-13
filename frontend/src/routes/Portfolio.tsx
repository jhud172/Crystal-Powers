import { NavLink, useSearchParams } from "react-router-dom";
import { ProjectArtwork } from "../features/portfolio/ProjectArtwork";
import { categoryLabel, imageUrl, usePublishedProjects } from "../features/portfolio/projectApi";
import { projectAddress, projectFilter, projectFilters } from "../features/portfolio/portfolioNavigation";

export function Portfolio() {
  const { projects, loading, error, refresh } = usePublishedProjects();
  const [search, setSearch] = useSearchParams();
  const filter = projectFilter(search.get("category"));
  const shown = projects.filter(project => filter === "ALL" || project.content.category === filter);
  return <div className="studio-portfolio work-index liquid-work">
    <header className="studio-section work-heading"><p className="studio-eyebrow">THE WORK / CRYSTAL POWERS</p><h1>A purpose.<br /><span className="studio-soft">A perspective.</span></h1><p className="studio-page-lead">Real projects, considered from the first idea to the details people use. Explore the brief, the decisions and what was delivered.</p></header>
    <section className="studio-section studio-project-list" aria-label="Projects">
      <div className="work-filter-bar"><div className="studio-device-tabs" role="group" aria-label="Filter projects">{projectFilters.map(category => <button type="button" key={category} onClick={() => setSearch(category === "ALL" ? {} : { category })} aria-pressed={category === filter}>{category === "ALL" ? "All work" : categoryLabel[category]}<span className="work-filter-count" aria-hidden="true" data-pending={loading || Boolean(error)}>{loading || error ? "—" : projects.filter(project => category === "ALL" || project.content.category === category).length}</span></button>)}</div><p role="status">{loading ? "Loading projects…" : error ? "Projects unavailable" : `${shown.length} ${shown.length === 1 ? "project" : "projects"}`}</p></div>
      {loading ? <div key="loading" className="work-loading" aria-label="Loading project previews" role="status"><div aria-hidden="true" /><p>Preparing the showcase…</p></div> : error ? <div key="error" className="studio-empty"><h2>The showcase is taking a moment.</h2><p>Please try again, or get in touch to discuss your project.</p><div className="studio-actions"><button className="studio-button" onClick={refresh}>Try again</button><NavLink className="studio-text-link" to="/contact?intent=general">Start a conversation ↗</NavLink></div></div> : shown.length === 0 ? <div key="empty" className="studio-empty"><h2>{projects.length ? "A different starting point?" : "The next chapter is taking shape."}</h2><p>{projects.length ? "There are no published projects in this category yet. Explore all work, or tell James what you have in mind." : "Projects appear here when they are ready to share. In the meantime, let’s talk about your idea."}</p><div className="studio-actions">{filter !== "ALL" && <button className="studio-button" onClick={() => setSearch({})}>Show all work</button>}<NavLink className="studio-text-link" to="/contact?intent=general">Start a conversation ↗</NavLink></div></div> : <div key="projects" className="work-grid">{shown.map((project, index) => <article className="studio-project-entry" key={project.id}>
        <NavLink className="studio-project-image-link" to={projectAddress(project.slug, filter)} aria-label={`Explore ${project.content.title}`}><ProjectArtwork src={project.content.coverMediaId ? imageUrl(project.content.coverMediaId) : undefined} alt={project.content.coverAlt} loading={index === 0 ? "eager" : "lazy"} /><span>Explore project <span aria-hidden="true">↗</span></span></NavLink>
        <div className="studio-project-entry-copy"><p className="studio-eyebrow">{String(index + 1).padStart(2, "0")} / {categoryLabel[project.content.category]}</p><div><h2><NavLink to={projectAddress(project.slug, filter)}>{project.content.title}</NavLink></h2><p>{project.content.summary}</p></div><NavLink className="studio-text-link" to={projectAddress(project.slug, filter)}>View project ↗</NavLink></div>
      </article>)}</div>}
    </section>
  </div>;
}
