/** Editable original material directions. Shared by the controls and 3D model;
 * no renderer dependency enters the navigation bundle through this module. */
export const brandFinishes = {
  glacier: { label: "Glacier", shell: "#91cce9", core: "#bcfff2", glow: "#64eaff", metalness: .38, roughness: .2 },
  rose: { label: "Rose", shell: "#c997ae", core: "#ffe1c9", glow: "#ff9ce0", metalness: .32, roughness: .23 },
  pearl: { label: "Pearl", shell: "#dce5ef", core: "#ffffff", glow: "#c7c7ff", metalness: .08, roughness: .3 },
} as const;
export type BrandFinish = keyof typeof brandFinishes;

/** Small shared configuration; rendering remains in the lazy canvas chunk. */
export const brandLighting = {
  studio: { label: "Studio", key: "#d9f5ff", rim: "#b6b1ff", position: [-3, 4, 6] as [number, number, number] },
  aurora: { label: "Aurora", key: "#72f4ea", rim: "#ad86ff", position: [4, 2, 5] as [number, number, number] },
  sunset: { label: "Sunset", key: "#ffd4a3", rim: "#e8a2d4", position: [-4, 1, 5] as [number, number, number] },
} as const;
export type BrandLighting = keyof typeof brandLighting;
export type BrandPart = "complete" | "shell" | "core";
