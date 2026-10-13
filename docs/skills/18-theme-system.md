# 18 - Theme System

## Purpose

Use for theme picker, CSS variables, theme styles, theme-aware assets, and visual changes across themes.

## Current Structure

- Theme data: `frontend/src/data/site.ts`.
- Theme state: `frontend/src/app/Layout.tsx`.
- Active semantic theme CSS: `frontend/src/styles/base/studio-tokens.css`; route composition in `styles/pages/`. Unused earlier `styles/themes/*/theme.css` files were removed after import tracing; all five appearance IDs/cookies/assets remain supported.
- Active theme: `body[data-theme]`.
- Cookie: `crystal_theme`.

## Rules

- Preserve existing themes.
- Use existing tokens; avoid hard-coded component colours.
- Keep WebGL materials and fallbacks theme-aware where changes require it.
- Avoid flash of wrong theme.
- Persist current selection.
- Preserve reduced-motion compatibility.
- Avoid unnecessary canvas rerenders on theme change.

## Validation

Test key routes in every theme after theme-related changes.
