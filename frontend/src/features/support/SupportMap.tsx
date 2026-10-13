export function SupportMap() {
  return <figure className="support-map" aria-labelledby="support-map-caption">
    <div className="support-map-heading"><span className="studio-eyebrow">FROM REQUEST TO NEXT STEP</span><span className="support-map-mark" aria-hidden="true">↗</span></div>
    <ol>
      <li><span className="workflow-node" aria-hidden="true">01</span><h2>Describe</h2><p>The page, what happened and what you expected. Add a screenshot if it helps.</p></li>
      <li><span className="workflow-node" aria-hidden="true">02</span><h2>Review</h2><p>James reviews the context with you and clarifies what the work needs.</p></li>
      <li><span className="workflow-node" aria-hidden="true">03</span><h2>Agree</h2><p>Confirm the scope, timing and any cost before work begins.</p></li>
    </ol>
    <figcaption id="support-map-caption">A route for your request, rather than a live ticket status. Support depends on your agreed plan and availability; access is arranged separately if needed.</figcaption>
  </figure>;
}
