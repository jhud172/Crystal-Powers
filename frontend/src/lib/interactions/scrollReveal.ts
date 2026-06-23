/**
 * Scroll reveal — IntersectionObserver-based visibility system.
 *
 * Elements matching REVEAL_SELECTORS start hidden (via CSS `body.reveal-ready`)
 * and receive the `.is-visible` class when they enter the viewport. Observing
 * stops after an element has revealed so the observer stays efficient.
 *
 * Safety rules:
 * - `body.reveal-ready` is only added once the observer is ready, so a JS
 *   load failure leaves elements visible rather than permanently hidden.
 * - Reduced motion and browsers without IntersectionObserver immediately
 *   reveal all content.
 * - Elements inside `.page-scene` (PageHero) are always pre-revealed.
 */

const REVEAL_SELECTORS = [
  "[data-reveal]",
  ".story-panel",
  ".showcase-card",
  ".project-band-card",
  ".portfolio-card",
  ".contact-preview-intro",
  ".contact-preview-card",
  ".contact-form-section",
  ".final-callout",
].join(",");

function revealElement(el: Element): void {
  el.classList.add("is-visible");
}

function revealAll(): void {
  document.querySelectorAll<Element>(REVEAL_SELECTORS).forEach(revealElement);
}

export type ScrollRevealController = {
  /** Re-scan the DOM for newly mounted reveal elements (call after route change). */
  refresh: () => void;
  /** Disconnect the observer and remove `reveal-ready` from body. */
  destroy: () => void;
};

/**
 * Initialise the scroll reveal system.
 *
 * @param prefersReducedMotion - When true, all content is revealed immediately.
 */
export function initScrollReveal(prefersReducedMotion: boolean): ScrollRevealController {
  const noop: ScrollRevealController = {
    refresh: () => {},
    destroy: () => {},
  };

  try {
    // Gate the CSS hidden state behind this class. Without it, elements are
    // always visible — which is the correct state if JS has not loaded.
    document.body.classList.add("reveal-ready");

    // PageHero elements (.page-scene [data-reveal]) are always visible via CSS.
    // After adding reveal-ready we pre-mark them so there is no hidden flash.
    document.querySelectorAll<Element>(".page-scene [data-reveal]").forEach(revealElement);

    // Reduced motion or no IO support: show everything immediately.
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      revealAll();
      return noop;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            revealElement(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -32px 0px",
      }
    );

    const observeAll = () => {
      document.querySelectorAll<Element>(REVEAL_SELECTORS).forEach((el) => {
        if (!el.classList.contains("is-visible")) {
          observer.observe(el);
        }
      });
    };

    observeAll();

    return {
      refresh: observeAll,
      destroy: () => {
        observer.disconnect();
        document.body.classList.remove("reveal-ready");
      },
    };
  } catch {
    // Safety fallback: reveal everything if initialisation throws.
    try {
      revealAll();
    } catch {
      // ignore
    }
    return noop;
  }
}
