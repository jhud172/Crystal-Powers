import { ChapterLinks } from "../components/ChapterLinks";
import { NavLink } from "react-router-dom";
import { usePublishedProjects } from "../features/portfolio/projectApi";
import { FeaturedProjects } from "../features/portfolio/FeaturedProjects";
import { CrystalOpening } from "../features/experience/CrystalOpening";
import { LiquidLightHero } from "../features/experience/LiquidLightHero";
import { CollaborationChapters } from "../features/studio/CollaborationChapters";

export function Home() {
  const showcase = usePublishedProjects();
  const selected = showcase.projects.find(project => project.featured);
  return <div className="studio-home">
    <LiquidLightHero project={selected} />
    <ChapterLinks label="Explore the studio" chapters={[{id:"prism-title",label:"Prism Gate"},{id:"selected-work",label:"The work"},{id:"studio-introduction",label:"The studio"},{id:"services-title",label:"Services"}]} />
    <section className="prism-showcase" aria-labelledby="prism-title">
      <h2 id="prism-title" className="sr-only">Prism Gate — explore a different perspective</h2>
      <CrystalOpening />
    </section>
    <FeaturedProjects {...showcase} />
    <section id="studio-introduction" className="studio-introduction studio-section">
      <p className="studio-eyebrow">02 / WORK DIRECTLY WITH JAMES</p>
      <div data-reveal="up"><h2>It should feel like you.<br /><span className="studio-soft">And work for your people.</span></h2><div className="studio-introduction-bottom"><p>One person to discuss the idea, design the details and build the experience. We’ll work through the decisions together, with clear stages and room for your feedback.</p><NavLink to="/about" className="studio-text-link">Meet James <span aria-hidden="true">↗</span></NavLink></div></div>
    </section>
    <section className="studio-services studio-section" aria-labelledby="services-title"><p className="studio-eyebrow">03 / WHAT I DO</p><div><h2 id="services-title">Good ideas deserve<br /><span className="studio-soft">an exceptional execution.</span></h2><div className="studio-service-list">{[
      ["01", "Websites", "A distinctive home for your business, with clear information and a direct route to an enquiry."],
      ["02", "Apps & digital products", "Thoughtful interfaces and dependable development for the things your customers need to do."],
      ["03", "Bespoke systems", "Client portals, integrations and automation that make the day-to-day work feel simpler."]
    ].map(([index, title, description]) => <NavLink to={`/services?intent=${index === "01" ? "website" : index === "02" ? "app" : "system"}`} className="studio-service-row" key={title}><span className="studio-index">{index}</span><div><h3>{title}</h3><p>{description}</p></div><span className="studio-row-arrow" aria-hidden="true">↗</span></NavLink>)}</div></div></section>
    <section className="studio-process studio-section"><p className="studio-eyebrow">04 / FROM FIRST CONVERSATION TO LAUNCH</p><h2>One point of contact.<br /><span className="studio-soft">Care at every stage.</span></h2><CollaborationChapters /></section>
    <section className="studio-final studio-section"><p className="studio-eyebrow">YOUR NEXT CHAPTER</p><h2>Let’s make<br /><span>something matter.</span></h2><div><p>Have an idea in mind?<br />I’d like to hear it.</p><NavLink to="/contact" className="studio-button">Tell me about your project <span aria-hidden="true">↗</span></NavLink></div></section>
  </div>;
}
