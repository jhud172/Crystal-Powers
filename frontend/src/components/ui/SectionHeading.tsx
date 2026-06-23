import type { PropsWithChildren } from "react";

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
  const HeadingTag = `h${level}` as const;

  return (
    <div
      className={`section-heading ${alignClass} ${className ?? ""}`}
      {...(reveal ? { "data-reveal": "up" } : {})}
    >
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      {HeadingTag === "h1" && <h1 className="section-heading__title">{children ?? heading}</h1>}
      {HeadingTag === "h2" && <h2 className="section-heading__title">{children ?? heading}</h2>}
      {HeadingTag === "h3" && <h3 className="section-heading__title">{children ?? heading}</h3>}
      {HeadingTag === "h4" && <h4 className="section-heading__title">{children ?? heading}</h4>}
      {HeadingTag === "h5" && <h5 className="section-heading__title">{children ?? heading}</h5>}
      {HeadingTag === "h6" && <h6 className="section-heading__title">{children ?? heading}</h6>}
      {supporting && (
        <p className="section-heading__supporting">{supporting}</p>
      )}
    </div>
  );
}
