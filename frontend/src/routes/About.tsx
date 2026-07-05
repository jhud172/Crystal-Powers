import { NavLink } from "react-router-dom";
import { useSiteTheme } from "../app/Layout";
import { PageHero } from "../components/PageHero";

export function About() {
  const { assets } = useSiteTheme();

  return (
    <div className="page-stack">
      <PageHero
        eyebrow="About the studio"
        signal="Structure-first execution"
        title="Built around clean architecture, stronger digital presentation, and a premium finish that still feels controlled."
        body="Crystal Powers operates like a focused implementation partner. The point is not to add noise. The point is to make the product, service, or launch surface feel sharper and more intentional from the first interaction."
        actions={<><NavLink to="/services" className="primary-button">See services</NavLink><NavLink to="/portfolio" className="secondary-button">Open portfolio</NavLink></>}
        visual={<div className="about-orbit-shell"><div className="orbital-ring orbital-ring-large" /><div className="orbital-ring orbital-ring-small" /><article className="floating-panel floating-panel-display"><img src={assets.homeBackdrop} alt="Abstract studio backdrop" className="floating-panel-image themed-media" /></article></div>}
      />
      <section className="content-band three-up-grid">
        {[
          ["Philosophy", "Fewer moving parts, higher trust", "Templates, styles, scripts, routes, and controller logic each keep one job so the system stays maintainable under real change."],
          ["Delivery", "Production-first implementation", "Changes are wired into the actual application path instead of being left as detached mockups or half-integrated experiments."],
          ["Experience", "Premium by control, not excess", "Typography, atmosphere, motion, and spacing do the work. The page should feel expensive before it feels loud."]
        ].map(([kicker, title, copy]) => (
          <article key={title} className="story-panel" data-reveal="up">
            <p className="story-kicker">{kicker}</p>
            <h2 className="story-title-small">{title}</h2>
            <p className="story-copy">{copy}</p>
          </article>
        ))}
      </section>
      <section className="split-story-grid">
        <article className="story-panel story-panel-large" data-reveal="up">
          <span className="eyebrow">What that means in practice</span>
          <div className="story-line-list">
            {["Shared base layout instead of duplicated page shells.", "Dedicated JavaScript modules loaded only where they are needed.", "Dedicated CSS surfaces extended centrally so the whole site moves together.", "Routing and page structure kept aligned so older links and shared flows remain dependable."].map((copy, index) => (
              <div className="story-line-item" key={copy}>
                <span className="story-line-index">{String(index + 1).padStart(2, "0")}</span>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="story-panel story-panel-highlight" data-reveal="up">
          <span className="eyebrow">Current studio profile</span>
          <h2 className="story-title">Crystal Powers is positioned around premium websites, launch systems, and digital surfaces that need to feel more established.</h2>
          <p className="story-copy">
            The studio is not trying to be everything. The current focus is sharper public presentation, cleaner conversion flow, and implementation support that carries the design properly into the live app.
          </p>
        </article>
      </section>
    </div>
  );
}
