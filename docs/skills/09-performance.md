# 09 - Performance

## Purpose

Use for frontend changes that affect bundles, media, rendering, animations, or runtime work.

## Rules

- Prefer route-level code splitting and lazy loading for heavy features.
- Optimise images and use responsive sizing.
- Avoid unnecessary rerenders.
- Avoid pointer state in React.
- Avoid permanent observers when lifecycle cleanup is possible.
- Avoid large main-bundle growth.
- Avoid duplicate dependencies and overlapping animation libraries.
- Stop or reduce animations offscreen.
- Avoid large uncompressed media.
- Do not load 3D on unrelated routes.
- Measure build output and document accepted warnings.

## Validation

For significant frontend changes, compare before/after bundle sizes from `npm run build`. Report large chunks and explain accepted warnings.

