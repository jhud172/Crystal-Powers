import { useEffect, useRef, type PropsWithChildren, type ButtonHTMLAttributes } from "react";
import { MAGNETIC_MAX_DISPLACEMENT } from "../../lib/performance/constants";

export interface MagneticButtonProps extends PropsWithChildren, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** Maximum displacement in px. */
  maxDisplacement?: number;
  /** Additional class names. */
  className?: string;
}

/**
 * Magnetic button effect for fine-pointer devices only.
 *
 * - Reduced-motion aware (no effect when reduced motion active)
 * - Bounded movement within maxDisplacement
 * - Native button semantics preserved
 * - Keyboard interaction unaffected
 * - No React state updates on every pointer event (uses refs + CSS transforms)
 * - Cleanup on unmount
 */
export function MagneticButton({
  maxDisplacement = MAGNETIC_MAX_DISPLACEMENT,
  className,
  children,
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (prefersReduced || !isFinePointer) return;

    function handlePointerMove(e: PointerEvent) {
      const rect = element!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = ((e.clientX - cx) / (rect.width / 2)) * maxDisplacement;
      const dy = ((e.clientY - cy) / (rect.height / 2)) * maxDisplacement;
      element!.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    function handlePointerLeave() {
      element!.style.transform = "";
    }

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", handlePointerLeave);
      element.style.transform = "";
    };
  }, [maxDisplacement]);

  return (
    <button ref={ref} className={`magnetic-button ${className ?? ""}`} {...rest}>
      {children}
    </button>
  );
}
