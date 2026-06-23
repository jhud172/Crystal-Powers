export interface RefractionLayerProps {
  /** Additional class names. */
  className?: string;
}

/**
 * CSS-based visual refraction foundation layer.
 *
 * - No extra WebGL canvas
 * - No shader dependency
 * - Decorative only (aria-hidden)
 * - Theme-aware via CSS custom properties
 * - Suitable for route transitions or hero surfaces later
 */
export function RefractionLayer({ className }: RefractionLayerProps) {
  return (
    <div
      className={`refraction-layer ${className ?? ""}`}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    />
  );
}
