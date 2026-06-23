export interface CursorAuraProps {
  /** Additional class names. */
  className?: string;
  /** Whether the aura is enabled on this route. Defaults to true. */
  enabled?: boolean;
}

/**
 * Controlled mounting wrapper for the existing site-cursor-aura system.
 *
 * Does NOT create a second global pointer listener — the existing CSS
 * `.site-cursor-aura` in Layout.tsx with `--cursor-x` / `--cursor-y` custom
 * properties is the canonical implementation.
 *
 * This component provides:
 * - Controlled mounting/unmounting
 * - Semantic visual layer
 * - Class-name support
 * - Optional route-level enablement
 * - pointer-events disabled
 * - Accessibility-safe rendering (aria-hidden)
 */
export function CursorAura({ className, enabled = true }: CursorAuraProps) {
  if (!enabled) return null;

  return (
    <div
      className={`site-cursor-aura ${className ?? ""}`}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    />
  );
}
