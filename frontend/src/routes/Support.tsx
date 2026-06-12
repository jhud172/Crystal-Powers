import { NavLink } from "react-router-dom";
import { PageHero } from "../components/PageHero";

export function Support() {
  return (
    <div className="page-stack">
      <PageHero
        eyebrow="Support"
        signal="Aftercare and launch help"
        title="Support that keeps the website stable, clear, and easier to improve after launch."
        body="Use support when the project needs small fixes, content updates, guidance, or a cleaner next step after the site has gone live."
        actions={<><NavLink to="/contact" className="primary-button">Request support</NavLink><NavLink to="/services" className="secondary-button">Review services</NavLink></>}
        visual={<div className="floating-cluster"><article className="floating-panel floating-panel-glass"><p className="floating-panel-kicker">Support routes</p><ul className="floating-list"><li>Site edits and checks</li><li>Launch guidance</li><li>Maintenance planning</li></ul></article></div>}
      />
      <section className="content-band three-up-grid">
        {[
          ["Launch checks", "Final checks before a page or campaign goes live."],
          ["Content edits", "Small text, image, and section changes after handover."],
          ["Maintenance", "A clearer support route for websites that need ongoing attention."]
        ].map(([title, copy]) => (
          <article key={title} className="story-panel" data-reveal="up">
            <p className="story-kicker">Support</p>
            <h2 className="story-title-small">{title}</h2>
            <p className="story-copy">{copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
