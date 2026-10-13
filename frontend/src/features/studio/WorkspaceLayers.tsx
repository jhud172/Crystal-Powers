export function WorkspaceLayers() {
  return <figure className="workspace-layers" aria-labelledby="workspace-caption">
    <div className="workspace-axis" aria-hidden="true"><span>IDEA</span><span>WORKING EXPERIENCE</span></div>
    <ol>
      <li><span className="workspace-number" aria-hidden="true">01</span><div><h3>The brief</h3><p>Audience, purpose and the actions that matter.</p></div><span className="workspace-detail">Direction</span></li>
      <li><span className="workspace-number" aria-hidden="true">02</span><div><h3>The interface</h3><p>Content, layout and a clear path through the task.</p></div><span className="workspace-detail">Design</span></li>
      <li><span className="workspace-number" aria-hidden="true">03</span><div><h3>The working build</h3><p>Connected behaviour, responsive views and useful feedback.</p></div><span className="workspace-detail">Development</span></li>
    </ol>
    <figcaption id="workspace-caption"><span className="studio-eyebrow">ONE CONNECTED WORKSPACE</span><p>Review runs through every layer. The design and the behaviour are considered together, with feedback at the points agreed for your project.</p></figcaption>
  </figure>;
}
