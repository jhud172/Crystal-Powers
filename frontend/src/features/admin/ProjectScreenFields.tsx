import { ProjectContent, ProjectImage } from "../portfolio/projectApi";
import { useId } from "react";

type Screens = NonNullable<ProjectContent["screens"]>;
export function ProjectScreenFields({ screens, images, onChange, idPrefix }: { screens: ProjectContent["screens"]; images: ProjectImage[]; onChange: (value: Screens) => void; idPrefix?: string }) {
  const generatedId = useId();
  const id = idPrefix ?? generatedId;
  function select(kind: keyof Screens, mediaId: string) {
    onChange({ desktop: screens?.desktop ?? null, mobile: screens?.mobile ?? null, [kind]: mediaId ? { mediaId, alt: screens?.[kind]?.alt ?? "" } : null });
  }
  return <section className="admin-screen-fields" aria-labelledby="screen-slots-title"><h2 id="screen-slots-title">Screens that fit the device.</h2><p>Select a wide screenshot for laptop/desktop and a separate narrow screenshot for mobile. These images stay private until the saved revision is published. Existing projects can keep using their cover.</p>
    {(["desktop", "mobile"] as const).map(kind => <div key={kind}>
      <label htmlFor={`${id}-${kind}`}>{kind === "desktop" ? "Desktop screenshot" : "Mobile screenshot"}</label><select id={`${id}-${kind}`} value={screens?.[kind]?.mediaId ?? ""} onChange={event => select(kind, event.target.value)}><option value="">No separate screenshot</option>{images.map((image, index) => <option key={image.id} value={image.id}>Image {index + 1} · {image.width} × {image.height}</option>)}</select>
      {screens?.[kind] && <><label htmlFor={`${id}-${kind}-description`}>{kind === "desktop" ? "Desktop screenshot description" : "Mobile screenshot description"}</label><input id={`${id}-${kind}-description`} value={screens[kind]!.alt} maxLength={300} aria-describedby={`${id}-${kind}-hint`} onChange={event => onChange({ desktop: screens.desktop ?? null, mobile: screens.mobile ?? null, [kind]: { ...screens[kind]!, alt: event.target.value } })} /><small id={`${id}-${kind}-hint`}>Required before publishing this screenshot. Describe the design shown on the screen.</small></>}
    </div>)}
  </section>;
}
