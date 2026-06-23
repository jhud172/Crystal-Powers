# 08 - Accessibility

## Purpose

Use for all UI, interaction, form, navigation, and content changes.

## Rules

- Use semantic HTML and a coherent heading hierarchy.
- Preserve keyboard navigation, focus order, visible focus, and Escape behaviour.
- Trap focus only in true modals, and release it safely.
- Use form labels and field-level error messages.
- Use ARIA only where necessary.
- Mark decorative effects `aria-hidden`.
- Avoid duplicate screen-reader text.
- Maintain sufficient contrast.
- Respect reduced motion.
- Provide meaningful alt text for informative images.
- Do not put essential content inside canvas.
- Do not rely on hover-only states.
- Avoid keyboard traps.
- Route transitions must not trap focus.
- Split text must remain screen-reader friendly.

## Validation

Before finalising, check keyboard flow, focus states, labels/errors, reduced motion, and content visibility without animation.

