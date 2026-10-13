import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { THREE_D_SCREEN_QUERY, type RenderQuality } from "./renderQuality";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useMotionPolicy } from "../../hooks/useMotionPolicy";

type ExperienceState = { activeStage: string | null; activate: (id: string | null) => void; release: (id: string) => void; reduceEffects: boolean; threeDAllowed: boolean; renderQuality: RenderQuality } & ReturnType<typeof useMotionPolicy>;
const Context = createContext<ExperienceState | null>(null);

/** One interactive stage at a time keeps GPU use bounded across long pages. */
export function ExperienceProvider({ children, reduceEffects = false, renderQuality = "automatic" }: PropsWithChildren<{ reduceEffects?: boolean; renderQuality?: RenderQuality }>) {
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const tabletScreen = useMediaQuery(THREE_D_SCREEN_QUERY);
  const threeDAllowed = tabletScreen && !reduceEffects;
  const activate = useCallback((id: string | null) => setActiveStage(threeDAllowed ? id : null), [threeDAllowed]);
  const policy = useMotionPolicy(reduceEffects, renderQuality);
  const release = useCallback((id: string) => setActiveStage(current => current === id ? null : current), []);
  useEffect(() => { if (!threeDAllowed) setActiveStage(null); }, [threeDAllowed]);
  const value = useMemo(() => ({ activeStage: threeDAllowed ? activeStage : null, activate, release, reduceEffects, threeDAllowed, renderQuality, ...policy }), [activeStage, activate, release, reduceEffects, threeDAllowed, renderQuality, policy.systemReducedMotion, policy.reducedMotion, policy.pageVisible, policy.lightMotion, policy.ambientMotion]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useExperience() {
  const value = useContext(Context);
  if (!value) throw new Error("ExperienceProvider is required");
  return value;
}
