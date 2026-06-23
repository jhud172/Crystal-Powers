import { Children, type PropsWithChildren } from "react";
import { STAGGER_INCREMENT } from "../../lib/performance/constants";

export interface StaggerGroupProps extends PropsWithChildren {
  /** Base delay in ms before the first item. */
  baseDelay?: number;
  /** Delay increment in ms between each child. */
  increment?: number;
  /** Additional class names. */
  className?: string;
}

/**
 * Provides stagger timing through CSS custom properties on each child wrapper.
 *
 * Works with arbitrary children. Does not mutate children.
 * Reduced motion is handled by CSS (transitions are disabled).
 * No animation library required.
 */
export function StaggerGroup({
  baseDelay = 0,
  increment = STAGGER_INCREMENT,
  className,
  children,
}: StaggerGroupProps) {
  return (
    <div className={`stagger-group ${className ?? ""}`}>
      {Children.map(children, (child, index) => (
        <div
          className="stagger-group__item"
          style={{ "--stagger-delay": `${baseDelay + index * increment}ms` } as React.CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
