import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

type ExperienceState = { activeStage: string | null; activate: (id: string | null) => void };
const Context = createContext<ExperienceState | null>(null);

/** One interactive stage at a time keeps GPU use bounded across long pages. */
export function ExperienceProvider({ children }: PropsWithChildren) {
  const [activeStage, activate] = useState<string | null>(null);
  const value = useMemo(() => ({ activeStage, activate }), [activeStage]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useExperience() {
  const value = useContext(Context);
  if (!value) throw new Error("ExperienceProvider is required");
  return value;
}
