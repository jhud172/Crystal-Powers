# Memory — Crystal Powers

This file records key decisions, implementation history, current project state, and important facts that must be preserved across work sessions. Update it when a significant decision is made or a system changes.

---

## Project State (as of 2026-06-22)

### What is built and working

| System | Status | Notes |
|--------|--------|-------|
| React SPA (Vite 6 + TypeScript 5) | ✅ Operational | All 8 routes live, lazy-loaded crystal scene |
| Spring Boot backend | ✅ Operational | Contact and services APIs, SPA forwarding |
| Theme system (5 themes) | ✅ Operational | Cookie-persisted, CSS variable-driven |
| Mobile navigation | ✅ Operational | aria-controlled panel, closes on route change |
| Three.js crystal diamond | ✅ Operational | Pointer-tracked, reduced-motion-aware |
| WebGL fallback | ✅ Operational | CSS-only diamond shown when WebGL is unavailable |
| Contact form | ✅ Operational | Validation, file uploads, email delivery via Spring |
| Services quote form | ✅ Operational | Package/addon/maintenance selection, file uploads |
| Scroll reveal | ✅ Fixed 2026-06-22 | IntersectionObserver, body.reveal-ready gate |
| Cursor aura | ✅ Fixed 2026-06-22 | pointermove → --cursor-x / --cursor-y on :root |
| Pointer tilt | ✅ Fixed 2026-06-22 | [data-tilt] elements: showcase-card, project-band-card |
| usePrefersReducedMotion hook | ✅ Extracted 2026-06-22 | Shared from hooks/, used by CrystalOpenerScene |
| Interaction foundation docs | ✅ Created 2026-06-22 | docs/INTERACTION_FOUNDATION.md |

### What is deliberately deferred

| Item | Reason | When |
|------|--------|------|
| Route transitions (Framer Motion) | Animation library not yet authorised | Phase 2 |
| Advanced 3D enhancements (Environment, CubeCamera) | Out of current scope | Phase 4 |
| Per-theme font loading | Out of current scope | Phase 5 |
| GSAP / Lenis / Motion | Explicitly excluded by task spec | Not planned |
| Orphaned CSS classes cleanup (home-command-display etc.) | Out of current scope | Future cleanup pass |

---

## Architecture Decisions (with rationale)

### 2026-06-22 — Interaction foundation

**Decision: Interaction systems as pure TypeScript modules, not React hooks or components.**  
Reason: Per-frame updates (pointer events, animation frames) must not trigger React re-renders. A plain module with an init/cleanup contract avoids state machinery entirely and keeps the code portable.

**Decision: `body.reveal-ready` CSS gate for scroll reveal hidden state.**  
Reason: Without this gate, reveal elements start at `opacity: 0` in CSS. If JavaScript fails to load at all, the content is permanently invisible. With the gate, JS must actively add the class to enable hidden state — failure leaves content visible. This is the safest progressive-enhancement pattern.

**Decision: Removed `body.is-overdrive` and all `.site-secret-node` CSS.**  
Reason: Neither system had matching markup or a documented trigger. The overdrive feature overrode CSS variables and applied a filter to `.site-shell` — but `.site-shell` itself is not used in any JSX. Removing dead CSS reduces confusion and eliminates potential future conflicts.

**Decision: Tilt applied via inline `style.transform`, not a CSS class.**  
Reason: CSS specificity for `[data-tilt]` is lower than `[data-reveal].is-visible` (which sets `transform: translate3d(0,0,0) scale(1)`). Inline styles always have highest specificity, allowing tilt to cleanly override the reveal-completion transform without adding specificity hacks to CSS.

**Decision: Single `IntersectionObserver` shared across all reveal elements.**  
Reason: Creating one observer per element is an anti-pattern that wastes memory and degrades performance on pages with many reveal elements. One observer with `unobserve` after reveal is the correct pattern.

