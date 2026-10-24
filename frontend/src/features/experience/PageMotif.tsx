import { useId } from "react";

type Motif = "orbit" | "layers" | "lens" | "signal";
/** Small original vector studies echo the glass gate without another canvas. */
export function PageMotif({ kind = "orbit" }: { kind?: Motif }) {
  const id = useId().replace(/:/g, "");
  return <svg className={`page-motif page-motif-${kind}`} viewBox="0 0 440 360" aria-hidden="true" focusable="false"><defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--studio-signal)" stopOpacity=".7" /><stop offset=".5" stopColor="var(--studio-accent)" stopOpacity=".04" /><stop offset="1" stopColor="var(--studio-accent)" stopOpacity=".6" /></linearGradient></defs><g fill={`url(#${id})`} stroke="currentColor" strokeWidth="1.2">{kind === "layers" ? <>{[0, 1, 2].map(layer => <path key={layer} d="M70 120Q70 100 90 94L215 47Q225 43 238 49L363 99Q386 111 364 126L239 191Q224 198 209 191L84 140Q70 134 70 120Z" transform={`translate(0 ${layer * 52})`} />)}</> : kind === "signal" ? <><circle cx="220" cy="180" r="36" /><circle cx="220" cy="180" r="84" /><circle cx="220" cy="180" r="138" /><path d="M10 180h112m196 0h112M220 18v42m0 240v42" /></> : kind === "lens" ? <><rect x="62" y="55" width="316" height="250" rx="65" /><rect x="91" y="82" width="258" height="196" rx="48" /><path d="m171 141 95 39-95 39Z" /></> : <><ellipse cx="220" cy="180" rx="165" ry="60" transform="rotate(-30 220 180)" /><ellipse cx="220" cy="180" rx="165" ry="60" transform="rotate(30 220 180)" /><path d="m220 83 62 97-62 97-62-97Z" /></>}</g></svg>;
}
