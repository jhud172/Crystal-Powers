import { useState } from "react";

type Props = { alt: string; priority?: boolean; onUnavailable?: () => void };
/** Bit-exact WebP delivery with an original-PNG retry; no content depends on this image. */
export function LiquidLightArtwork({ alt, priority = false, onUnavailable }: Props) {
  const [png,setPng]=useState(false),[unavailable,setUnavailable]=useState(false);
  if(unavailable)return alt ? <span className="liquid-art-unavailable" role="img" aria-label={alt}>Artwork unavailable</span> : null;
  return <img src={png ? "/renders/liquid-light/hero.png" : "/renders/liquid-light/hero.webp"} alt={alt} width={1536} height={1024} loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : "auto"} onError={()=>{if(!png)setPng(true);else{setUnavailable(true);onUnavailable?.();}}}/>;
}
