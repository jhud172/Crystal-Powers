/**
 * Pointer tilt — applies a subtle 3-D perspective tilt to elements marked
 * with `[data-tilt]` as the pointer moves over them.
 *
 * Active only when:
 * - The device supports fine pointer input (not touch or coarse).
 * - The user has not requested reduced motion.
 *
 * Transform is applied via inline `style.transform` (highest specificity) so
 * it correctly layers over the reveal state set by scrollReveal. Inline styles
 * are cleared after the reset transition so CSS retakes control cleanly.
 *
 * Configuration via data attributes (all optional):
 *   data-tilt-max="5"    Maximum rotation in degrees (default: 5).
 *   data-tilt-scale="1.02" Scale factor at peak tilt (default: 1.02).
 *
 * React state is never updated. All transforms use requestAnimationFrame.
 */

const TILT_SELECTOR = "[data-tilt]";
const DEFAULT_MAX_DEG = 5;
const DEFAULT_SCALE = 1.02;
const RESET_MS = 500;

function parseDataAttr(el: HTMLElement, key: string, fallback: number): number {
  const raw = (el.dataset as Record<string, string | undefined>)[key];
  if (raw === undefined) return fallback;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function attachTilt(el: HTMLElement): () => void {
  const maxDeg = parseDataAttr(el, "tiltMax", DEFAULT_MAX_DEG);
  const scale = parseDataAttr(el, "tiltScale", DEFAULT_SCALE);

  let rafId = 0;
  let resetTimer = 0;
  let pendingX = 0;
  let pendingY = 0;

  const applyTilt = () => {
    el.style.transition = "transform 80ms linear";
    el.style.transform = `perspective(900px) rotateX(${pendingY}deg) rotateY(${pendingX}deg) scale(${scale})`;
    rafId = 0;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;

    clearTimeout(resetTimer);

    const rect = el.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    pendingX = normX * maxDeg;
    pendingY = -normY * maxDeg;

    if (rafId === 0) {
      rafId = requestAnimationFrame(applyTilt);
    }
  };

  const onPointerLeave = () => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    el.style.transition = `transform ${RESET_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)";

    resetTimer = window.setTimeout(() => {
      el.style.transform = "";
      el.style.transition = "";
    }, RESET_MS + 60);
  };

  const onPointerEnter = () => {
    clearTimeout(resetTimer);
    // Clear any in-progress reset so the transition starts from the
    // current position rather than snapping.
    if (el.style.transition.includes(`${RESET_MS}ms`)) {
      el.style.transition = "transform 80ms linear";
    }
  };

  el.addEventListener("pointermove", onPointerMove, { passive: true });
  el.addEventListener("pointerleave", onPointerLeave, { passive: true });
  el.addEventListener("pointerenter", onPointerEnter, { passive: true });

  return () => {
    clearTimeout(resetTimer);
    if (rafId !== 0) cancelAnimationFrame(rafId);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerleave", onPointerLeave);
    el.removeEventListener("pointerenter", onPointerEnter);
    el.style.transform = "";
    el.style.transition = "";
  };
}

export type TiltCleanup = () => void;

/**
 * Initialise tilt on all current and future `[data-tilt]` elements.
 *
 * A MutationObserver watches for newly mounted elements (e.g. after route
 * changes) so tilt is applied without re-calling this function.
 *
 * @param prefersReducedMotion - When true, tilt is not activated.
 * @returns A cleanup function that removes all listeners and the observer.
 */
export function initTilt(prefersReducedMotion: boolean): TiltCleanup {
  if (typeof window === "undefined") return () => {};
  if (prefersReducedMotion) return () => {};
  if (!window.matchMedia("(pointer: fine)").matches) return () => {};

  const cleanups: (() => void)[] = [];
  const initialized = new WeakSet<Element>();

  const attachToElement = (el: HTMLElement) => {
    if (initialized.has(el)) return;
    initialized.add(el);
    cleanups.push(attachTilt(el));
  };

  document.querySelectorAll<HTMLElement>(TILT_SELECTOR).forEach(attachToElement);

  const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches(TILT_SELECTOR)) attachToElement(node);
        node.querySelectorAll<HTMLElement>(TILT_SELECTOR).forEach(attachToElement);
      }
    }
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });

  return () => {
    mutationObserver.disconnect();
    cleanups.forEach((fn) => fn());
  };
}
