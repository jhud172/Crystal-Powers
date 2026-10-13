import { createContext, ReactNode, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";

type RegisterGuard = (id: string, message: string) => () => void;
const GuardContext = createContext<RegisterGuard | null>(null);

/** One router blocker serves all mounted owner flows, including reauthentication. */
export function NavigationProtection({ children }: { children: ReactNode }) {
  const guards = useRef(new Map<string, string>());
  const register = useCallback<RegisterGuard>((id, message) => {
    guards.current.set(id, message);
    return () => { guards.current.delete(id); };
  }, []);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => guards.current.size > 0 && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  const decided = useRef<string | null>(null);
  useEffect(() => {
    if (blocker.state !== "blocked") { decided.current = null; return; }
    if (decided.current === blocker.location.key) return;
    decided.current = blocker.location.key;
    const message = guards.current.values().next().value;
    if (!message || window.confirm(message)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    const refresh = (event: BeforeUnloadEvent) => {
      if (!guards.current.size) return;
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("beforeunload", refresh);
    return () => window.removeEventListener("beforeunload", refresh);
  }, []);
  return <GuardContext.Provider value={register}>{children}</GuardContext.Provider>;
}

export function useNavigationProtection(pending: boolean, message: string) {
  const register = useContext(GuardContext);
  const id = useId();
  if (!register) throw new Error("Navigation protection requires its router provider.");
  useLayoutEffect(() => { if (pending) return register(id, message); }, [pending, message, id, register]);
}
