import { useEffect, useRef, useState } from "react";
import { LiquidLightHero, defaultLiquidSettings, type LiquidSettings } from "../experience/LiquidLightHero";

export function LiquidLightDraft() {
  const [settings, setSettings] = useState<LiquidSettings>(defaultLiquidSettings);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const live = useRef(true);
  useEffect(() => { live.current = true; document.title = "Liquid Light design preview | Crystal Powers"; return () => { live.current = false; }; }, []);
  function change<T extends keyof LiquidSettings>(key: T, value: LiquidSettings[T]) { setSettings(current => ({ ...current, [key]: value })); setCopied(false); setCopyError(false); }
  return <div className="liquid-draft">
    <aside className="liquid-draft-controls" aria-label="Adjust Liquid Light"><h2>Your Liquid Light</h2><p>Development preview · the approved Clare capture is illustrative here, not a new publication.</p>
      <label htmlFor="liquid-colour">Light colour</label><select id="liquid-colour" value={settings.colour} onChange={event => change("colour", event.target.value as LiquidSettings["colour"])}><option value="coral">Coral</option><option value="cyan">Cyan</option><option value="violet">Violet</option></select>
      <label htmlFor="liquid-intensity">Light intensity · {settings.intensity}%</label><input id="liquid-intensity" type="range" min={30} max={100} value={settings.intensity} onChange={event => change("intensity", Number(event.target.value))} />
      <label htmlFor="liquid-scale">Artwork size · {settings.scale}%</label><input id="liquid-scale" type="range" min={85} max={125} value={settings.scale} onChange={event => change("scale", Number(event.target.value))} />
      <label htmlFor="liquid-duration">Opening duration · {settings.duration} ms</label><input id="liquid-duration" type="range" min={300} max={1500} step={50} value={settings.duration} onChange={event => change("duration", Number(event.target.value))} />
      <label className="liquid-draft-check"><input type="checkbox" checked={settings.reduceEffects} onChange={event => change("reduceEffects", event.target.checked)} /> Still artwork / instant reveal</label>
      <button type="button" onClick={() => { setSettings(defaultLiquidSettings); setCopied(false); setCopyError(false); }}>Reset adjustments</button><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(settings, null, 2)); if (live.current) { setCopied(true); setCopyError(false); } } catch { if (live.current) setCopyError(true); } }}>Copy settings</button>
      <p role="status">{copied ? "Settings copied." : copyError ? "Clipboard unavailable. Copy the settings below." : "Use Explore the work to open the light. Escape closes it."}</p><pre tabIndex={0}>{JSON.stringify(settings, null, 2)}</pre>
    </aside>
    <LiquidLightHero settings={settings} previewProject={{ title: "Clare’s Life Celebrations", image: "/design/approved-clare.jpg", href: "/portfolio" }} />
  </div>;
}
