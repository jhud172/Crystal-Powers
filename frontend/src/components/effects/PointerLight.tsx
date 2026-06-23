import { useEffect, useRef } from "react";

export interface PointerLightProps {
  /** Additional class names. */
  className?: string;
}

/**
 * Local pointer-driven light effect for cards or panels.
 *
 * - Uses CSS custom properties (--pointer-light-x, --pointer-light-y)
 * - No React rerender per pointer movement
 * - Reduced-motion and pointer-capability awareness
 * - Keyboard focus provides centered fallback position
 */
export function PointerLight({ className }: PointerLightProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (prefersReduced || !isFinePointer) return;

    const parent = element.parentElement;
    if (!parent) return;

    function handlePointerMove(e: PointerEvent) {
      const rect = parent!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      element!.style.setProperty("--pointer-light-x", `${x}%`);
      element!.style.setProperty("--pointer-light-y", `${y}%`);
    }

    function handlePointerLeave() {
      element!.style.setProperty("--pointer-light-x", "50%");
      element!.style.setProperty("--pointer-light-y", "50%");
    }

    parent.addEventListener("pointermove", handlePointerMove);
    parent.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      parent.removeEventListener("pointermove", handlePointerMove);
      parent.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`pointer-light ${className ?? ""}`}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    />
  );
}
