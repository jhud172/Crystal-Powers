import { useState } from "react";
import type { ModelKind } from "./ModelStage";
import { livePoster, scenePresentation } from "./scenePresentation";

/** Still views are photographs of ModelCanvas; retained Blender photos cover an asset outage. */
export function ScenePoster({ model, light, open = false, alt, className, sizes, eager = false }: {
  model: ModelKind; light: boolean; open?: boolean; alt: string; className?: string; sizes: string; eager?: boolean;
}) {
  const path = livePoster(model, light, open);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const legacy = failedPath === path;
  const source = legacy ? path.replace("/renders/live/", "/renders/") : path;
  const view = scenePresentation(model);
  return <picture className={className} data-poster-source={legacy ? "retained" : "live"}>
    <source type="image/webp" srcSet={`${source}-800.webp 800w, ${source}.webp 1600w`} sizes={sizes} />
    <img src={`${source}.png`} alt={alt} width={view.posterWidth} height={view.posterHeight} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} draggable={false} onError={() => { if (!legacy) setFailedPath(path); }} />
  </picture>;
}
