import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { usePageMetadata } from "../hooks/usePageMetadata";
const pages: Record<string, [string, string]> = {
  "/": ["Crystal Powers | Websites, apps & digital experiences", "Independent design and development by James. Distinctive websites, apps and bespoke systems, thoughtfully built around your business."],
  "/about": ["Meet James | Crystal Powers", "Meet James, Founder & CEO of Crystal Powers: an independent studio bringing design, development and personal attention to your project."],
  "/services": ["Websites, apps & bespoke systems | Crystal Powers", "Explore website packages, application development, custom digital systems and ongoing support from Crystal Powers."],
  "/portfolio": ["Selected projects | Crystal Powers", "Explore the websites, apps and systems designed and developed by Crystal Powers, with interactive 3D project displays."],
  "/support": ["Support & maintenance | Crystal Powers", "Help with website updates, fixes, maintenance and the next chapter after launch."],
  "/contact": ["Start a project | Crystal Powers", "Tell James about your next website, app or digital project. Work directly with the founder of Crystal Powers."],
};
export function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => { document.querySelector('meta[name="robots"]')?.setAttribute("content", pages[pathname] ? "index, follow" : "noindex, nofollow"); }, [pathname]);
  const details = pages[pathname] ?? (pathname.startsWith("/admin") ? ["Owner studio | Crystal Powers", "Private project management."] : ["Crystal Powers", "Independent websites, apps and digital experiences."]);
  usePageMetadata(details[0], details[1], pathname);
  return null;
}
