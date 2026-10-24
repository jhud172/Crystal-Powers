import { useEffect, useRef, type HTMLAttributes } from "react";
import { useLocation } from "react-router-dom";
import { useExperience } from "./ExperienceContext";

/** Small, cancellable orientation cues; content is readable before every effect. */
export function MotionScope({ children, animateRoutes = true, ...props }: HTMLAttributes<HTMLDivElement> & { animateRoutes?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const arrival = useRef({ pathname, entered: false, seen: new WeakSet<Element>() });
  const { ambientMotion, reducedMotion, pageVisible, lightMotion } = useExperience();
  useEffect(() => {
    const root = host.current;
    if (!root) return;
    if (arrival.current.pathname !== pathname) arrival.current = { pathname, entered: false, seen: new WeakSet<Element>() };
    const visit = arrival.current;
    const candidates = [...root.querySelectorAll(animateRoutes ? "main > * > section, main > * > header, [data-reveal]" : "[data-reveal]")];
    const sections = candidates.filter(element => !candidates.some(parent => parent !== element && parent.contains(element))).slice(0, 24);
    if (!ambientMotion || typeof root.animate !== "function") {
      // A preference change or visibility resume is not a new route arrival.
      // Remember content already on screen even while decorative motion is off.
      visit.entered = true;
      for (const element of sections) {
        const bounds = element.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < window.innerHeight) visit.seen.add(element);
      }
      return;
    }
    const animations = new Set<Animation>();
    function arrive(element: Element, duration: number, translate = true) {
      // A transformed ancestor would turn viewport-fixed artwork into scrolling content.
      const frames = translate && !element.querySelector(".liquid-light-art")
        ? [{ opacity: .96, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }]
        : [{ opacity: .96 }, { opacity: 1 }];
      const animation = element.animate(frames, { duration, easing: "cubic-bezier(.2,.7,.2,1)" });
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    }
    const main = root.querySelector("main");
    if (animateRoutes && main && !visit.entered) arrive(main, 180, false);
    visit.entered = true;
    const observer = typeof IntersectionObserver !== "function" ? null : new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        if (!visit.seen.has(entry.target)) { visit.seen.add(entry.target); arrive(entry.target, 220); }
        observer?.unobserve(entry.target);
      }
    }, { threshold: .08 });
    sections.filter(element => !visit.seen.has(element)).forEach(element => observer?.observe(element));
    return () => { observer?.disconnect(); animations.forEach(animation => animation.cancel()); animations.clear(); };
  }, [pathname, ambientMotion, animateRoutes]);
  useEffect(() => {
    const root = host.current;
    if (!root || !ambientMotion || !pageVisible) return;
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let card: HTMLElement | null = null, frame = 0, x = 0, y = 0;
    const clear = () => {
      cancelAnimationFrame(frame); frame = 0;
      card?.style.removeProperty("--spotlight-x"); card?.style.removeProperty("--spotlight-y");
      card = null;
    };
    const move = (event: PointerEvent) => {
      if (!pointer.matches || event.pointerType !== "mouse") return;
      const next = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-spotlight]") : null;
      if (next !== card) { clear(); card = next; }
      if (!card) return;
      x = event.clientX; y = event.clientY;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (!card) return;
        const bounds = card.getBoundingClientRect();
        card.style.setProperty("--spotlight-x", `${x - bounds.left}px`);
        card.style.setProperty("--spotlight-y", `${y - bounds.top}px`);
      });
    };
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", clear);
    pointer.addEventListener("change", clear);
    return () => { clear(); root.removeEventListener("pointermove", move); root.removeEventListener("pointerleave", clear); pointer.removeEventListener("change", clear); };
  }, [pathname, ambientMotion, pageVisible]);
  return <div {...props} ref={host} data-motion={pageVisible ? reducedMotion ? "reduced" : lightMotion ? "light" : "full" : "paused"}>{children}</div>;
}
