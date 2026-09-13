import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ModelKind, ModelStage } from "../features/experience/ModelStage";
import { FeaturedProjects } from "../features/portfolio/FeaturedProjects";

export function Home() {
  const [device, setDevice] = useState<ModelKind>("laptop");
  return <div className="studio-home">
    <section className="studio-hero" aria-labelledby="hero-title">
      <ModelStage model="crystal" title="Explore the crystal" className="studio-hero-art" />
      <div className="studio-hero-copy">
        <p className="studio-eyebrow"><span className="studio-dot" /> INDEPENDENT DIGITAL STUDIO</p>
        <h1 id="hero-title">Crystal<br />Powers<span className="studio-accent">.</span></h1>
        <p className="studio-hero-promise">Distinctive by design.<br /><span>Extraordinary in the details.</span></p>
        <p className="studio-hero-description">Websites, apps and digital experiences.<br />Thoughtfully designed. Personally developed.</p>
        <div className="studio-actions"><NavLink className="studio-button" to="/portfolio">Explore the work <span aria-hidden="true">↗</span></NavLink><NavLink className="studio-text-link" to="/contact">Start a project <span aria-hidden="true">↗</span></NavLink></div>
      </div>
      <div className="studio-hero-caption"><span>DESIGN WITH DEPTH</span><a href="#studio-introduction">Scroll to discover <span aria-hidden="true">↓</span></a></div>
    </section>
    <section id="studio-introduction" className="studio-introduction studio-section">
      <p className="studio-eyebrow">01 / THE STUDIO</p>
      <div data-reveal="up"><h2>Your ambition.<br /><span className="studio-soft">A different perspective.</span></h2><div className="studio-introduction-bottom"><p>Crystal Powers brings design and development together. From a first website to a bespoke application, I turn your ideas into considered digital experiences that feel unmistakably yours.</p><NavLink to="/about" className="studio-text-link">Meet James <span aria-hidden="true">↗</span></NavLink></div></div>
    </section>
    <section className="studio-work studio-section" aria-labelledby="work-title">
      <div className="studio-section-heading"><div><p className="studio-eyebrow">02 / BUILT AROUND YOU</p><h2 id="work-title">Every screen.<br /><span className="studio-soft">One complete experience.</span></h2></div><NavLink to="/portfolio" className="studio-text-link">View projects <span aria-hidden="true">↗</span></NavLink></div>
      <div className="studio-device-tabs" role="group" aria-label="Choose a device">{(["laptop", "monitor", "phone"] as const).map((kind) => <button type="button" key={kind} aria-pressed={kind === device} onClick={() => setDevice(kind)}>{kind === "monitor" ? "Desktop" : kind === "phone" ? "Mobile" : "Laptop"}</button>)}</div>
      <ModelStage model={device} title="Take a closer look" className="studio-device-stage" />
      <div className="studio-work-caption"><p>Designed as a whole.<br /><span className="studio-soft">Considered in every detail.</span></p><p>Responsive websites. Purposeful apps.<br />A consistent experience wherever you are.</p></div>
    </section>
    <FeaturedProjects />
    <section className="studio-services studio-section" aria-labelledby="services-title"><p className="studio-eyebrow">03 / WHAT I DO</p><div><h2 id="services-title">Good ideas deserve<br /><span className="studio-soft">an exceptional execution.</span></h2><div className="studio-service-list">{[
      ["01", "Websites", "A distinctive home for your business. Fast, accessible and designed to turn interest into conversation."],
      ["02", "Apps & digital products", "Thoughtful interfaces and dependable development for the things your customers need to do."],
      ["03", "Bespoke systems", "Client portals, integrations and automation that make the day-to-day work feel simpler."]
    ].map(([index, title, description]) => <NavLink to="/services" className="studio-service-row" key={title}><span className="studio-index">{index}</span><div><h3>{title}</h3><p>{description}</p></div><span className="studio-row-arrow" aria-hidden="true">↗</span></NavLink>)}</div></div></section>
    <section className="studio-process studio-section"><p className="studio-eyebrow">04 / FROM FIRST CONVERSATION TO LAUNCH</p><h2>One point of contact.<br /><span className="studio-soft">Care at every stage.</span></h2><div className="studio-process-steps">{[["Discover", "We get clear on your business, your audience and what a successful project needs to do."], ["Create", "Design and development take shape together, with your feedback throughout."], ["Refine", "The details are tested, polished and prepared for the people who will use them."], ["Launch", "A considered handover, a confident launch and a clear route to ongoing support."]].map(([title, copy], index) => <article key={title} data-reveal="up"><span className="studio-index">0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="studio-final studio-section"><p className="studio-eyebrow">YOUR NEXT CHAPTER</p><h2>Let’s make<br /><span>something matter.</span></h2><div><p>Have an idea in mind?<br />I’d like to hear it.</p><NavLink to="/contact" className="studio-button">Tell me about your project <span aria-hidden="true">↗</span></NavLink></div></section>
  </div>;
}
