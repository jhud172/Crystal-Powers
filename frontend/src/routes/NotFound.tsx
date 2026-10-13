import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { usePageMetadata } from "../hooks/usePageMetadata";

export function NotFound() {
  const { pathname } = useLocation();
  usePageMetadata("Page not found | Crystal Powers", "This page is unavailable. Explore the studio, published work or contact James.", pathname.replace(/\/+$/, "") || "/");
  useEffect(() => { document.querySelector('meta[name="robots"]')?.setAttribute("content", "noindex, nofollow"); }, []);
  return <section className="studio-page-heading studio-section studio-not-found recovery-page">
    <div><p className="studio-eyebrow">404 / SIGNAL LOST</p><h1>A little<br />off course.</h1><p className="studio-page-lead">This page isn’t available. Let’s get you back to something worth exploring.</p><div className="studio-actions"><NavLink to="/" className="studio-button">Back to the studio ↗</NavLink><NavLink to="/portfolio" className="studio-text-link">Explore the work ↗</NavLink><NavLink to="/contact?intent=general" className="studio-text-link">Contact James ↗</NavLink></div></div>
    <svg className="recovery-signal" viewBox="0 0 420 420" fill="none" aria-hidden="true" focusable="false"><circle cx="210" cy="210" r="175" /><circle cx="210" cy="210" r="120" /><circle cx="210" cy="210" r="62" /><path d="M210 16v72m0 244v72M16 210h72m244 0h72M86 86l51 51m146 146 51 51M86 334l51-51m146-146 51-51" /><path className="recovery-crystal" d="m210 130 66 42v77l-66 42-66-42v-77l66-42Zm0 0 26 59-26 102-26-102 26-59Zm-66 42 40 17h52l40-17m-132 77 66-35 66 35" /><path className="recovery-trail" d="M18 303h65l36-25m188-181 36-36h59" /><circle className="recovery-node" cx="18" cy="303" r="5" /><circle className="recovery-node" cx="402" cy="61" r="5" /></svg>
  </section>;
}
