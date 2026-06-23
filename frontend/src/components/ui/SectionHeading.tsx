import { createElement, type PropsWithChildren } from "react";

export interface SectionHeadingProps extends PropsWithChildren {
  /** Small text above the heading. */
  eyebrow?: string;
  /** Main heading text. If children are provided, they override this. */
  heading?: string;
  /** Supporting paragraph text below the heading. */
  supporting?: string;
  /** Text alignment. */
  align?: "left" | "center";
  /** Heading level (h1–h6). Defaults to h2. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Whether to apply reveal animation. */
  reveal?: boolean;
  /** Additional class names. */
  className?: string;
}

/**
 * Reusable section heading with eyebrow, heading, and supporting text.
 *
 * - Correct heading level (accessible)
 * - Semantic structure
 * - Alignment options
 * - Class-name extension
 * - Optional reveal behaviour via data-reveal
 */
export function SectionHeading({
  eyebrow,
  heading,
  supporting,
  align = "left",
  level = 2,
  reveal = false,
  className,
  children,
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "section-heading--center" : "";

  return (
    <div
      className={`section-heading ${alignClass} ${className ?? ""}`}
      {...(reveal ? { "data-reveal": "up" } : {})}
    >
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      {createElement(`h${level}`, { className: "section-heading__title" }, children ?? heading)}
      {supporting && (
        <p className="section-heading__supporting">{supporting}</p>
      )}
    </div>
  );
}
