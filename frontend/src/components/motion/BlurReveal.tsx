import { useEffect, useRef, type PropsWithChildren } from "react";

export interface BlurRevealProps extends PropsWithChildren {
  /** Additional delay in ms before starting the transition. */
  delay?: number;
  /** Additional class names. */
  className?: string;
}

/**
 * Blur-to-clear reveal suitable for headings or short content.
 *
 * Uses CSS transitions only. Avoids large blur values and layout shift.
 * Respects reduced motion — immediately visible when preference is active.
 */
export function BlurReveal({ delay = 0, className, children }: BlurRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      element.classList.add("blur-reveal--visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => entry.target.classList.add("blur-reveal--visible"), delay);
            } else {
              entry.target.classList.add("blur-reveal--visible");
            }
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <span
      ref={ref}
      className={`blur-reveal ${className ?? ""}`}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </span>
  );
}
