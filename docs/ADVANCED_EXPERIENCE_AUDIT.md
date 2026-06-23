# Advanced Experience Audit — Crystal Powers

**Audit date:** 2026-06-22  
**Auditor:** Copilot Task Agent  
**Purpose:** Pre-flight review before any advanced animation or visual enhancement work. No visual redesign was performed.

**Current accuracy note:** this is a historical audit. Later work added the interaction foundation, hooks, reusable advanced-experience components, route-aware reveal refresh, cursor aura, tilt, reduced-motion handling, and removed the old `body.is-overdrive` / `.site-secret-node` systems. Treat this file as project history and verify current state against `docs/INTERACTION_FOUNDATION.md`, `docs/CODEX_SESSION_HANDOVER.md`, and the code before acting on any finding.

---

## Table of Contents

1. [Current Frontend Architecture](#1-current-frontend-architecture)
2. [Current Dependency List](#2-current-dependency-list)
3. [Current Hero Implementation](#3-current-hero-implementation)
4. [Reusable Systems](#4-reusable-systems)
5. [Technical Debt](#5-technical-debt)
6. [Files That Can Be Reused](#6-files-that-can-be-reused)
7. [Files Likely to Be Removed Later](#7-files-likely-to-be-removed-later)
8. [Recommended Animation Stack](#8-recommended-animation-stack)
9. [Proposed Folder Structure](#9-proposed-folder-structure)
10. [Performance Risks](#10-performance-risks)
11. [Accessibility Risks](#11-accessibility-risks)
12. [Mobile Risks](#12-mobile-risks)
13. [Implementation Order](#13-implementation-order)
14. [Audit Results](#14-audit-results)

---

## 1. Current Frontend Architecture

Crystal Powers is a React SPA served by a Spring Boot backend. Gradle orchestrates the full build: it runs `npm run build` inside `frontend/`, then copies `frontend/dist/` into the Spring Boot static resources directory for production serving.

```
Crystal-Powers/
├── frontend/          React + Vite + TypeScript + Tailwind source
│   ├── index.html     Vite HTML shell (Google Fonts, meta, favicon)
│   ├── src/
│   │   ├── main.tsx                     React entry point, BrowserRouter
│   │   ├── app/
│   │   │   ├── App.tsx                  Route table (8 routes + legacy redirect)
│   │   │   └── Layout.tsx               Header, mobile nav, footer, ThemePicker
│   │   ├── components/
│   │   │   ├── PageHero.tsx             Shared hero for all interior pages
│   │   │   └── hero/
│   │   │       └── CrystalOpenerScene.tsx  Three.js diamond (homepage only)
│   │   ├── data/
│   │   │   └── site.ts                  Nav items, theme definitions
│   │   ├── features/
│   │   │   ├── contact/FormFields.tsx   Shared form field components
│   │   │   ├── portfolio/portfolio.ts   Portfolio data
│   │   │   └── services/services.ts     Package, addon, and maintenance data
│   │   ├── routes/                      One file per public page
│   │   └── styles/
│   │       ├── index.css                Root: imports all CSS, smooth scroll
│   │       ├── base/global.css          Design tokens, component classes (~900 lines)
│   │       ├── components/
│   │       │   ├── navbar.css           Header + mobile nav styles and keyframes
│   │       │   └── footer.css           Footer styles
│   │       ├── pages/                   Per-page CSS (home, about, services, etc.)
│   │       └── themes/                  Per-theme CSS variable overrides
│   ├── tailwind.config.ts
│   └── vite.config.ts                   Manual chunk splitting for three/react/scene
├── src/               Spring Boot backend (untouched by this audit)
└── docs/              Project documentation
```

### Entry path

`main.tsx` → `BrowserRouter` → `App.tsx` (route table) → `Layout.tsx` (persistent shell) → route components

### Theme system

Five themes are defined in `data/site.ts`: **futuristic** (default), **classic**, **clean**, **fresh**, **summer-vibes**. The active theme is stored in a `crystal_theme` cookie, written to `body[data-theme]`, and propagated via CSS custom properties defined in `base/global.css` and individual `themes/*/theme.css` override files. Theme transitions are applied to a long list of components in `global.css` via a single 420 ms transition block.

---

## 2. Current Dependency List

### Runtime dependencies (`frontend/package.json`)

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.0.0 | UI framework |
| `react-dom` | ^19.0.0 | DOM renderer |
| `react-router-dom` | ^7.1.1 | Client-side routing |
| `three` | ^0.184.0 | 3D engine |
| `@react-three/fiber` | ^9.6.1 | React renderer for Three.js |
| `@react-three/drei` | ^10.7.7 | Three.js helpers (Float, Sparkles, ContactShadows, PerspectiveCamera) |
| `typescript` | ^5.7.2 | Type checking |
| `vite` | ^6.0.7 | Build tool and dev server |
| `@vitejs/plugin-react` | ^4.3.4 | Vite React plugin |

### Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| `@types/react` | ^19.2.16 | React types |
| `@types/react-dom` | ^19.2.3 | ReactDOM types |
| `@types/three` | ^0.184.1 | Three.js types |
| `tailwindcss` | ^3.4.17 | Utility CSS |
| `autoprefixer` | ^10.4.20 | CSS vendor prefixes |
| `postcss` | ^8.4.49 | CSS processing |

### Notable absences

- **No Framer Motion** — all non-3D animation is handwritten CSS
- **No GSAP** — no scroll-driven timeline library present
- **No Lottie** — no JSON animation player
- **No React Spring** — no spring physics library
- **No dedicated scroll observer library** — `IntersectionObserver` is not used anywhere in the React source

### Google Fonts loaded in `index.html`

Cormorant Garamond, Fraunces, Manrope, Sora, Space Grotesk (weights 400–700). All five are loaded unconditionally regardless of active theme.

---

## 3. Current Hero Implementation

### Homepage hero (`routes/Home.tsx`)

The homepage uses a full-bleed `<section class="home-webgl-hero">` that is not shared with any other route. It contains:

1. **CSS backdrop layer** — a background space image (`BackgroundSpaceImage.png`) overlaid with aurora blobs, a perspective grid, and a noise texture, all animated via CSS keyframes.
2. **Copy column** — brand name, H1 title, body paragraph, two CTA buttons, and a status row.
3. **3D visual column** — `CrystalOpenerScene` (lazy loaded via `React.lazy` + `Suspense`).
4. **Proof cards grid** — four info cards below the fold.

### CrystalOpenerScene (`components/hero/CrystalOpenerScene.tsx`)

This is the only Three.js component in the project. It renders a real WebGL diamond via `@react-three/fiber` on a transparent `<Canvas>`.

**Diamond geometry:** Procedurally generated `BufferGeometry` from three rings (table: 8 points, crown: 12 points, pavilion: 12 points) plus a culet vertex. Each face is hand-coloured from an 8-colour palette.

**Material:** `meshPhysicalMaterial` with:
- `transmission: 0.72`, `ior: 2.42` — glass-like refraction
- `clearcoat: 1`, `clearcoatRoughness: 0.02` — high-gloss coating
- `opacity: 0.86`, `flatShading: true`, vertex colours enabled
- `emissive: #0ea5e9`, `emissiveIntensity: 0.22`

**Supporting elements:** Three torus orbit rings (`OrbitRings`), `Sparkles` particles, `ContactShadows`, `Float` for idle bounce, five coloured point/directional lights, scene fog, `PerspectiveCamera`.

**Pointer tracking:** `useThree().pointer` feeds mouse position into the diamond's Y and X rotation via `THREE.MathUtils.lerp` inside `useFrame`.

**Reduced-motion:** `usePrefersReducedMotion()` hook (local to the file) reacts to `matchMedia("(prefers-reduced-motion: reduce)")` changes. When active: Float is stopped, sparkle count drops from 42 to 18, orbital rings stop, diamond movement is scaled to 18% of normal.

**WebGL detection:** `browserSupportsWebGL()` checks for `webgl2` or `webgl` context on a temporary canvas at mount time. Non-WebGL devices receive `CrystalWebGLFallback` — a CSS-only version with a clip-path diamond and two torus rings.

**Lazy loading:** `Home.tsx` uses `React.lazy` + `Suspense`. The Suspense fallback is `CrystalOpenerStaticFallback`, a DOM-only placeholder matching the visual footprint of the scene. Vite splits the scene into its own chunk (`crystal-scene`).

### Interior page hero (`components/PageHero.tsx`)

All non-home pages use the shared `PageHero` component. It renders a `.page-scene.page-scene-secondary` section with:
- eyebrow text + signal pill
- H1 title, body paragraph, optional action buttons
- Optional `visual` slot (used by About for a DOM orbit shell)

This component contains no animation logic of its own. Its `data-reveal="up"` attribute on the copy block is visible immediately because `.page-scene [data-reveal]` is always revealed in CSS (no `.is-visible` class required).

---

## 4. Reusable Systems

### CSS component classes (global.css)

| Class | Purpose |
|---|---|
| `.primary-button` | Filled pill CTA, theme-aware, hover lift |
| `.secondary-button` | Bordered pill CTA, theme-aware, hover lift |
| `.eyebrow` | Small uppercase label badge |
| `.section-card` | Rounded frosted-glass card |
| `.pricing-card` | Pricing tier card with hover lift |
| `.addon-card` | Add-on service card with hover lift |
| `.scene-signal-pill` | Secondary label next to eyebrow |
| `.section-divider` | Themed horizontal line separator |
| `.premium-message` | Inline status/error/success banner |

### CSS reveal system (`[data-reveal]`)

Elements with `data-reveal` (values: `up`, `left`) start invisible with blur and translate. They reveal when `.is-visible` is added. Elements inside `.page-scene` are pre-revealed via the CSS selector `.page-scene [data-reveal]`. **No JavaScript currently adds `.is-visible` to any other element** — scroll-triggered reveals are non-functional on most pages.

### Theme system

`Layout.tsx` owns theme state. `ThemePicker` is a self-contained dropdown component inside `Layout.tsx`. Theme is persisted to a cookie with a 1-year TTL. `body[data-theme]` drives all CSS variable overrides. The 5-theme system is fully operational.

### Mobile navigation

`Layout.tsx` controls `isMenuOpen` state. The mobile nav panel (`#mobile-nav-panel`) uses `data-open` and `aria-hidden` attributes toggled by React state. CSS handles the open/close animation (`max-height`, `opacity`, `transform`, `visibility`). The panel closes on route change via `useEffect([location.pathname])`.

### Reusable React components

| File | Reusable for |
|---|---|
| `components/PageHero.tsx` | Any interior page hero section |
| `features/contact/FormFields.tsx` | Contact form fields (used by both Contact and Services pages) |
| `data/site.ts` | Nav items, theme definitions, theme ID type |

### Custom hooks

| Hook | Location | Purpose |
|---|---|---|
| `usePrefersReducedMotion` | `CrystalOpenerScene.tsx` (inline) | Reactive reduced-motion media query |

No `hooks/` directory exists. `usePrefersReducedMotion` is not extracted into a shared location.

---

## 5. Technical Debt

### Critical

1. **Scroll reveal JS is missing.** CSS rules for `.is-visible` (covering `.story-panel`, `.showcase-card`, `.project-band-card`, `.portfolio-card`, `.contact-preview-intro`, `.contact-preview-card`, `.contact-form-section`, `.final-callout`) are defined but no `IntersectionObserver` or equivalent JS exists in the React code. Affected elements start at `opacity: 0` and remain invisible after load on most pages.

2. **Cursor aura JS is missing.** `body::after` and `.site-cursor-aura` use CSS custom properties `--cursor-x` and `--cursor-y` for the cursor glow effect, but no `mousemove` listener in the React source sets these properties. The cursor aura is always centred at its initial position.

3. **`tsc -b` reports type errors.** The global `tsc` (v6.0.3) finds no `node_modules/` during standalone execution and reports hundreds of "Cannot find module" and "JSX element implicitly has type 'any'" errors. Because `tsc -b` exits with code 0 in this environment, Vite builds proceed and the production bundle is correct — but TypeScript type safety is not enforced at the command-line build stage.

### Moderate

4. **`usePrefersReducedMotion` is embedded in the 3D scene file.** It should be extracted to `src/hooks/usePrefersReducedMotion.ts` for reuse across future animated components.

5. **All five Google Fonts are loaded on every page.** Classic and Clean themes each need different fonts but all five families are fetched unconditionally on first paint, adding unnecessary render-blocking weight for users on non-default themes.

6. **CSS is split across too many layers.** `global.css` is ~900 lines and mixes design tokens, component classes, layout utilities, and reveal state in a single file. Future contributors will have difficulty locating styles for specific components.

7. **`[data-tilt]` CSS is defined but no tilt JS exists.** `transform: none !important` is applied to `[data-tilt]` under reduced-motion, but no JavaScript applies tilt transforms anywhere in the source.

8. **`.is-overdrive` body class has no JS trigger.** CSS transitions for `body.is-overdrive` (accent colour shift, saturation increase) are defined but nothing toggles this class.

9. **`.site-secret-node` CSS is defined but unused.** The selectors `.site-secret-node`, `.site-secret-node-core`, and `.site-secret-node-ring` appear in `global.css` with reduced-motion overrides, but no corresponding HTML or React component was found.

### Minor

10. **`home-command-display`, `home-proof-strip`, `home-focus-grid`, `home-story-grid`, `home-command-grid`** — CSS classes defined in `global.css` that are not present in the current `Home.tsx`. These appear to be remnants of earlier layout iterations.

11. **`@MockBean` deprecation in Spring Boot tests.** One warning logged by `./gradlew test`: `@MockBean` in `org.springframework.boot.test.mock.mockito` is deprecated and marked for removal.

12. **Multiple duplicate `@media (max-width: 767px)` blocks** appear in `global.css`. They are functionally safe but could be consolidated.

---

## 6. Files That Can Be Reused

| File / Directory | Notes |
|---|---|
| `components/PageHero.tsx` | Ready for any new interior section that needs a hero with copy + visual slot |
| `components/hero/CrystalOpenerScene.tsx` | The full Three.js diamond. Can be extended with new materials or lighting; geometry, disposal, and reduced-motion handling are already correct |
| `features/contact/FormFields.tsx` | Shared form field set. Can be reused for any new lead capture surface |
| `app/Layout.tsx` | ThemePicker and mobile nav are complete. Any new global UI (notification bar, progress indicator) can be added here |
| `data/site.ts` | Extend with new nav items or theme definitions without touching React code |
| `styles/base/global.css` | All shared design tokens (CSS custom properties) and component classes live here. New component classes should be added here under `@layer components` |
| `styles/pages/home.css` | All home hero keyframes are named and scoped. Safe to extend for new hero motion |
| `styles/components/navbar.css` | Navigation animation keyframes are complete and isolated |
| `vite.config.ts` | Manual chunk logic is already set up. New lazy-loaded Three.js scenes should be added to the `manualChunks` function |

---

## 7. Files Likely to Be Removed Later

| File / CSS selector | Reason |
|---|---|
| CSS: `.home-command-display`, `.home-proof-strip`, `.home-focus-grid`, `.home-story-grid`, `.home-command-grid` | Orphaned from previous layout iteration; not referenced in current JSX |
| CSS: `.site-secret-node`, `.site-secret-node-core`, `.site-secret-node-ring` | No HTML or React component creates these elements |
| CSS: `body.is-overdrive` block | No JS trigger; feature appears unfinished |
| CSS: `[data-tilt]` reduced-motion override | No JS applies tilt; selector has no active effect |
| `frontend/qa-home-*.png` (12 files in `frontend/`) | QA screenshot files committed to the repo; they belong outside version control |
| `frontend/frontend-vite-preview.err.log` and `frontend-vite-preview.log` | Log files committed to the repo; they belong in `.gitignore` |

---

## 8. Recommended Animation Stack

The project already has Three.js and custom CSS `@keyframes`. The recommended approach for advanced animation is additive — build on what exists rather than replacing it.

### Keep (already present)

- **Three.js / @react-three/fiber / @react-three/drei** — the 3D diamond is real and complete. Extend the scene or add new scenes rather than replacing with a different 3D library.
- **CSS `@keyframes`** — background atmosphere, navbar, fallback diamond, proof cards. Keep for decorative, low-cost motion.
- **CSS `transition`** — buttons, cards, theme switching. Keep as-is.

### Add (when needed)

| Library | Use case | Bundle impact |
|---|---|---|
| **Framer Motion** (`motion`) | Route transitions, scroll-triggered reveal, component enter/exit, drag interactions | ~50 kB gzip |
| **A native `IntersectionObserver` hook** | Replace the broken CSS-only `.is-visible` system with a proper scroll reveal. Write as `src/hooks/useReveal.ts` — no new package needed | 0 kB |
| **`@react-spring/web`** (optional) | Physics-based UI spring animations if Framer Motion is not sufficient | ~30 kB gzip |

### Do not add

- GSAP (large, licence-dependent, redundant given Three.js `useFrame` for continuous motion)
- Lottie (no design source files to justify it)
- Additional CSS animation libraries (the CSS layer is already extensive)

---

## 9. Proposed Folder Structure

The current structure is sound. The changes below resolve the technical debt items without restructuring the whole project.

```
frontend/src/
├── app/
│   ├── App.tsx
│   └── Layout.tsx
├── components/
│   ├── PageHero.tsx
│   ├── hero/
│   │   └── CrystalOpenerScene.tsx
│   └── motion/                          ← NEW: shared motion wrappers
│       ├── RevealOnScroll.tsx           ← NEW: wraps IntersectionObserver
│       └── RouteTransition.tsx          ← NEW: wraps route enter/exit
├── data/
│   └── site.ts
├── features/
│   ├── contact/FormFields.tsx
│   ├── portfolio/portfolio.ts
│   └── services/services.ts
├── hooks/                               ← NEW: extracted shared hooks
│   ├── usePrefersReducedMotion.ts       ← MOVED from CrystalOpenerScene.tsx
│   └── useReveal.ts                     ← NEW: IntersectionObserver reveal
├── lib/                                 ← NEW: pure utility functions
│   └── webgl.ts                         ← MOVED: browserSupportsWebGL()
├── routes/
│   └── ...
└── styles/
    └── ...
```

---

## 10. Performance Risks

| Risk | Severity | Detail |
|---|---|---|
| `vendor-three` chunk is 889 kB (239 kB gzip) | High | Exceeds Vite's 500 kB warning. Three.js is tree-shaken but large. `@react-three/drei` adds ~300 kB alone. Any new drei helper (e.g. `Environment`, `useGLTF`) will grow this further. |
| All Google Fonts loaded unconditionally | Medium | Five font families including Cormorant Garamond and Fraunces are fetched even for the default Futuristic theme that only uses Sora and Space Grotesk. Adds 2–4 render-blocking requests. |
| `backdrop-filter: blur()` on multiple layered panels | Medium | The futuristic theme applies `backdrop-filter: blur(24px)` to at least 20 component selectors simultaneously. On low-end devices this can drop to single-digit frame rates. |
| No route-level code splitting beyond the crystal scene | Medium | All route components are bundled into a single `index.js` (55 kB). Adding Framer Motion route transitions without also lazy-loading routes will increase main bundle size. |
| `will-change: opacity, transform, filter` on reveal elements | Low | Applied globally to all `[data-reveal]`, `.story-panel`, `.showcase-card` etc. Since `.is-visible` is never triggered, these compositor hints are active on invisible elements, consuming GPU memory for no visual return. |
| `powerPreference: "high-performance"` on the WebGL canvas | Low | Forces discrete GPU selection where available. Correct for 3D performance but increases battery drain on mobile. |

---

## 11. Accessibility Risks

| Risk | Severity | Detail |
|---|---|---|
| Scroll reveal elements start invisible and stay invisible | High | Elements with `[data-reveal]` (outside `.page-scene`) remain at `opacity: 0` because no JS adds `.is-visible`. Screen readers can still access the text but sighted users on most pages cannot see cards and panels. This must be fixed before any new animation work begins. |
| Crystal scene is `aria-hidden="true"` | Low (correct) | The canvas and all HUD labels are hidden from assistive technology. The hero copy (`aria-labelledby="home-hero-title"`) is accessible. This is the correct pattern and should be maintained. |
| Theme transitions affect `color` | Low | The 420 ms colour transition on theme switch applies to body text. Very fast or flicker-free transitions may confuse users who are sensitive to colour change. |
| Focus ring uses CSS custom property | Low | `:focus-visible` outlines use `var(--color-accent-strong)`. This adapts correctly across themes but must be verified for contrast ratio on each theme, particularly Clean and Fresh which have light backgrounds. |
| Mobile nav `aria-hidden` is toggled via React state | Safe | `aria-hidden={!isMenuOpen}` is correctly toggled. Menu items are unreachable when the panel is closed. |

---

## 12. Mobile Risks

| Risk | Severity | Detail |
|---|---|---|
| Three.js scene on mid-range mobile | High | The full `CrystalOpenerScene` with `meshPhysicalMaterial` (transmission, clearcoat) is expensive. `dpr={[1, 1.75]}` limits pixel ratio but the material cost is still significant. iOS Safari and mid-range Android may drop below 30 fps. |
| `backdrop-filter` on mobile | Medium | Layered `backdrop-filter: blur()` on the mobile nav panel and proof cards is GPU-intensive. Low-end devices may show jank when the mobile nav opens. |
| CSS fallback diamond (`CrystalWebGLFallback`) may not trigger | Medium | The WebGL check runs in `useEffect`, meaning the Three.js canvas mounts briefly before the check completes. On very slow devices there may be a flash of the canvas before it is replaced by the fallback. |
| Proof cards grid collapses to single column | Low (by design) | `.home-webgl-proof-grid` uses `repeat(4, minmax(0, 1fr))` at all breakpoints. At narrow widths the cards become very narrow before the column layout responds. A responsive grid adjustment may be needed. |
| Button widths on mobile | Low (by design) | `primary-button` and `secondary-button` are set to `width: 100%` on `max-width: 767px`. Verify new animated button components respect this override. |

---

## 13. Implementation Order

If advanced animations are added in a future task, the following order minimises risk and avoids building on broken foundations.

**Phase 1 — Fix existing broken systems (prerequisite)**

1. Extract `usePrefersReducedMotion` to `src/hooks/usePrefersReducedMotion.ts`.
2. Implement `src/hooks/useReveal.ts` using `IntersectionObserver` to add `.is-visible` on scroll. Apply it to the Layout or wrap elements on each page.
3. Implement `mousemove` listener (in Layout's `useEffect`) to set `--cursor-x` and `--cursor-y` on `document.documentElement`, enabling the existing cursor aura and `body::after` glow.
4. Remove dead CSS: `.home-command-display`, `.home-proof-strip`, `.home-focus-grid`, `.home-story-grid`, `.home-command-grid`, `.site-secret-node`, `body.is-overdrive`, `[data-tilt]`.
5. Remove QA screenshots and log files from the repo.

**Phase 2 — Route transitions**

6. Add Framer Motion (`motion` package).
7. Create `components/motion/RouteTransition.tsx` — a simple `AnimatePresence` + `motion.div` wrapper applied in `Layout.tsx` around `{children}`.
8. Verify transitions respect `prefers-reduced-motion` via Framer Motion's `useReducedMotion()`.

**Phase 3 — Scroll reveals**

9. Create `components/motion/RevealOnScroll.tsx` using `useReveal` hook or Framer Motion `whileInView`.
10. Replace the raw `data-reveal` attribute pattern on `story-panel`, `showcase-card`, and `project-band-card` elements with the new component.
11. Keep the existing CSS fallback for `.page-scene [data-reveal]` so `PageHero` continues to work without JS.

**Phase 4 — Advanced 3D (optional)**

12. Evaluate adding `Environment` or `CubeCamera` to `CrystalOpenerScene` for reflections.
13. Add a mobile-quality detection step (GPU tier via `detect-gpu` or a simple canvas benchmark) to serve a lower-quality scene or the CSS fallback on mobile.
14. Extract `browserSupportsWebGL` to `src/lib/webgl.ts`.

**Phase 5 — Font and bundle optimisation**

15. Load only the fonts required by the active theme. Detect theme from the cookie before the first React render and inject only the needed `<link>` tag.
16. Add lazy route splitting if the main bundle grows beyond 100 kB gzip.

---

## 14. Audit Results

### Build result

**Command:** `npm run build` (via `./gradlew test`)  
**Result:** ✅ Build succeeded

| Chunk | Raw size | Gzip size |
|---|---|---|
| `dist/assets/vendor-three-*.js` | 889.04 kB | 239.42 kB |
| `dist/assets/vendor-react-*.js` | 234.60 kB | 74.91 kB |
| `dist/assets/index-*.js` | 55.13 kB | 14.01 kB |
| `dist/assets/crystal-scene-*.js` | 15.14 kB | 5.74 kB |
| `dist/assets/index-*.css` | 132.34 kB | 24.02 kB |
| `dist/index.html` | 1.96 kB | 0.73 kB |

**Build warnings:**
- Vite: `(!) Some chunks are larger than 500 kB after minification` — `vendor-three` at 889 kB
- TypeScript: `tsc -b` (via global `tsc` v6.0.3, no local `node_modules`) reports type errors for all files due to missing type declarations. Exit code is 0; Vite build proceeds. These are environment-level false positives caused by the absence of `node_modules` during `tsc` invocation, not regressions in the source code.

### Lint result

**Status:** No lint command is configured in `frontend/package.json`. There is no ESLint or Prettier configuration in the repository. The `scripts` object contains only `dev`, `build`, and `preview`.

### Test result

**Command:** `./gradlew test`  
**Result:** ✅ BUILD SUCCESSFUL (6 tasks executed, 54 s)

**Test warning:**
- `src/test/java/.../CrystalPowerApplicationTests.java:26`: `@MockBean` in `org.springframework.boot.test.mock.mockito` is deprecated and marked for removal. This is a Spring Boot framework warning unrelated to frontend work.

### Existing failures

- Scroll reveal (`.is-visible`) is non-functional — elements are permanently invisible on most pages.
- Cursor aura (`--cursor-x`, `--cursor-y`) is non-functional — cursor glow is static.
- `[data-tilt]` hover tilt is non-functional — no JS trigger.
- `body.is-overdrive` visual mode is non-functional — no JS trigger.

### Files created

- `docs/ADVANCED_EXPERIENCE_AUDIT.md` (this file)

### Visual redesign confirmation

No visual changes were made. No routes, components, styles, backend APIs, contact forms, or redirects were modified. This document is read-only output from a code inspection and build run.
