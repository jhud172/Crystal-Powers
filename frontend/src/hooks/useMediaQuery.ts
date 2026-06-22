import { useEffect, useState } from "react";

/**
 * Generic reactive hook for CSS media queries.
 *
 * Returns true when the given media query matches. Re-renders when the match
 * state changes, e.g. when the user resizes the viewport or changes device
 * settings.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
