import type { Transition, Variants } from "motion/react";
import { easing, motionDurations } from "./easing";

export const standardTransition: Transition = {
  duration: motionDurations.standard,
  ease: [0.22, 1, 0.36, 1],
};

export const reducedMotionTransition: Transition = {
  duration: motionDurations.instant,
};

export const mountVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: standardTransition,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: motionDurations.fast,
      ease: [0.7, 0, 0.84, 0],
    },
  },
};

export const reducedMountVariants: Variants = {
  initial: { opacity: 1 },
  animate: {
    opacity: 1,
    transition: reducedMotionTransition,
  },
  exit: {
    opacity: 1,
    transition: reducedMotionTransition,
  },
};

export const layoutTransition: Transition = {
  layout: {
    duration: motionDurations.standard,
    ease: [0.22, 1, 0.36, 1],
  },
};

export const routeTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDurations.slow,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: {
      duration: motionDurations.fast,
      ease: [0.7, 0, 0.84, 0],
    },
  },
};

export const reducedRouteTransitionVariants = reducedMountVariants;

export const cssEasing = easing;
