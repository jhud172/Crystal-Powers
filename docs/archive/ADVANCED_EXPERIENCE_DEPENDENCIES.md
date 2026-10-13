# Advanced Experience Dependencies

This note records the actual dependency state checked during the Codex reconciliation pass. It is not a request to install or remove packages.

## Frontend Runtime

The frontend lives in `frontend/` and is built with React, Vite, TypeScript, Tailwind CSS and the Three.js stack used by the homepage hero.

`frontend/package.json` currently includes:

- `react`
- `react-dom`
- `react-router-dom`
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `gsap`
- `@gsap/react`
- `motion`
- Tailwind and Vite tooling

The following animation or post-processing packages are intentionally not direct dependencies and are not configured or imported by project code:

- `framer-motion`
- `lenis`
- `@react-three/postprocessing`
- `postprocessing`

Note: `motion@12.40.0` declares `framer-motion` as a transitive dependency, so `frontend/package-lock.json` contains a `framer-motion` package entry. Do not import from `framer-motion` or add it as a direct dependency unless a future task explicitly changes that decision.

## Current Implications

- GSAP and ScrollTrigger are registered once through `frontend/src/lib/animation/gsap.ts`.
- Motion has restrained shared variants in `frontend/src/lib/animation/motion.ts`.
- Lenis smooth scrolling is not present.
- Three.js remains isolated to the hero scene and Vite manual chunks rather than imported through a global frontend barrel.
- Advanced-experience components may exist without all optional animation libraries being installed.

## Rules For Future Work

- Do not install additional animation or post-processing packages without an explicit task that justifies them.
- Preserve lazy loading for WebGL scenes.
- Do not import Three.js through generic component or feature barrels.
- Compare bundle output before and after any change that touches the Three.js scene, Vite chunking, animation libraries or global providers.
