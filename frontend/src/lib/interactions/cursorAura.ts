/**
 * Cursor aura — updates `--cursor-x` and `--cursor-y` CSS custom properties
 * on `:root` as the pointer moves, powering the `body::after` gradient glow
 * and the `.site-cursor-aura` element defined in global.css.
 *
 * Active only when:
 * - The device supports fine pointer input (mouse, trackpad, stylus).
 * - The device supports hover (not touch-primary).
 * - The user has not requested reduced motion.
 *
 * Uses requestAnimationFrame to avoid setting CSS variables on every frame of
 * a fast pointer move. React state is never updated.
 */

export type CursorAuraCleanup = () => void;

/**
 * Initialise the cursor aura listener.
 *
 * @param prefersReducedMotion - When true, the aura is not activated.
 * @returns A cleanup function that removes listeners and resets CSS variables.
 */
export function initCursorAura(prefersReducedMotion: boolean): CursorAuraCleanup {
  if (typeof window === "undefined") return () => {};
  if (prefersReducedMotion) return () => {};
  if (!window.matchMedia("(pointer: fine) and (hover: hover)").matches) return () => {};

  const root = document.documentElement;
  let rafId = 0;
  let pendingX = 50;
  let pendingY = 50;
  let active = false;

  const flush = () => {
    root.style.setProperty("--cursor-x", `${pendingX.toFixed(1)}%`);
    root.style.setProperty("--cursor-y", `${pendingY.toFixed(1)}%`);
    rafId = 0;
  };

  const onPointerMove = (e: PointerEvent) => {
    // Ignore synthetic touch events that reach the document.
    if (e.pointerType === "touch") return;

    active = true;
    pendingX = (e.clientX / window.innerWidth) * 100;
    pendingY = (e.clientY / window.innerHeight) * 100;

    if (rafId === 0) {
      rafId = requestAnimationFrame(flush);
    }
  };

  const onPointerLeave = (e: PointerEvent) => {
    // Only react to the pointer leaving the document viewport.
    if (e.target !== document && e.target !== document.documentElement) return;

    active = false;

    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    // Remove the custom properties so the CSS fallback values (50% / 20%) take over,
    // preventing the aura from freezing at the last known position.
    root.style.removeProperty("--cursor-x");
    root.style.removeProperty("--cursor-y");
  };

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave, { passive: true });

  void active; // suppress unused-variable lint

  return () => {
    if (rafId !== 0) cancelAnimationFrame(rafId);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerleave", onPointerLeave);
    root.style.removeProperty("--cursor-x");
    root.style.removeProperty("--cursor-y");
  };
}
