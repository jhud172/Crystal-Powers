/** Named authored clips are stable contracts, independent of GLB array order. */
export const modelAnimationNames = {
  crystal: "CrystalTurn",
  laptop: "LaptopOpen",
  observatory: "CrystalOpen",
} as const;

export const openingAnimationNames = { open: "CrystalOpen", close: "CrystalClose" } as const;

export function selectAnimationName(names: readonly string[], expected: string, allowLegacy = false): string {
  if (names.includes(expected)) return expected;
  // Older device exports contained one clip with exporter-generated naming.
  if (allowLegacy && names.length === 1) return names[0];
  throw new Error(`Missing authored animation ${expected}; refusing an ambiguous clip selection.`);
}
