/** Editable original material directions. Shared by the controls and 3D model;
 * no renderer dependency enters the navigation bundle through this module. */
export const brandFinishes = {
  glacier: { label: "Glacier", shell: "#91cce9", core: "#bcfff2", glow: "#367b88", metalness: .38, roughness: .2 },
  rose: { label: "Rose", shell: "#c997ae", core: "#ffe1c9", glow: "#713952", metalness: .32, roughness: .23 },
  pearl: { label: "Pearl", shell: "#dce5ef", core: "#ffffff", glow: "#4f647f", metalness: .08, roughness: .3 },
} as const;
export type BrandFinish = keyof typeof brandFinishes;
