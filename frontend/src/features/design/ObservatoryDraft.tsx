import { useEffect, useRef, useState } from "react";
import { ThemeId, themes } from "../../data/site";
import { additions, maintenanceOptions, packages } from "../services/services";

const compositions = ["Homepage", "Services builder", "Case study"] as const;
type Composition = (typeof compositions)[number];

/** Development-only design entry: never mounted by the public router. */
export function ObservatoryDraft() {
  const [composition, setComposition] = useState<Composition>("Homepage");
  const [theme, setTheme] = useState<ThemeId>("futuristic");
  const [openingStill, setOpeningStill] = useState(false);
  const [packageValue, setPackageValue] = useState("");
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);
  const [maintenanceValue, setMaintenanceValue] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const light = ["clean", "fresh", "summer-vibes"].includes(theme);
  const selected = packages.find(item => item.value === packageValue);

  useEffect(() => { document.body.dataset.theme = theme; }, [theme]);
  function moveStep(next: number) {
    if (next > step && step === 0 && !packageValue) { setError("Choose a starting point to continue."); return; }
    setError(""); setStep(next);
    requestAnimationFrame(() => stepHeading.current?.focus());
  }

  return <div className="studio-shell observatory-draft" data-appearance={light ? "light" : "dark"}>
    <a className="studio-skip" href="#draft-content">Skip to content</a>
    <div className="draft-toolbar"><p>Crystal Powers 2.0 <span> / Visual direction · design preview</span></p><label>Appearance <select value={theme} onChange={event => setTheme(event.target.value as ThemeId)}>{themes.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label></div>
    <div className="draft-compositions" role="group" aria-label="Preview a composition">{compositions.map(item => <button key={item} aria-pressed={composition === item} onClick={() => setComposition(item)}>{item}</button>)}</div>
    <header className="draft-header"><a href="/" className="draft-wordmark">◇ <span>CRYSTAL POWERS</span></a><nav aria-label="Preview navigation"><a href="/portfolio">Work</a><a href="/services">Services</a><a href="/about">Studio</a></nav><a className="draft-project-link" href="/contact">Start a project ↗</a></header>
    <main id="draft-content">
      {composition === "Homepage" && <>
        <section className="draft-hero">
          <div className="draft-hero-copy"><p className="studio-eyebrow"><span className="studio-dot" /> INDEPENDENT DESIGN & DEVELOPMENT</p><h1>Made to<br />stand <em>apart.</em></h1><p className="draft-lead">Distinctive websites, thoughtful apps and systems that make work simpler.</p><p className="draft-body">Work directly with James, from the first idea to the final detail.</p><div className="studio-actions"><a className="studio-button" href="/contact">Start a project <span aria-hidden="true">↗</span></a><a className="studio-text-link" href="/portfolio">Explore the work ↗</a></div></div>
          <figure className="draft-observatory"><picture><source srcSet={`/renders/observatory-${light ? "light" : "dark"}${openingStill ? "-open" : ""}-800.webp 800w, /renders/observatory-${light ? "light" : "dark"}${openingStill ? "-open" : ""}.webp 1600w`} sizes="(max-width: 1000px) 100vw, 50vw" type="image/webp" /><img src={`/renders/observatory-${light ? "light" : "dark"}${openingStill ? "-open" : ""}.png`} width="1600" height="1000" alt={openingStill ? "Eight original crystal facets separated around a luminous core inside an unlocked titanium frame" : "An original segmented optical crystal within a precision titanium frame"} /></picture><figcaption><span>01 / THE CRYSTAL OBSERVATORY<br /><span role="status">{openingStill ? "Open-state render" : "Rest-state render"} · live integration pending</span></span><button type="button" aria-pressed={openingStill} onClick={() => setOpeningStill(value => !value)}>{openingStill ? "Show rest state" : "Preview open state"} <span aria-hidden="true">◇</span></button></figcaption></figure>
        </section>
        <section className="draft-proof"><p className="studio-eyebrow">DESIGN THAT GOES SOMEWHERE</p><h2>A clear offer.<br /><span className="studio-soft">A considered experience.</span></h2><div><p>Explore the studio’s approach while permission-cleared projects are prepared for publication.</p><a href="/about" className="studio-text-link">How I work ↗</a></div></section>
        <section className="draft-pathways" aria-label="Build pathways">{[["01", "Websites", "A distinctive home for your business."], ["02", "Apps", "Useful ideas, made easy to use."], ["03", "Bespoke systems", "Make the everyday work flow better."]].map(([number, title, copy]) => <a href="/services" key={title}><span className="studio-eyebrow">{number}</span><h2>{title} <span aria-hidden="true">↗</span></h2><p>{copy}</p></a>)}</section>
      </>}
      {composition === "Services builder" && <section className="draft-builder">
        <header className="draft-builder-heading"><p className="studio-eyebrow">SERVICES / SHAPE YOUR NEXT CHAPTER</p><h1>A starting point.<br /><span className="studio-soft">Built around you.</span></h1><p>Choose the essentials. We’ll agree the final scope together.</p></header>
        <div className="draft-builder-grid"><div className="draft-builder-main"><ol className="draft-step-list" aria-label="Builder progress">{["Starting point", "Additions", "Aftercare"].map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}><button onClick={() => { if (index <= step) moveStep(index); }} disabled={index > step}>{String(index + 1).padStart(2, "0")} {label}</button></li>)}</ol><h2 ref={stepHeading} tabIndex={-1}>{["What does your website need?", "Add only what helps.", "Plan what happens next."][step]}</h2><p className="draft-body">{["Compare every option without losing your place.", "These are optional. You can keep the build simple.", "Existing plan prices are shown below. A discuss-later option needs a contract update."][step]}</p>
          {error && <p className="draft-error" role="alert">{error}</p>}
          {step === 0 && <div className="draft-choices" role="group" aria-label="Website packages">{packages.map(item => <button className="draft-choice" aria-pressed={packageValue === item.value} key={item.value} onClick={() => { setPackageValue(item.value); setError(""); }}><span className="draft-choice-top"><strong>{item.title}</strong><span>{packageValue === item.value ? "✓" : "○"}</span></span><span className="draft-choice-price">{item.price} <small>{item.note}</small></span><span>{item.points[0]}</span></button>)}</div>}
          {step === 1 && <div className="draft-choices" role="group" aria-label="Optional additions">{additions.map(item => <button className="draft-choice" aria-pressed={selectedAdditions.includes(item.value)} key={item.value} onClick={() => setSelectedAdditions(current => current.includes(item.value) ? current.filter(value => value !== item.value) : [...current, item.value])}><strong>{item.title}</strong><span>{item.price} {selectedAdditions.includes(item.value) ? " · selected" : ""}</span></button>)}</div>}
          {step === 2 && <div className="draft-choices" role="group" aria-label="Aftercare plans">{maintenanceOptions.map(item => <button className="draft-choice" aria-pressed={maintenanceValue === item.value} key={item.value} onClick={() => setMaintenanceValue(item.value)}><strong>{item.title}</strong><span>{item.price} {item.note}</span><span>{item.description}</span></button>)}</div>}
          <div className="draft-builder-actions">{step > 0 && <button className="draft-back" onClick={() => moveStep(step - 1)}>← Back</button>}{step < 2 ? <button className="studio-button" onClick={() => moveStep(step + 1)}>Continue →</button> : <p className="draft-body">Design preview only. No enquiry is submitted.</p>}</div>
        </div><aside className="draft-summary" aria-label="Your selection"><p className="studio-eyebrow">YOUR BUILD, SO FAR</p><h2>{selected?.title ?? "Room for your idea."}</h2><dl><div><dt>Starting point</dt><dd>{selected?.price ?? "Choose a package"}</dd></div><div><dt>Additions</dt><dd>{selectedAdditions.length ? `${selectedAdditions.length} selected` : "None selected"}</dd></div><div><dt>Aftercare</dt><dd>{maintenanceOptions.find(item => item.value === maintenanceValue)?.title ?? "Not selected"}</dd></div></dl><p>This preview keeps choices while you move between steps. Existing prices and wire values are unchanged.</p><button className="draft-back" onClick={() => { setPackageValue(""); setSelectedAdditions([]); setMaintenanceValue(""); moveStep(0); }}>Reset choices</button></aside></div>
      </section>}
      {composition === "Case study" && <article className="draft-case"><header><p className="studio-eyebrow">STUDIO DEMONSTRATION / WEBSITE COMPOSITION</p><h1>A different<br /><em>perspective.</em></h1><p className="draft-lead">An original studio screen used to explore the case-study layout. This is demonstration artwork, not a client project.</p></header><figure className="draft-case-screen"><img src="/renders/studio-screen.png" alt="Crystal Powers demonstration screen artwork" width="1600" height="1000" /><figcaption>Studio demonstration — project-specific media will replace this artwork.</figcaption></figure><section className="draft-case-story"><aside><p className="studio-eyebrow">THE CONTEXT</p><p>Original studio artwork<br />Design composition preview</p></aside><div><p className="studio-eyebrow">01 / THE IDEA</p><h2>Let the work<br />tell the story.</h2><p>Give a real project space to explain the brief, the decisions and the result. Only approved evidence and claims belong here.</p><p className="studio-eyebrow">02 / THE APPROACH</p><h2>Clarity, at every scale.</h2><p>Readable chapters, purposeful imagery and a clear next action. Interactive devices remain optional, with a useful project view before activation.</p><a href="/contact" className="studio-button">Discuss your project ↗</a></div></section></article>}
    </main>
    <footer className="draft-footer"><p>CRYSTAL POWERS</p><p>Design direction preview · October 2026</p><a href="/">Return to the working website ↗</a></footer>
  </div>;
}
