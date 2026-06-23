import { useEffect, useState } from "react";

export type PointerCapability = {
  /** True when the primary pointing device is fine (mouse, trackpad, stylus). */
  isFinePointer: boolean;
  /** True when the primary pointing device supports hover. */
  hasHover: boolean;
  /** True when the primary pointing device is coarse (finger touch) or none. */
  isCoarseOrTouch: boolean;
};

/**
 * Reactive hook that returns the current pointer input capabilities of the
 * device. Used to gate hover-only effects (cursor aura, tilt) so they do not
 * activate on touch or coarse-pointer devices.
 */
export function usePointerCapability(): PointerCapability {
  const [capability, setCapability] = useState<PointerCapability>(() => {
    if (typeof window === "undefined") {
      return { isFinePointer: false, hasHover: false, isCoarseOrTouch: true };
    }
    return {
      isFinePointer: window.matchMedia("(pointer: fine)").matches,
      hasHover: window.matchMedia("(hover: hover)").matches,
      isCoarseOrTouch:
        window.matchMedia("(pointer: coarse)").matches ||
        !window.matchMedia("(pointer: fine)").matches,
    };
  });

  useEffect(() => {
    const fineQuery = window.matchMedia("(pointer: fine)");
    const hoverQuery = window.matchMedia("(hover: hover)");
    const coarseQuery = window.matchMedia("(pointer: coarse)");

    const update = () => {
      setCapability({
        isFinePointer: fineQuery.matches,
        hasHover: hoverQuery.matches,
        isCoarseOrTouch: coarseQuery.matches || !fineQuery.matches,
      });
    };

    fineQuery.addEventListener("change", update);
    hoverQuery.addEventListener("change", update);
    coarseQuery.addEventListener("change", update);

    return () => {
      fineQuery.removeEventListener("change", update);
      hoverQuery.removeEventListener("change", update);
      coarseQuery.removeEventListener("change", update);
    };
  }, []);

  return capability;
}
