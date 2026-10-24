# 04 - UI Design System

## Purpose

Use for visual, layout, component styling, and design polish work.

## Direction

Crystal Powers should feel premium, modern, precise, technically capable, polished, restrained, confident, and consistent.

## Rules

- Use consistent spacing, typography hierarchy, border radii, shadows, and surface hierarchy.
- Reuse button variants, card variants, and section-heading patterns where possible.
- Keep focus states strong and visible.
- Use existing design tokens and theme variables.
- Do not add random effects, cheap neon overload, excessive glassmorphism, arbitrary one-off colours, inconsistent page widths, or hierarchy that relies only on colour.

## Every Design Change Must Answer

1. What hierarchy does this improve?
2. What interaction does this clarify?
3. What user action does this support?
4. What existing design token does it use?
5. How does it behave on mobile?
6. How does it behave under reduced motion?

## Validation

Check affected routes at mobile and desktop sizes, all themes if theme variables changed, focus states, and reduced-motion behaviour.


## Typography safety

James requires visible space between letters on every device. Do not use negative letter spacing, negative word spacing or line heights below1.2 for headings. Allow text to wrap or scale instead of compressing it. Keep wordmark/heading margins authoritative over shared element resets; verify glyph separation and adjacent text at compact/intermediate/wide widths and enlarged text.


## Whole-site continuation rule

James explicitly requires the homepage's optical/Liquid Light direction to extend to every public page and private workflow. Use the page-by-page matrix at the top of `../FRONTEND_DESIGN_GOAL_2_0.md`; include nested states and record implementation separately from browser/device/release acceptance. Preserve distinct compositions rather than cloning a homepage model into every screen.

Reading text, messages, form values, addresses and public project images keep normal selection/browser controls. Decorative logos/backgrounds/model hit surfaces avoid accidental selection and dragging. Do not blanket-block context menus or shortcuts. Explicit copy actions must announce success and offer readable manual text on clipboard denial; private secrets/invitations retain their specialised guarded flows.

Implement related features as one batch, then run the noted checks. Correct concrete failures in a batch and rerun the affected checks. Never transform an ancestor of viewport-fixed artwork: use opacity-only arrivals there. Reuse shared experience visibility/reduced-motion state instead of adding duplicate subscriptions.
