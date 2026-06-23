export interface NoiseOverlayProps {
  /** Additional class names. */
  className?: string;
}

/**
 * Decorative noise texture overlay.
 *
 * - aria-hidden (decorative only)
 * - pointer-events disabled
 * - Low-opacity, static by default
 * - Uses CSS background-image rather than canvas
 * - Theme-aware opacity via CSS custom property
 */
export function NoiseOverlay({ className }: NoiseOverlayProps) {
  return (
    <div
      className={`noise-overlay ${className ?? ""}`}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    />
  );
}
