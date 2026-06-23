import type { PointerCapability, ReducedMotionState, QualityLevel } from "../../types/experience";

/** Detect whether the user prefers reduced motion. */
export function getReducedMotion(): ReducedMotionState {
  if (typeof window === "undefined") return "no-preference";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "no-preference";
}

/** Detect pointer capability (fine pointer = mouse/trackpad, coarse = touch). */
export function getPointerCapability(): PointerCapability {
  if (typeof window === "undefined") return "fine";
  if (window.matchMedia("(pointer: fine)").matches) return "fine";
  if (window.matchMedia("(pointer: coarse)").matches) return "coarse";
  return "none";
}

/** Check whether WebGL is supported. */
export function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

/** Determine the appropriate quality level based on device capabilities. */
export function detectQualityLevel(): QualityLevel {
  const motion = getReducedMotion();
  if (motion === "reduce") return "reduced";

  if (!supportsWebGL()) return "fallback";

  const pointer = getPointerCapability();
  const memory = (navigator as { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;

  if (pointer === "coarse" || (memory !== undefined && memory <= 4) || cores <= 2) {
    return "mobile";
  }

  if (cores >= 8 && (memory === undefined || memory >= 8)) {
    return "high";
  }

  return "standard";
}