**Decision: `MutationObserver` inside `initTilt` to catch post-route-change elements.**  
Reason: After a React Router navigation, new DOM nodes are mounted. Rather than re-running `initTilt` on every route change, a `MutationObserver` passively observes `document.body` and attaches tilt to any newly mounted `[data-tilt]` element. A `WeakSet` prevents double-initialisation.

### Earlier decisions (pre-2026-06-22)

**Decision: Spring Boot serves the React build in production.**  
Reason: Gradle copies `frontend/dist` into Spring static resources. One jar, one deployment unit, no separate CDN needed at current scale.

**Decision: Vite manual chunk splitting for Three.js.**  
Reason: `vendor-three` (889 kB) would otherwise be bundled into the main entry chunk, delaying the initial render for pages that never use WebGL. Splitting it means only the homepage pays the Three.js loading cost.

**Decision: `React.lazy` + `Suspense` for `CrystalOpenerScene`.**  
Reason: The crystal scene is the heaviest component in the project. Lazy-loading it keeps the homepage initial JS under 60 kB while the 3D chunk loads in parallel.

**Decision: Five themes defined in `data/site.ts`, driven by `body[data-theme]`.**  
Reason: CSS custom property overrides scoped to `[data-theme]` mean theme switching requires zero JavaScript beyond setting one attribute. The 420 ms CSS transition block handles visual smoothness.

---

## Key Files and Their Roles

| File | Role |
|------|------|
| `frontend/src/app/Layout.tsx` | Persistent shell: header, footer, nav, ThemePicker, interaction initialisation |
| `frontend/src/app/App.tsx` | Route table only — no logic |
| `frontend/src/main.tsx` | React entry: BrowserRouter + App |
| `frontend/src/styles/base/global.css` | All design tokens + shared component classes + reveal states |
| `frontend/src/styles/index.css` | Imports all CSS modules; Tailwind directives |
| `frontend/src/lib/interactions/scrollReveal.ts` | IntersectionObserver-based scroll reveal |
| `frontend/src/lib/interactions/cursorAura.ts` | Pointer position → CSS variables |
| `frontend/src/lib/interactions/tilt.ts` | Element-scoped pointer tilt |
| `frontend/src/hooks/usePrefersReducedMotion.ts` | Reactive reduced-motion hook (used by CrystalOpenerScene + future) |
| `frontend/src/components/hero/CrystalOpenerScene.tsx` | Three.js diamond scene (homepage only) |
| `frontend/src/components/PageHero.tsx` | Shared hero for all interior pages |
| `frontend/src/data/site.ts` | Nav items, theme definitions, theme ID type |
| `frontend/src/features/services/services.ts` | Pricing packages, additions, maintenance options |
| `frontend/src/features/portfolio/portfolio.ts` | Portfolio project data |

---

## CSS Architecture

### Layer structure

```
global.css imports:
  navbar.css       Header, mobile nav, keyframes
  footer.css       Footer styles
  home.css         Homepage-specific layout and keyframes
  about.css        About page
  services.css     Services + pricing layout
  portfolio.css    Portfolio grid and cards
  contact.css      Contact form layout
  support.css      Support page
  public-scenes.css  Page hero, floating panels, orbit shells

global.css itself:
  @layer base        Design tokens (CSS custom properties), theme overrides
  @layer components  Shared component classes
  @media queries     Responsive overrides
  @media (prefers-reduced-motion: reduce)  Safety overrides
```

### Scroll reveal CSS contract

```css
/* Enabled only when JS adds body.reveal-ready */
body.reveal-ready [data-reveal],
body.reveal-ready .story-panel, … { opacity: 0; … }

/* Revealed by JS or always for PageHero */
body.reveal-ready [data-reveal].is-visible,
body .page-scene [data-reveal], … { opacity: 1; … }
```

The `body .page-scene [data-reveal]` rule has specificity `0-2-1` and is positioned after the hidden-state rule in the cascade — so it always wins for `PageHero` elements.

