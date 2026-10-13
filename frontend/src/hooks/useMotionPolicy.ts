import { useEffect, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import type { RenderQuality } from "../features/experience/renderQuality";

/** One shared subscription per experience; component visibility remains stage-owned. */
export function useMotionPolicy(reduceEffects: boolean, quality: RenderQuality) {
  const systemReducedMotion = usePrefersReducedMotion();
  const compact = useMediaQuery("(max-width: 480px)");
  const [pageVisible, setPageVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  useEffect(() => {
    const changed = () => setPageVisible(document.visibilityState === "visible");
    changed();
    document.addEventListener("visibilitychange", changed);
    return () => document.removeEventListener("visibilitychange", changed);
  }, []);
  const reducedMotion = systemReducedMotion || reduceEffects;
  const lightMotion = quality === "low" || quality === "automatic" && compact;
  return { systemReducedMotion, reducedMotion, pageVisible, lightMotion, ambientMotion: !reducedMotion && !lightMotion && pageVisible };
}
