import { lazy, Suspense } from "react";
import { NavLink } from "react-router-dom";

const CrystalOpenerScene = lazy(() => import("../components/hero/CrystalOpenerScene").then((module) => ({ default: module.CrystalOpenerScene })));

function CrystalOpenerStaticFallback() {
  return (
    <div className="hero-scene-fallback crystal-opener-fallback" aria-hidden="true">
      <div className="hero-scene-fallback-core" />
      <div className="hero-scene-fallback-panel hero-scene-fallback-panel-a" />
      <div className="hero-scene-fallback-panel hero-scene-fallback-panel-b" />
      <div className="hero-scene-fallback-orbit" />
    </div>
  );
}

export function Home() {
  return (
    <div className="page-stack page-stack-home">
      <section className="home-webgl-hero" aria-labelledby="home-hero-title">
        <div className="home-webgl-backdrop" aria-hidden="true">
          <img src="/images/BackgroundSpaceImage.png" alt="" className="home-webgl-space" />
          <span className="home-webgl-aurora home-webgl-aurora-a" />
          <span className="home-webgl-aurora home-webgl-aurora-b" />
          <span className="home-webgl-grid" />
          <span className="home-webgl-noise" />
        </div>

        <div className="home-webgl-shell">
          <div className="home-webgl-copy" data-reveal="up">
            <p className="home-webgl-brand">Crystal Powers</p>
            <h1 id="home-hero-title" className="home-webgl-title">
              Premium websites and digital systems, built for launch.
            </h1>
            <p className="home-webgl-body">
              Crystal Powers designs polished websites, client portals, automation flows, and digital experiences that feel refined from the first click.
            </p>
            <div className="home-webgl-actions">
              <NavLink to="/contact" className="primary-button home-webgl-primary">Start a build</NavLink>
              <NavLink to="/portfolio" className="secondary-button home-webgl-secondary">View portfolio</NavLink>
            </div>

            <div className="home-webgl-status-row" aria-label="Studio delivery focus">
              <span>Strategy</span>
              <span>Interface design</span>
              <span>Digital systems</span>
              <span>Launch support</span>
            </div>
          </div>

          <div className="home-webgl-visual" data-reveal="left">
            <Suspense fallback={<CrystalOpenerStaticFallback />}>
              <CrystalOpenerScene />
            </Suspense>
          </div>

          <div className="home-webgl-proof-grid" data-reveal="up">
            {[
              ["Strategy", "Sharper positioning, stronger page journeys, and a clearer route from attention to enquiry."],
              ["Interface Design", "Premium visual systems with precise spacing, motion, and responsive behaviour."],
              ["Digital Systems", "Client portals, automation flows, quote journeys, and cleaner operational surfaces."],
              ["Launch Support", "Production-ready handover, optimisation, aftercare, and practical rollout guidance."]
            ].map(([title, copy]) => (
              <article key={title} className="home-webgl-proof-card">
                <h2>{title}</h2>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content-band content-band-grid">
        <article className="story-panel story-panel-large" data-reveal="up">
          <div className="story-panel-head">
            <span className="eyebrow">Studio approach</span>
            <NavLink to="/about" className="inline-link">Studio approach</NavLink>
          </div>
          <h2 className="story-title">We do not just make pages look better. We organise the whole experience around clarity, trust, and action.</h2>
          <p className="story-copy">
            Crystal Powers combines strong visual direction with practical build logic: cleaner navigation, convincing proof, better scan paths, and a contact route that does not feel like an afterthought.
          </p>
        </article>
        <article className="story-panel story-panel-metric" data-reveal="up">
          <p className="story-kicker">Launch logic</p>
          <div className="metric-ladder">
            {["Define the strongest offer and page journey.", "Design a premium interface around that journey.", "Build, optimise, and prepare the site for launch."].map((copy, index) => (
              <div className="metric-rung" key={copy}>
                <span className="metric-number">{String(index + 1).padStart(2, "0")}</span>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="showcase-grid">
        <article className="showcase-card" data-reveal="up">
          <div className="showcase-copy">
            <span className="eyebrow">System direction</span>
            <h2 className="showcase-title">Every page should feel like part of the same premium product.</h2>
            <p className="showcase-body">
              From homepage to contact form, the experience is shaped around consistent spacing, confident typography, responsive behaviour, and visual moments that support the message.
            </p>
          </div>
          <div className="showcase-chip-row">
            <span className="surface-chip">Shared motion language</span>
            <span className="surface-chip">Premium hover depth</span>
            <span className="surface-chip">Mobile-first polish</span>
          </div>
        </article>
        <article className="showcase-card showcase-card-media" data-reveal="up">
          <img src="/images/project1.png" alt="Editorial project preview" className="showcase-image" />
          <div className="showcase-overlay-copy">
            <span className="section-tag">Featured work</span>
            <h3>Work is framed like a launch asset, not a placeholder gallery.</h3>
          </div>
        </article>
      </section>

      <section className="project-band">
        {[
          ["/images/project1.png", "Website system", "Sharper landing page systems", "Clean hierarchy, stronger section rhythm, and richer atmosphere from the first viewport."],
          ["/images/project2.png", "Conversion surface", "Deliberate product storytelling", "Less clutter, better scan paths, and a clearer route toward the key action."],
          ["/images/project3.png", "Creator presence", "Portfolio pages with more weight", "Booking-ready layouts where the work still leads and the interface supports it."]
        ].map(([image, tag, title, body]) => (
          <article key={title} className="project-band-card" data-reveal="up">
            <img src={image} alt="" className="project-band-image" />
            <div className="project-band-copy">
              <p className="section-tag">{tag}</p>
              <h3 className="project-band-title">{title}</h3>
              <p className="project-band-body">{body}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="final-callout" data-reveal="up">
        <div className="final-callout-copy">
          <span className="eyebrow">Next move</span>
          <h2 className="final-callout-title">Ready to launch something that looks credible from the first second?</h2>
          <p className="final-callout-body">Choose a build route, send the brief, and turn the site into a sharper public face for the work behind it.</p>
        </div>
        <div className="final-callout-actions">
          <NavLink to="/services" className="secondary-button">See services</NavLink>
          <NavLink to="/contact" className="primary-button">Send the brief</NavLink>
        </div>
      </section>
    </div>
  );
}
