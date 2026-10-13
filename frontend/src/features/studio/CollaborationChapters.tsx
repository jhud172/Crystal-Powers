import { useId, useState } from "react";

const chapters = [
  { title: "Discover", lead: "A shared direction before the details.", need: "Your audience, goals, existing content and any constraints you already know.", see: "A proposed scope and a conversation about priorities, budget and the right starting point.", feedback: "We agree what belongs in the project before design and development begin.", output: "An agreed brief and scope." },
  { title: "Create", lead: "Something you can see, use and respond to.", need: "Your content, brand assets and feedback on the proposed direction.", see: "Designs and working previews, with explanations of the decisions that affect your visitors.", feedback: "Feedback is gathered at agreed points so we can refine the work together.", output: "A working design and build." },
  { title: "Refine", lead: "Make the whole journey feel considered.", need: "A review of the content and the tasks your visitors need to complete.", see: "Responsive layouts and the main journeys checked, with issues addressed before handover.", feedback: "We review the agreed scope together and resolve outstanding details.", output: "A reviewed project prepared for launch." },
  { title: "Launch", lead: "A clear next step beyond going live.", need: "Your approval to launch and the access needed for the agreed hosting arrangements.", see: "A handover covering how to use the project and how to request future changes.", feedback: "Ownership, access and ongoing support are confirmed in your project agreement.", output: "Launch, handover and an agreed support route." },
] as const;

export function CollaborationChapters() {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const chapter = chapters[selected];
  return <div className="collaboration">
    <div className="collaboration-selector" role="group" aria-label="Explore the project stages">
      {chapters.map((item, index) => <button type="button" key={item.title} aria-pressed={selected === index} aria-controls={`${id}-chapter`} onClick={() => setSelected(index)}>
        <span className="studio-index">0{index + 1}</span><span>{item.title}</span><span aria-hidden="true">{selected === index ? "−" : "+"}</span>
      </button>)}
    </div>
    <section id={`${id}-chapter`} className="collaboration-chapter" aria-labelledby={`${id}-title`}>
      <p className="studio-eyebrow">0{selected + 1} / {chapter.title}</p>
      <h3 id={`${id}-title`}>{chapter.lead}</h3>
      <dl><div><dt>What I need from you</dt><dd>{chapter.need}</dd></div><div><dt>What you’ll see</dt><dd>{chapter.see}</dd></div><div><dt>Where feedback fits</dt><dd>{chapter.feedback}</dd></div></dl>
      <p className="collaboration-output"><span>What we leave with</span>{chapter.output}</p>
    </section>
  </div>;
}