---

## Interaction System State

### Scroll reveal

- **Selector list** (`REVEAL_SELECTORS`): `[data-reveal]`, `.story-panel`, `.showcase-card`, `.project-band-card`, `.portfolio-card`, `.contact-preview-intro`, `.contact-preview-card`, `.contact-form-section`, `.final-callout`
- **Threshold:** 0.08 (8% of element visible)
- **Root margin:** `0px 0px -32px 0px` (triggers slightly before bottom of viewport)
- **Reduced motion:** reveals all immediately, no animation
- **IO unavailable:** reveals all immediately

### Cursor aura

- **CSS variables written to:** `document.documentElement` (`:root`)
- **Variable format:** percentage string e.g. `"42.3%"`
- **On pointer leave:** properties removed (CSS fallback values take over)
- **Fine pointer guard:** `(pointer: fine) and (hover: hover)`

### Tilt

- **Active on:** `.showcase-card` (Home), `.showcase-card-media` (Home, max 3°, scale 1.01), `.project-band-card` (Home, max 4°, scale 1.01), `.project-band-card` (Portfolio, max 4°, scale 1.01)
- **Default max:** 5° rotation
- **Default scale:** 1.02
- **Reset duration:** 500 ms cubic-bezier(0.16, 1, 0.3, 1)

---

## Removed / Dead Systems

| System | Removed | Reason |
|--------|---------|--------|
| `body.is-overdrive` CSS | 2026-06-22 | No JS trigger, no `.site-shell` markup, ambiguous purpose |
| `body.is-overdrive .site-shell` CSS | 2026-06-22 | `.site-shell` class never used in any JSX |
| `.site-secret-node` CSS | 2026-06-22 | No markup, abandoned music-player easter egg concept |
| `.site-secret-node-core` in reduced-motion | 2026-06-22 | Dead selector |
| `.music-button .site-secret-node-core` | 2026-06-22 | Dead selector; `.music-button` itself unused |
| Inline `usePrefersReducedMotion` in `CrystalOpenerScene.tsx` | 2026-06-22 | Extracted to `hooks/usePrefersReducedMotion.ts` |

---

## Build Health

### Frontend build (`cd frontend && npm run build`)

- Exit code: **0**
- `tsc -b` reports pre-existing environment errors (Cannot find module) — these are not real errors
- Vite bundles: `index.js` ~59 kB, `vendor-react` ~235 kB, `vendor-three` ~889 kB (pre-existing warning)
- All interaction modules tree-shaken into `index.js`

### Backend tests (`./gradlew test`)

- Exit code: **0** — `BUILD SUCCESSFUL`
- Pre-existing warning: `@MockBean` deprecation in `CrystalPowerApplicationTests.java`

---

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `MAIL_HOST` | SMTP host |
| `MAIL_PORT` | SMTP port |
| `MAIL_USERNAME` | SMTP auth username |
| `MAIL_PASSWORD` | SMTP auth password |
| `APP_MAIL_TO` | Recipient email for form submissions |
| `APP_MAIL_FROM` | Sender address for outbound email |

Never commit real values. Use `.env.example` as template.

---

## Future Work (Tracked)

| Phase | Task | Blocker |
|-------|------|---------|
| 2 | Route transitions via Framer Motion | Needs task authorisation |
| 3 | Migrate `data-reveal` elements to `RevealOnScroll` component | Framer Motion first |
| 4 | Enhanced Three.js scene (Environment, CubeCamera) | Performance audit needed |
| 4 | GPU tier detection for mobile scene quality | research spike needed |
| 5 | Per-theme conditional font loading | Index.html modification needed |
| — | Remove orphaned CSS classes (home-command-display etc.) | Low priority cleanup |
| — | Consolidate duplicate `@media (max-width: 767px)` blocks | Low priority cleanup |
| — | Move QA screenshots and log files out of version control | housekeeping |
