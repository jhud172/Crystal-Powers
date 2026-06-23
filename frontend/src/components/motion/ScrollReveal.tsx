import { useEffect, useRef, type PropsWithChildren } from "react";
import type { RevealVariant } from "../../types/animation";
import { REVEAL_THRESHOLD, REVEAL_BASE_DELAY } from "../../lib/performance/constants";

export interface ScrollRevealProps extends PropsWithChildren {
  /** Reveal direction variant. */
  variant?: RevealVariant;
  /** Additional delay in ms. */
  delay?: number;
  /** IntersectionObserver threshold (0–1). */
  threshold?: number;
  /** Additional class names. */
  className?: string;
}

/**
 * Reusable scroll-reveal wrapper that integrates with the existing
 * data-reveal / .is-visible CSS system.
 *
 * Content is rendered visible by default (CSS handles initial hidden state via
 * [data-reveal] selector). If JavaScript fails, content remains visible because
 * the .is-visible class is applied immediately when reduced motion is active.
 */
export function ScrollReveal({
  variant = "up",
  delay = REVEAL_BASE_DELAY,
  threshold = REVEAL_THRESHOLD,
  className,
  children,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Immediately reveal if reduced motion is preferred
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      element.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => entry.target.classList.add("is-visible"), delay);
            } else {
              entry.target.classList.add("is-visible");
            }
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay, threshold]);

  return (
    <div
      ref={ref}
      data-reveal={variant}
      className={className}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
