# Advanced Experience Structure

This document describes the reusable advanced-experience component architecture created for the Crystal Powers frontend.

**Current accuracy note:** this file includes intended/reserved architecture as well as files that already exist. `components/transitions/`, `lib/animation/`, and `providers/` are reserved concepts and are not currently present in the repository.

## Directory Structure

```text
frontend/src/
├── components/
│   ├── effects/           Visual effect components (decorative layers)
│   │   ├── CursorAura.tsx
│   │   ├── NoiseOverlay.tsx
│   │   ├── PointerLight.tsx
│   │   ├── RefractionLayer.tsx
│   │   └── index.ts
│   ├── hero/              Existing crystal scene (unchanged)
│   │   └── CrystalOpenerScene.tsx
│   ├── motion/            Motion and interaction components
│   │   ├── BlurReveal.tsx
│   │   ├── MagneticButton.tsx
│   │   ├── PerspectiveCard.tsx
│   │   ├── ScrollReveal.tsx
│   │   ├── SpotlightCard.tsx
│   │   ├── StaggerGroup.tsx
│   │   └── index.ts
│   ├── three/             Three.js component wrappers
│   │   ├── CrystalFallback.tsx
│   │   └── index.ts
│   ├── transitions/       (Planned route transitions; directory not present)
│   ├── ui/                Generic UI primitives
│   │   ├── PremiumLink.tsx
│   │   ├── SectionHeading.tsx
│   │   └── index.ts
│   └── PageHero.tsx       Existing page hero component
├── features/
│   ├── contact/           Existing contact feature
│   ├── home/              Homepage section components
│   │   ├── FinalCallToAction.tsx
│   │   ├── HeroContent.tsx
│   │   ├── PortfolioShowcase.tsx
│   │   ├── ServicesReveal.tsx
│   │   ├── StudioProcess.tsx
│   │   └── index.ts
│   ├── navigation/        Navigation enhancement components
│   │   ├── MobileNavigationPanel.tsx
│   │   ├── NavigationMotion.tsx
│   │   └── index.ts
│   ├── portfolio/         Portfolio feature components and data
│   │   ├── PortfolioCard.tsx
│   │   ├── PortfolioGrid.tsx
│   │   ├── PortfolioPreview.tsx
│   │   ├── index.ts
│   │   └── portfolio.ts  (existing data)
│   └── services/          Existing services feature
├── lib/
│   ├── animation/         (Planned animation utilities; directory not present)
│   ├── performance/       Capability detection and constants
│   │   ├── capabilities.ts
│   │   └── constants.ts
│   └── three/             Three.js helpers (not importing Three.js directly)
│       ├── loaders.ts
│       ├── materials.ts
│       └── quality.ts
├── providers/             (Planned React context providers; directory not present)
├── styles/
│   ├── base/global.css    Existing base styles
│   ├── components/
│   │   ├── effects.css
│   │   ├── footer.css     (existing)
│   │   ├── motion.css
│   │   ├── navbar.css     (existing)
│   │   └── premium-cards.css
│   ├── pages/             Existing page styles
│   ├── themes/            Existing theme styles
│   ├── three/
│   │   └── crystal-scene.css
│   └── index.css          Main CSS entry point
└── types/
    ├── animation.ts
    ├── experience.ts
    └── three.ts
```

## Responsibilities

### `components/motion/`
Reusable motion and interaction components that integrate with the existing `data-reveal` / `.is-visible` CSS system. These components add JavaScript wiring (IntersectionObserver, pointer events) on top of the existing CSS foundation.

### `components/effects/`
Decorative visual layers (cursor aura, noise, pointer light, refraction). All are `aria-hidden`, `pointer-events: none`, and safe for accessibility.

### `components/ui/`
Generic UI primitives used across multiple pages (section headings, premium links). Keep these small and composable.

### `components/three/`
Three.js-related component wrappers. Currently only the fallback. The actual scene remains in `components/hero/CrystalOpenerScene.tsx` and is lazy-loaded.

### `features/home/`, `features/portfolio/`, `features/navigation/`
Feature-specific components. These are structural placeholders that will eventually extract sections from route components for better readability. They are NOT active replacements yet.

### `lib/performance/`
Device capability detection (reduced motion, pointer type, quality level) and interaction constants. Pure functions with no side effects.

