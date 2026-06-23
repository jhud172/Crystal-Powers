# 06 - Three.js And WebGL

## Purpose

Use for the homepage crystal scene or any future WebGL work.

## Rules

- Preserve the real 3D crystal in `frontend/src/components/hero/CrystalOpenerScene.tsx`.
- React Three Fiber owns scene lifecycle.
- Use Drei only where useful.
- Lazy-load WebGL scenes with `React.lazy` and `Suspense`.
- Never put essential text inside canvas.
- Clamp DPR and use quality modes.
- Reduce particles on mobile and reduced motion.
- Disable expensive effects on weaker devices.
- Do not create objects inside `useFrame`.
- Dispose geometries, materials, and other resources.
- Avoid multiple canvases.
- Avoid global Three.js imports and avoid loading Three.js in non-3D routes.
- Use physically based materials carefully; keep bloom/refraction restrained.
- Optimise environment maps and large assets.
- Pause or reduce rendering offscreen where practical.
- Handle WebGL failure and model/load failure with a static fallback.

## Measure

- Three.js chunk size.
- Frame-rate issues.
- Canvas count.
- Memory leaks.
- Asset sizes.

## Validation

Run frontend build, inspect bundle sizes, test WebGL and fallback paths, check reduced motion, mobile, and console errors.

