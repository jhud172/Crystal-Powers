import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { RenderQuality } from "./renderQuality";
import { useMotionPolicy } from "../../hooks/useMotionPolicy";

type ExperienceState = { activeStage: string | null; activate: (id: string | null) => void; release: (id: string) => void; reduceEffects: boolean; renderQuality: RenderQuality } & ReturnType<typeof useMotionPolicy>;
const Context = createContext<ExperienceState | null>(null);

/** One interactive stage at a time keeps GPU use bounded across long pages. */
export function ExperienceProvider({ children, reduceEffects = false, renderQuality = "automatic" }: PropsWithChildren<{ reduceEffects?: boolean; renderQuality?: RenderQuality }>) {
  const [activeStage, activate] = useState<string | null>(null);
  const policy = useMotionPolicy(reduceEffects, renderQuality);
  const release = useCallback((id: string) => activate(current => current === id ? null : current), []);
  useEffect(() => { if (reduceEffects) activate(null); }, [reduceEffects]);
  const value = useMemo(() => ({ activeStage, activate, release, reduceEffects, renderQuality, ...policy }), [activeStage, release, reduceEffects, renderQuality, policy.systemReducedMotion, policy.reducedMotion, policy.pageVisible, policy.lightMotion, policy.ambientMotion]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useExperience() {
  const value = useContext(Context);
  if (!value) throw new Error("ExperienceProvider is required");
  return value;
}
