import { useEffect, useState } from "react";
import { ModelStage } from "../experience/ModelStage";
import { imageUrl, PublicProject } from "./projectApi";

export function ProjectDevicePreview({ project, preview = false, privateArea = "admin" }: { project: PublicProject; preview?: boolean; privateArea?: "admin" | "team" }) {
  const { content } = project;
  const [device, setDevice] = useState(content.displayDevice);
  useEffect(() => setDevice(content.displayDevice), [project.id, content.displayDevice]);
  const slot = device === "phone" ? content.screens?.mobile : content.screens?.desktop;
  const mediaId = slot?.mediaId ?? content.coverMediaId;
  const description = slot?.alt ?? content.coverAlt;
  // A legacy cover remains usable in its selected device; new switches need a suitable screenshot.
  const available = (kind: typeof device) => kind === content.displayDevice || (kind === "phone" ? !!content.screens?.mobile : !!content.screens?.desktop || content.displayDevice !== "phone");
  return <div className="project-device-preview">
    <div className="studio-device-tabs" role="group" aria-label="Choose project device">{(["laptop", "monitor", "phone"] as const).map(kind => <button type="button" key={kind} aria-pressed={device === kind} disabled={!available(kind)} onClick={() => setDevice(kind)}>{kind === "phone" ? "Mobile" : kind === "monitor" ? "Desktop" : "Laptop"}</button>)}</div>
    <p className="project-device-note">A real screenshot first. The interactive device view is optional.{!content.screens?.mobile && content.displayDevice !== "phone" ? " A separate mobile screenshot is not available for this project." : ""}</p>
    <ModelStage model={device} image={mediaId ? imageUrl(mediaId, preview, privateArea) : undefined} imageAlt={description || "Project preview artwork"} title="Explore this project in 3D" className="studio-device-stage" />
  </div>;
}
