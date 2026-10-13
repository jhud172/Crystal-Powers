import { LiquidLightArtwork } from "../features/experience/LiquidLightArtwork";
import { NavLink } from "react-router-dom";
import { CollaborationChapters } from "../features/studio/CollaborationChapters";
import { WorkspaceLayers } from "../features/studio/WorkspaceLayers";

export function About() {
  return <div className="studio-about studio-interior founder-page liquid-founder">
    <header className="studio-section founder-heading">
      <div><p className="studio-eyebrow">THE STUDIO / JAMES</p><h1>One person.<br /><span className="studio-soft">A complete perspective.</span></h1><p className="studio-page-lead">I bring design and development together, so your idea has a consistent point of contact from the first conversation to handover.</p><NavLink to="/contact?intent=general" className="studio-button">Meet me with an idea ↗</NavLink></div>
      <aside className="founder-note"><span className="founder-initial" aria-hidden="true">J.</span><p className="studio-eyebrow">JAMES / FOUNDER</p><p>Crystal Powers is my independent digital studio. I design and develop websites, apps and bespoke systems for businesses and individuals.</p><p>You work directly with me. I’ll ask questions, explain the decisions and help shape a project that fits what you need.</p></aside>
    </header>
    <section className="studio-section founder-artefacts" aria-labelledby="artefacts-title">
      <div><p className="studio-eyebrow">A LOOK INSIDE THE WORK</p><h2 id="artefacts-title">Care you can<br /><span className="studio-soft">see in the details.</span></h2><p>A distinctive opening should invite you into the work. The light on this website opens to reveal a project preview, while the main information stays within reach.</p><p>You can go straight to the portfolio, or take a closer look at the opening. Choosing less motion keeps the same content and actions available.</p><NavLink className="studio-text-link" to="/">Explore the homepage ↗</NavLink></div>
      <figure className="founder-art"><LiquidLightArtwork alt="Translucent coral light flowing across a warm ivory background"/><figcaption>Liquid Light · Crystal Powers</figcaption></figure>
    </section>
    <section className="studio-section founder-process" aria-labelledby="collaboration-title"><p className="studio-eyebrow">HOW WE WORK TOGETHER</p><h2 id="collaboration-title">A clear direction.<br /><span className="studio-soft">Room for your feedback.</span></h2><p className="studio-page-lead">Explore each stage to see what you bring, what you’ll see and what we agree together. The exact scope and feedback points are set out for your project.</p><WorkspaceLayers /><CollaborationChapters /></section>
    <section className="studio-section founder-expectations" aria-labelledby="expectations-title"><div><p className="studio-eyebrow">THE PRACTICAL DETAILS</p><h2 id="expectations-title">Clarity is part<br /><span className="studio-soft">of the design.</span></h2></div><div><article><h3>Direct communication</h3><p>You speak with the person designing and building your project. We agree how feedback is shared and keep decisions in context.</p></article><article><h3>A considered handover</h3><p>Access, ownership, third-party costs and handover are confirmed in the project agreement. You know what is included before committing.</p></article><article><h3>A route for future changes</h3><p>Aftercare is discussed around your project. You can choose a maintenance option or ask about support before deciding.</p><NavLink className="studio-text-link" to="/support">Explore ongoing support ↗</NavLink></article></div></section>
    <section className="studio-final studio-section"><p className="studio-eyebrow">LET’S FIND YOUR STARTING POINT</p><h2>Your idea.<br /><span>My full attention.</span></h2><NavLink to="/contact" className="studio-button">Tell me what you’re thinking ↗</NavLink></section>
  </div>;
}
