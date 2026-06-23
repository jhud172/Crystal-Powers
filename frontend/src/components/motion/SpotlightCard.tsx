import { useEffect, useRef, type PropsWithChildren } from "react";

export interface SpotlightCardProps extends PropsWithChildren {
  /** Additional class names. */
  className?: string;
}

/**
 * Card with a local pointer-position spotlight effect via CSS custom properties.
 *
 * - Theme-aware (uses CSS variables for gradient colors)
 * - Keyboard-focus visual equivalent provided via CSS
 * - Reduced-motion safe (effect is purely visual, no movement)
 * - No global pointer listener (only listens on the card element)
 * - No rerender on every pointer movement (uses refs + CSS custom properties)
 */
export function SpotlightCard({ className, children }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return;

    function handlePointerMove(e: PointerEvent) {
      const rect = element!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      element!.style.setProperty("--spotlight-x", `${x}px`);
      element!.style.setProperty("--spotlight-y", `${y}px`);
    }

    function handlePointerLeave() {
      element!.style.removeProperty("--spotlight-x");
      element!.style.removeProperty("--spotlight-y");
    }

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div ref={ref} className={`spotlight-card ${className ?? ""}`}>
      {children}
    </div>
  );
}
