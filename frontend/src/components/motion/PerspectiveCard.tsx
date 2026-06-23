import { useEffect, useRef, type PropsWithChildren } from "react";
import { TILT_MAX_DEGREES } from "../../lib/performance/constants";

export interface PerspectiveCardProps extends PropsWithChildren {
  /** Maximum tilt angle in degrees. */
  tiltStrength?: number;
  /** Disable tilt effect entirely. */
  disabled?: boolean;
  /** Additional class names. */
  className?: string;
}

/**
 * Card with perspective tilt effect that uses the repaired data-tilt CSS foundation.
 *
 * - Configurable tilt strength
 * - Can be disabled
 * - Reduced-motion aware
 * - Coarse-pointer safe (no tilt on touch devices)
 * - Semantic wrapper element
 * - Does not move the clickable target away from the pointer
 */
export function PerspectiveCard({
  tiltStrength = TILT_MAX_DEGREES,
  disabled = false,
  className,
  children,
}: PerspectiveCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (prefersReduced || !isFinePointer) return;

    function handlePointerMove(e: PointerEvent) {
      const rect = element!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rotateY = ((e.clientX - cx) / (rect.width / 2)) * tiltStrength;
      const rotateX = -((e.clientY - cy) / (rect.height / 2)) * tiltStrength;
      element!.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
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
  }, [tiltStrength, disabled]);

  return (
    <div ref={ref} data-tilt className={`perspective-card ${className ?? ""}`}>
      {children}
    </div>
  );
}
