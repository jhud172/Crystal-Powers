/** Motion variant names used by reveal and transition components. */
export type RevealVariant = "up" | "left" | "right" | "down" | "fade" | "scale";

/** Supported motion intensity levels. */
export type MotionIntensity = "none" | "subtle" | "standard" | "expressive";

/** Interaction intensity for pointer-driven effects. */
export type InteractionIntensity = "none" | "light" | "standard" | "heavy";

/** Stagger delay configuration. */
export interface StaggerConfig {
  /** Base delay in ms before the first item begins. */
  baseDelay?: number;
  /** Delay increment in ms between each child. */
  increment?: number;
}

/** Props shared by components that support reveal animation. */
export interface RevealProps {
  /** Reveal direction variant. */
  variant?: RevealVariant;
  /** Additional delay in ms before the reveal starts. */
  delay?: number;
  /** IntersectionObserver threshold (0–1). */
  threshold?: number;
}
