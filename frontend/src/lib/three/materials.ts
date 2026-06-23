import type { CrystalMaterialConfig } from "../../types/three";

/** Default crystal material configuration values. */
export const crystalMaterialConfig: CrystalMaterialConfig = {
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

/** Create a variant of the crystal material configuration with overrides. */
export function createCrystalMaterialConfig(
  overrides?: Partial<CrystalMaterialConfig>
): CrystalMaterialConfig {
  return { ...crystalMaterialConfig, ...overrides };
}
