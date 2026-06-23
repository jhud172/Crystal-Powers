import { Link } from "react-router-dom";
import type { PropsWithChildren } from "react";

export interface PremiumLinkProps extends PropsWithChildren {
  /** URL or path. External links open in a new tab. */
  href: string;
  /** Visual variant. */
  variant?: "primary" | "secondary";
  /** Show an arrow indicator. */
  arrow?: boolean;
  /** Additional class names. */
  className?: string;
}

/**
 * Premium link component supporting internal React Router links and external links.
 *
 * - No invalid nested interactive elements
 * - Visible keyboard focus
 * - Reduced-motion-aware hover (via CSS)
 * - Primary and secondary variants
 * - Optional arrow indicator
 */
export function PremiumLink({
  href,
  variant = "primary",
  arrow = false,
  className,
  children,
}: PremiumLinkProps) {
  const isExternal = href.startsWith("http") || href.startsWith("//");
  const variantClass = variant === "primary" ? "premium-link--primary" : "premium-link--secondary";
  const classes = `premium-link ${variantClass} ${className ?? ""}`;

  const content = (
    <>
      <span className="premium-link__label">{children}</span>
      {arrow && <span className="premium-link__arrow" aria-hidden="true">→</span>}
    </>
  );

  if (isExternal) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link to={href} className={classes}>
      {content}
    </Link>
  );
}
