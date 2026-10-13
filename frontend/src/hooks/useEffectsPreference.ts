import { useEffect, useState } from "react";
import { isRenderQuality, type RenderQuality } from "../features/experience/renderQuality";

const preferenceKey = "crystal_reduce_effects";
const qualityKey = "crystal_render_quality";

/** Only a presentation preference is persisted; blocked storage is harmless. */
export function useEffectsPreference() {
  const [renderQuality, setRenderQuality] = useState<RenderQuality>(() => {
    try { const value = window.localStorage.getItem(qualityKey); return isRenderQuality(value) ? value : "automatic"; }
    catch { return "automatic"; }
  });
  const [reduceEffects, setReduceEffects] = useState(() => {
    try { return window.localStorage.getItem(preferenceKey) === "true"; }
    catch { return false; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(preferenceKey, String(reduceEffects)); }
    catch { /* The preference still works for the current visit. */ }
  }, [reduceEffects]);

  useEffect(() => {
    try { window.localStorage.setItem(qualityKey, renderQuality); }
    catch { /* The preference still works for the current visit. */ }
  }, [renderQuality]);

  return { reduceEffects, setReduceEffects, renderQuality, setRenderQuality };
}
