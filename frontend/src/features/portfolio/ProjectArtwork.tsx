import { useState } from "react";

type Props = { src?: string; alt: string; loading?: "eager" | "lazy"; fetchPriority?: "high" | "low" | "auto"; retry?: boolean };

/** Replacing the source resets failure state without retaining a previous project's image. */
export function ProjectArtwork(props: Props) {
  return <Artwork key={props.src ?? "missing"} {...props} />;
}
function Artwork({ src, alt, loading = "lazy", fetchPriority = "auto", retry = false }: Props) {
  const [failed,setFailed]=useState(false),[hadFailure,setHadFailure]=useState(false),[attempt,setAttempt]=useState(0),[pending,setPending]=useState(!!src);
  const fallback=<div className="project-artwork-fallback"><p>{failed ? "This preview couldn’t load." : "A preview is not available."}</p><p>Project details remain available.</p></div>;
  const visual=!src || failed ? fallback : <img key={attempt} src={src} alt={alt} loading={loading} fetchPriority={fetchPriority} decoding="async" onLoad={()=>{if(retry)setPending(false);}} onError={()=>{setFailed(true);if(retry){setHadFailure(true);setPending(false);}}}/>;
  // Link/button thumbnails keep non-interactive fallbacks; only standalone previews opt in.
  if(!retry || !src)return visual;
  return <div className="project-artwork-retry"><div aria-busy={pending}>{visual}</div>
    {hadFailure && <><button type="button" className="project-artwork-retry-button" aria-disabled={pending} onClick={()=>{if(pending)return;setAttempt(value=>value+1);setFailed(false);setPending(true);}}>Reload preview</button><p role="status" className="project-artwork-status">{pending ? "Loading preview…" : failed ? "Preview unavailable. Reload it or follow the project link." : "Preview loaded."}</p></>}
  </div>;
}
