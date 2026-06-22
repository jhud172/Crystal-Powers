import { useEffect, useState } from "react";

/**
 * Reactive hook that returns true when the user has requested reduced motion
 * via the OS/browser accessibility preference.
 *
 * The initial value is read synchronously so there is no flash of full-motion
 * content on first render.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);

    const onChange = () => setPrefersReducedMotion(query.matches);
    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, []);

  return prefersReducedMotion;
}
