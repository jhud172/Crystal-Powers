import { NavLink } from "react-router-dom";
export function NotFound() {
  return <section className="studio-page-heading studio-section studio-not-found"><p className="studio-eyebrow">404 / A DIFFERENT DIRECTION</p><h1>A little<br />off course.</h1><p className="studio-page-lead">This page isn’t available. Let’s get you back to something worth exploring.</p><div className="studio-actions"><NavLink to="/" className="studio-button">Back to the studio ↗</NavLink><NavLink to="/portfolio" className="studio-text-link">Explore the work ↗</NavLink></div></section>;
}
