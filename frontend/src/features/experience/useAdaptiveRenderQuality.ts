import { useCallback, useEffect, useRef, useState } from "react";
import { AdaptiveRenderQuality } from "./adaptiveRenderQuality";
import { resolveRenderTier, type RenderQuality } from "./renderQuality";

/** Quality is local to the active canvas; preference and form state stay owned
 * by their existing providers. Frame samples update React only on tier changes. */
export function useAdaptiveRenderQuality(preference: RenderQuality, width: number) {
  const initial = resolveRenderTier(preference, width);
  const [automatic, setAutomatic] = useState(initial);
  const controller = useRef<AdaptiveRenderQuality | null>(null);
  useEffect(() => {
    controller.current = new AdaptiveRenderQuality(initial, performance.now());
    setAutomatic(initial);
    return () => { controller.current = null; };
  }, [initial, preference]);
  const onSample = useCallback((interval: number, now: number) => {
    if (preference !== "automatic") return;
    const next = controller.current?.sample(interval, now);
    if (next) setAutomatic(next);
  }, [preference]);
  return { tier: preference === "automatic" ? automatic : preference, onSample };
}
