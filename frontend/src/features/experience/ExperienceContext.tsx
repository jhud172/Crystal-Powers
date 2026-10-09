import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

type ExperienceState = { activeStage: string | null; activate: (id: string | null) => void; reduceEffects: boolean };
const Context = createContext<ExperienceState | null>(null);

/** One interactive stage at a time keeps GPU use bounded across long pages. */
export function ExperienceProvider({ children, reduceEffects = false }: PropsWithChildren<{ reduceEffects?: boolean }>) {
  const [activeStage, activate] = useState<string | null>(null);
  useEffect(() => { if (reduceEffects) activate(null); }, [reduceEffects]);
  const value = useMemo(() => ({ activeStage, activate, reduceEffects }), [activeStage, reduceEffects]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useExperience() {
  const value = useContext(Context);
  if (!value) throw new Error("ExperienceProvider is required");
  return value;
}
