import { useEffect, useRef, type HTMLAttributes } from "react";
import { useLocation } from "react-router-dom";
import { useExperience } from "./ExperienceContext";

/** Small, cancellable orientation cues; content is readable before every effect. */
export function MotionScope({ children, animateRoutes = true, ...props }: HTMLAttributes<HTMLDivElement> & { animateRoutes?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const { ambientMotion, reducedMotion, pageVisible, lightMotion } = useExperience();
  useEffect(() => {
    const root = host.current;
    if (!root || !ambientMotion || typeof root.animate !== "function") return;
    const animations = new Set<Animation>();
    function arrive(element: Element, duration: number) {
      const animation = element.animate([{ opacity: .96, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration, easing: "cubic-bezier(.2,.7,.2,1)" });
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    }
    const main = root.querySelector("main");
    if (animateRoutes && main) arrive(main, 180);
    const observer = typeof IntersectionObserver !== "function" ? null : new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { arrive(entry.target, 220); observer?.unobserve(entry.target); }
    }, { threshold: .08 });
    root.querySelectorAll("[data-reveal]").forEach(element => observer?.observe(element));
    return () => { observer?.disconnect(); animations.forEach(animation => animation.cancel()); animations.clear(); };
  }, [pathname, ambientMotion, animateRoutes]);
  return <div {...props} ref={host} data-motion={pageVisible ? reducedMotion ? "reduced" : lightMotion ? "light" : "full" : "paused"}>{children}</div>;
}
