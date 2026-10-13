import { usePrivacyPublication } from "../features/privacy/PrivacyPublication";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { usePageMetadata } from "../hooks/usePageMetadata";
const pages: Record<string, [string, string]> = {
  "/": ["Crystal Powers | Websites, apps & digital experiences", "Independent design and development by James. Distinctive websites, apps and bespoke systems, thoughtfully built around your business."],
  "/about": ["Meet James | Crystal Powers", "Meet James, founder of Crystal Powers, and explore his independent design and development studio."],
  "/services": ["Websites, apps & bespoke systems | Crystal Powers", "Explore website packages, application development, custom digital systems and ongoing support from Crystal Powers."],
  "/portfolio": ["Selected projects | Crystal Powers", "Explore published Crystal Powers projects and the decisions behind their design and development."],
  "/support": ["Support & maintenance | Crystal Powers", "Help with website updates, fixes, maintenance and the next chapter after launch."],
  "/contact": ["Start a project | Crystal Powers", "Tell James about your next website, app or digital project. Work directly with the founder of Crystal Powers."],
  "/accessibility": ["Accessibility | Crystal Powers", "Use the Crystal Powers website with appearance choices, reduced effects, keyboard controls and a way to report access problems."],
};
export function RouteMetadata() {
  const { pathname } = useLocation();
  const {ready}=usePrivacyPublication();
  const path = pathname.replace(/\/+$/, "") || "/";
  useEffect(() => { document.querySelector('meta[name="robots"]')?.setAttribute("content", (pages[path] || (path==="/privacy" && ready===true)) ? "index, follow" : "noindex, nofollow"); }, [path,ready]);
  const details = pages[path] ?? (path==="/privacy" ? (ready===true ? ["Privacy & your data | Crystal Powers","How Crystal Powers handles personal information, contact details and project communications."] : ["Page not found | Crystal Powers","This page is unavailable. Explore the studio, published work or contact James."]) : path === "/admin" || path.startsWith("/admin/") ? ["Owner studio | Crystal Powers", "Private project management."] : path === "/team" || path.startsWith("/team/") ? ["Team workspace | Crystal Powers", "Private team communication."] : path === "/client" || path.startsWith("/client/") ? ["Client workspace | Crystal Powers", "Private project progress and conversations."] : ["Crystal Powers", "Independent websites, apps and digital experiences."]);
  usePageMetadata(details[0], details[1], path);
  return null;
}
