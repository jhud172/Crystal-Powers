import type { QualityPreset, CrystalMaterialConfig } from "../../types/three";
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

/** Default crystal material configuration values suitable for meshPhysicalMaterial. */
export const defaultCrystalMaterial: CrystalMaterialConfig = {
  color: "#ffffff",
  emissive: "#0ea5e9",
  emissiveIntensity: 0.22,
  metalness: 0.04,
  roughness: 0.02,
  transmission: 0.72,
  thickness: 1.75,
  ior: 2.42,
  opacity: 0.86,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  envMapIntensity: 1.8,
  reflectivity: 0.88,
};
