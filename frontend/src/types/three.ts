import type { QualityLevel } from "./experience";

/** Quality preset configuration for the Three.js crystal scene. */
export interface QualityPreset {
  /** Quality level identifier. */
  level: QualityLevel;
  /** Device pixel ratio range [min, max]. */
  dpr: [number, number];
  /** DPR ceiling after device capability checks. */
  maxDpr: number;
  /** Maximum particle/sparkle count. */
  particleCount: number;
  /** Whether post-processing is enabled. */
  postProcessing: boolean;
  /** Environment map intensity multiplier. */
  environmentIntensity: number;
  /** Whether pointer interaction drives the scene. */
  interactionEnabled: boolean;
  /** Whether idle floating animation is active. */
  idleAnimation: boolean;
  /** Whether expensive scene effects should be avoided. */
  conservativeEffects: boolean;
}

/** Crystal material configuration values (not Three.js instances). */
export interface CrystalMaterialConfig {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  metalness: number;
  roughness: number;
  transmission: number;
  thickness: number;
  ior: number;
  opacity: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
  reflectivity: number;
}