### `lib/three/`
Configuration helpers for Three.js (quality presets, material configs). These do NOT import Three.js — they return plain configuration objects.

### `types/`
Shared TypeScript type definitions for animation, experience features, and Three.js configuration.

## Generic vs Feature Components

| Category | Location | Usage |
|----------|----------|-------|
| Generic (reusable everywhere) | `components/` | Any route or feature can import |
| Feature-specific | `features/{name}/` | Only used within that feature's context |
| Page-level | `routes/` | Route components that compose features and components |

## Interaction Foundation Integration

The motion components build on the existing CSS foundation:

- `[data-reveal]` selector hides content with opacity/blur/transform
- `.is-visible` class reveals content
- `@media (prefers-reduced-motion: reduce)` disables all motion
- `[data-tilt]` marks elements for perspective effects
- `.site-cursor-aura` uses `--cursor-x`/`--cursor-y` CSS custom properties

The new components provide the JavaScript wiring (IntersectionObserver, pointer event listeners) that activate this CSS system.

## Three.js Lazy-Loading Boundaries

The Three.js crystal scene is:
1. Lazy-loaded via `React.lazy()` in `routes/Home.tsx`
2. Isolated to the `crystal-scene` chunk via `vite.config.ts` manualChunks
3. Three.js vendor code is in a separate `vendor-three` chunk
4. No Three.js imports exist in the main application chunk
5. The `lib/three/` utilities do NOT import Three.js — they return plain configuration values

## Quality Preset Architecture

Five quality levels: `high`, `standard`, `mobile`, `reduced`, `fallback`

Each preset controls:
- DPR range
- Particle count
- Post-processing enabled
- Environment intensity
- Interaction enabled
- Idle animation enabled

Detection is based on: reduced-motion preference, WebGL support, pointer capability, device memory, and CPU cores.

## CSS Organisation

```text
styles/index.css (entry)
  ├── base/global.css        (design tokens, base styles, reveal system)
  ├── components/motion.css  (blur-reveal, stagger, magnetic, perspective)
  ├── components/effects.css (noise, pointer-light, refraction)
  ├── components/premium-cards.css (spotlight, section-heading, premium-link)
  ├── three/crystal-scene.css (fallback styles)
  ├── components/navbar.css  (existing)
  ├── components/footer.css  (existing)
  ├── pages/*.css            (existing page styles)
  └── themes/*/theme.css     (existing theme styles)
```

## Reduced-Motion Strategy

Every component checks `(prefers-reduced-motion: reduce)`:
- Motion components skip observer setup and immediately show content
- Pointer effects (magnetic, tilt, spotlight) are disabled entirely
- CSS provides `@media (prefers-reduced-motion: reduce)` overrides that remove transitions
- The Three.js scene reduces particles and disables floating/rotation

## Mobile Strategy

- Coarse-pointer devices skip magnetic, tilt, and spotlight effects
- CSS provides `@media (pointer: coarse)` overrides
- Quality detection assigns `mobile` level for low-memory or touch-only devices
- All content remains accessible and visible on all devices

## Component Usage Restrictions

- Do NOT import from `components/three/` in non-lazy-loaded code
- Do NOT import feature components across feature boundaries
- Do NOT create barrel exports that pull in Three.js code
- Do NOT add pointer effects that require global listeners (use element-local listeners)

## Components Deliberately Not Created

- **GSAP/Motion wrappers** — animation libraries not yet installed
- **Lenis scroll wrapper** — smooth scroll library not yet installed
- **Route transition component** — reserved concept, no directory or implementation yet
- **React context providers** — reserved concept for future state management, no directory yet
- **Additional Three.js scene components** — existing scene left untouched
- **Page-level redesign components** — homepage not redesigned

## Files Reused Instead of Duplicated

- `CrystalOpenerScene.tsx` — left in place in `components/hero/`
- `CrystalWebGLFallback` — existing component in the scene file; `CrystalFallback.tsx` mirrors its structure
- `.site-cursor-aura` CSS — reused by `CursorAura.tsx` without creating a second listener
- `data-reveal` / `.is-visible` CSS system — all motion components integrate with this
- `[data-tilt]` CSS rule — `PerspectiveCard` uses this attribute
- Existing design tokens — all new CSS uses existing CSS custom properties
