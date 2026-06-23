/** Quality tier for rendering and interaction decisions. */
export type QualityLevel = "high" | "standard" | "mobile" | "reduced" | "fallback";

/** Pointer capability detected on the device. */
export type PointerCapability = "fine" | "coarse" | "none";

/** Reduced-motion preference state. */
export type ReducedMotionState = "reduce" | "no-preference";

/** Experience feature flags controlling optional enhancements. */
export interface ExperienceFeatureFlags {
  /** WebGL / Three.js crystal scene enabled. */
  webgl: boolean;
  /** Pointer-driven effects (tilt, magnetic, spotlight). */
  pointerEffects: boolean;
  /** Scroll-driven reveals. */
  scrollReveal: boolean;
  /** Cursor aura background effect. */
  cursorAura: boolean;
  /** Post-processing effects in Three.js. */
  postProcessing: boolean;
  /** Idle animation (floating, sparkles). */
  idleAnimation: boolean;
}
