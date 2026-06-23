import type { QualityPreset } from "../../types/three";
import type { QualityLevel } from "../../types/experience";

/** Quality presets for the crystal scene. */
export const qualityPresets: Record<QualityLevel, QualityPreset> = {
  high: {
    level: "high",
    dpr: [1.5, 2],
    particleCount: 60,
    postProcessing: true,
    environmentIntensity: 1.8,
    interactionEnabled: true,
    idleAnimation: true,
  },
  standard: {
    level: "standard",
    dpr: [1, 1.75],
    particleCount: 42,
    postProcessing: false,
    environmentIntensity: 1.8,
    interactionEnabled: true,
    idleAnimation: true,
  },
  mobile: {
    level: "mobile",
    dpr: [1, 1.25],
    particleCount: 24,
    postProcessing: false,
    environmentIntensity: 1.2,
    interactionEnabled: false,
    idleAnimation: true,
  },
  reduced: {
    level: "reduced",
    dpr: [1, 1],
    particleCount: 18,
    postProcessing: false,
    environmentIntensity: 1.0,
    interactionEnabled: false,
    idleAnimation: false,
  },
  fallback: {
    level: "fallback",
    dpr: [1, 1],
    particleCount: 0,
    postProcessing: false,
    environmentIntensity: 0,
    interactionEnabled: false,
    idleAnimation: false,
  },
};

/** Get the quality preset for a given level. */
export function getQualityPreset(level: QualityLevel): QualityPreset {
  return qualityPresets[level];
}
