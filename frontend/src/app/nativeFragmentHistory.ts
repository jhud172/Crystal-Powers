import type { createBrowserRouter } from "react-router-dom";

/** Adopt native fragment entries before the router handles POP, retaining blockers and distinct form scopes. */
export function preserveNativeFragmentHistory() {
  let router: ReturnType<typeof createBrowserRouter> | undefined;
  let index = typeof history.state?.idx === "number" ? history.state.idx : 0;
  let unsubscribe: (() => void) | undefined;
  const followRouter = () => {
    if (typeof history.state?.idx === "number") index = history.state.idx;
  };
  const adopt = () => {
    if (!router) return;
    const current = router.state.location;
    const state = history.state;
    // Native hash navigation drops React Router's idx/key. Keep its current history contract
    // local to this adapter; browser tests cover replacement-fragment Back/Forward and guards.
    if (typeof state?.idx !== "number" && location.pathname === current.pathname && location.search === current.search) {
      history.replaceState({ ...(state && typeof state === "object" ? state : {}), idx: index + 1, key: Math.random().toString(36).slice(2, 10) }, "");
    }
  };
  // Window is the event target: install before createBrowserRouter, not just with capture=true.
  window.addEventListener("popstate", adopt, true);
  return {
    connect(next: ReturnType<typeof createBrowserRouter>) { router = next; followRouter(); unsubscribe = next.subscribe(followRouter); },
    dispose() { window.removeEventListener("popstate", adopt, true); unsubscribe?.(); },
  };
}
