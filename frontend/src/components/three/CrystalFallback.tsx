/**
 * Non-WebGL fallback for the crystal scene.
 *
 * Reuses the existing CSS-based fallback structure from the homepage.
 * Does not create a second visually conflicting fallback.
 */
export function CrystalFallback() {
  return (
    <div className="crystal-webgl-fallback" aria-hidden="true">
      <span className="crystal-webgl-fallback-core" />
      <span className="crystal-webgl-fallback-ring crystal-webgl-fallback-ring-a" />
      <span className="crystal-webgl-fallback-ring crystal-webgl-fallback-ring-b" />
    </div>
  );
}
