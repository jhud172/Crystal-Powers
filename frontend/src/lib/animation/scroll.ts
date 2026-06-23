import { ScrollTrigger, registerGsapPlugins } from "./gsap";

export const defaultScrollTriggerConfig = {
  start: "top 82%",
  end: "bottom 18%",
  toggleActions: "play none none reverse",
  invalidateOnRefresh: true,
} as const;

export const routeScrollTriggerConfig = {
  ...defaultScrollTriggerConfig,
  once: false,
} as const;

let refreshFrame: number | null = null;
let refreshTimeout: number | null = null;

export function configureScrollTriggerDefaults(): void {
  registerGsapPlugins();

  ScrollTrigger.defaults(defaultScrollTriggerConfig);
  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
  });
}

export function refreshScrollTriggers(): void {
  if (typeof window === "undefined") return;

  registerGsapPlugins();
  ScrollTrigger.refresh();
}

export function refreshScrollTriggersSoon(delay = 80): void {
  if (typeof window === "undefined") return;

  if (refreshFrame !== null) {
    window.cancelAnimationFrame(refreshFrame);
    refreshFrame = null;
  }

  if (refreshTimeout !== null) {
    window.clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }

  refreshFrame = window.requestAnimationFrame(() => {
    refreshFrame = null;
    refreshTimeout = window.setTimeout(() => {
      refreshTimeout = null;
      refreshScrollTriggers();
    }, delay);
  });
}

export function killScrollTriggersById(id: string): void {
  registerGsapPlugins();

  ScrollTrigger.getAll().forEach((trigger) => {
    if (trigger.vars.id === id) {
      trigger.kill();
    }
  });
}

configureScrollTriggerDefaults();
