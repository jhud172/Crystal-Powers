type ServiceKind = "website" | "app" | "system";
const examples = {
  website: { label: "Website", title: "Help visitors find their next step.", description: "An illustrative business website connects an introduction, useful service information and an enquiry. The pages and features depend on your agreed scope.", parts: ["Introduce", "Explain", "Enquire"] },
  app: { label: "App", title: "Make a useful task feel straightforward.", description: "An illustrative app takes someone from choosing a task to adding details and checking their next action. The platform and features are agreed around the people using it.", parts: ["Choose a task", "Add details", "Check and confirm"] },
  system: { label: "System", title: "Connect the work behind the interface.", description: "An illustrative internal system carries a request through review into a shared record. Access, integrations and automation are scoped around your actual workflow.", parts: ["Request", "Review", "Shared record"] },
} as const;

export function ServiceExample({ kind }: { kind: ServiceKind }) {
  const example = examples[kind];
  return <section className="service-example" aria-labelledby="service-example-title">
    <div className="service-example-copy"><p className="studio-eyebrow">{example.label.toUpperCase()} / AN ILLUSTRATIVE DIRECTION</p><h2 id="service-example-title">{example.title}</h2><p>{example.description}</p><p className="service-example-note">An example to discuss, not a client project or a list of package inclusions.</p></div>
    <figure className={`service-interface service-interface-${kind}`}>
      <div className="service-interface-art" aria-hidden="true">
        <div className="interface-chrome"><span className="interface-chrome-mark">◇</span><span>{example.label} / concept</span><span className="interface-chrome-dots">···</span></div>
        {kind === "website" ? <div className="interface-website"><span className="interface-kicker">A CLEAR INTRODUCTION</span><strong>A useful place<br />to start.</strong><div className="interface-artwork"><i /><i /><i /></div><div className="interface-pages">{example.parts.map((part, index) => <span key={part}><small>0{index + 1}</small>{part}<b>↗</b></span>)}</div></div>
          : kind === "app" ? <div className="interface-app"><span className="interface-kicker">ONE TASK AT A TIME</span><strong>Your next action.</strong><ol>{example.parts.map((part, index) => <li key={part}><span>0{index + 1}</span><b>{part}</b><i>→</i></li>)}</ol><div className="interface-progress"><span /><span /><span /></div></div>
            : <div className="interface-system"><span className="interface-kicker">A CONNECTED WORKFLOW</span><strong>Keep the context<br />with the work.</strong><ol>{example.parts.map((part, index) => <li key={part}><span>0{index + 1}</span><b>{part}</b></li>)}</ol><div className="interface-record"><span>Shared context</span><i /><i /></div></div>}
      </div>
      <figcaption>Illustrative {example.label.toLowerCase()} flow: {example.parts.join(" → ")}. Static original interface study.</figcaption>
    </figure>
  </section>;
}
