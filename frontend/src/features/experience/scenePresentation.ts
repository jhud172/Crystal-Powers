import type { ModelKind } from "./ModelStage";

/** A shared photographic frame keeps still artwork and live scenes at the same scale. */
export function scenePresentation(model: ModelKind) {
  // Blender's 4.7-unit orthographic scale is the 1600px horizontal frame.
  // Match its 3.525-unit vertical frame so activation doesn't shrink the prism.
  if (model === "prism-gate") return { position: [0, 0, 9] as [number, number, number], fov: 2 * Math.atan(3.525 / 18) * 180 / Math.PI, posterWidth: 1600, posterHeight: 1200 };
  if (model === "phone") return { position: [2.2, 1.6, 5.4] as [number, number, number], fov: 30, posterWidth: 1600, posterHeight: 1120 };
  return model === "observatory"
    ? { position: [3.6, 2.55, 9] as [number, number, number], fov: 30, posterWidth: 1600, posterHeight: 1000 }
    : { position: [3.6, 2.5, 7.5] as [number, number, number], fov: 34, posterWidth: 1600, posterHeight: model === "crystal" ? 1000 : 1120 };
}

export function containedSceneFov(fov: number, posterAspect: number, stageAspect: number) {
  return 2 * Math.atan(Math.tan(fov * Math.PI / 360) * Math.max(1, posterAspect / stageAspect)) * 180 / Math.PI;
}

export function livePoster(model: ModelKind, light: boolean, open = false) {
  return `/renders/live/${model}-${light ? "light" : "dark"}${model === "observatory" && open ? "-open" : ""}`;
}
