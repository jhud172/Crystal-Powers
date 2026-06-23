export const easing = {
  entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
  exit: "cubic-bezier(0.7, 0, 0.84, 0)",
  standard: "cubic-bezier(0.22, 1, 0.36, 1)",
  soft: "cubic-bezier(0.33, 1, 0.68, 1)",
  linear: "linear",
} as const;

export const motionDurations = {
  instant: 0,
  fast: 0.18,
  standard: 0.36,
  slow: 0.56,
} as const;

export type EasingName = keyof typeof easing;
export type MotionDurationName = keyof typeof motionDurations;
