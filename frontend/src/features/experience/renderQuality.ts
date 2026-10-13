export type RenderTier = "low" | "standard" | "high";
export type RenderQuality = "automatic" | RenderTier;

export function isRenderQuality(value: unknown): value is RenderQuality {
  return value === "automatic" || value === "low" || value === "standard" || value === "high";
}

/** Automatic is a conservative layout policy, not a claim to identify a device's GPU. */
export function resolveRenderTier(preference: RenderQuality, stageWidth: number): RenderTier {
  return preference === "automatic" ? stageWidth <= 480 ? "low" : "standard" : preference;
}

export const renderProfiles = {
  low: { maxDpr: 1, environmentResolution: 128, sphereSegments: 16, transmissionScale: .25, transmission: false, rimLight: false },
  standard: { maxDpr: 1.5, environmentResolution: 256, sphereSegments: 32, transmissionScale: .5, transmission: true, rimLight: true },
  high: { maxDpr: 2, environmentResolution: 512, sphereSegments: 48, transmissionScale: 1, transmission: true, rimLight: true },
} as const;
