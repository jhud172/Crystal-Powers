import { useEffect, useState } from "react";

const preferenceKey = "crystal_reduce_effects";

/** Only a presentation preference is persisted; blocked storage is harmless. */
export function useEffectsPreference() {
  const [reduceEffects, setReduceEffects] = useState(() => {
    try { return window.localStorage.getItem(preferenceKey) === "true"; }
    catch { return false; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(preferenceKey, String(reduceEffects)); }
    catch { /* The preference still works for the current visit. */ }
  }, [reduceEffects]);

  return { reduceEffects, setReduceEffects };
}
