# Agent — Crystal Powers

This file is the primary reference for any AI coding agent working on this repository. Read it fully before making any change.

---

## Project Identity

**Name:** Crystal Powers  
**Type:** Premium web studio — public-facing marketing and portfolio website  
**Stack:** React 19 + Vite 6 + TypeScript 5 (frontend) / Spring Boot 3 + Gradle (backend)  
**Purpose:** Customer-facing site for a digital studio that builds polished websites, client portals, automation flows, and launch surfaces.

---

## Repository Layout

```
Crystal-Powers/
├── frontend/          React + Vite + TypeScript + Tailwind — public UI source
│   ├── src/
│   │   ├── app/           App shell, Layout, routing
│   │   ├── components/    Shared visual components (PageHero, CrystalOpenerScene)
│   │   ├── data/          Nav items, theme definitions
│   │   ├── features/      Feature data: contact, portfolio, services
│   │   ├── hooks/         Shared React hooks
│   │   ├── lib/           Pure utility modules
│   │   │   └── interactions/  scrollReveal, cursorAura, tilt
│   │   ├── routes/        One file per public page
│   │   └── styles/        CSS: base, components, pages, themes
│   ├── public/            Static images, favicon, animations, manifest
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   └── vite.config.ts
├── src/               Spring Boot backend (Java)
│   └── main/java/com/crystalpower/website/
│       ├── api/       REST controllers (/api/contact, /api/services)
│       ├── service/   Email delivery, upload validation
│       └── web/       SPA forwarding, legacy HTML redirects
├── docs/              All project documentation
├── build.gradle       Full build — runs npm build, packages jar
├── build.ps1          One-command local build script
└── Dockerfile         Production container
```

---

## Critical Rules — Read Before Acting

### Never touch
- Backend API controllers, routes, validation logic, email delivery, or file upload handling.
- Spring Boot configuration files (`application.properties`, `application-prod.properties`).
- The Gradle build configuration unless the task specifically involves it.
- The Three.js crystal scene (`CrystalOpenerScene.tsx`) unless a small compatibility change is required.
- Contact form field components (`features/contact/FormFields.tsx`) or form submission behaviour.
- SPA fallback and legacy redirect controllers.
- Files inside `.github/agents/` — these are off-limits.

### Always check before adding dependencies
- Run the `runtime-tools-gh-advisory-database` security check for any new npm or Maven package.
- Use existing libraries rather than adding new ones where possible.
- Do not add GSAP, Motion/Framer Motion, Lenis, or any animation library unless a task explicitly authorises it.

### CSS rules
- All CSS lives in `frontend/src/styles/`. Never put style blocks inside `.tsx` or `.ts` files.
- New component classes belong in `global.css` under `@layer components`.
- New page-specific styles belong in the matching file under `styles/pages/`.
- Preserve the `body.reveal-ready` gate on scroll reveal hidden states.
- Do not remove or weaken the `@media (prefers-reduced-motion: reduce)` block.

### TypeScript rules
- The global `tsc` in this environment finds no `node_modules/` and reports "Cannot find module" errors that do not affect the Vite build. `tsc -b` exits 0 regardless. This is a known environment limitation — do not try to fix it.
- Real TypeScript errors introduced by new code will cause `vite build` to fail (exit code 2). Fix those.
- Use explicit types. Do not use `any` unless bridging a third-party gap.

### React rules
- Do not add React state for per-frame updates (pointer positions, animation frames). Use refs or plain variables.
- Interaction systems (`scrollReveal`, `cursorAura`, `tilt`) are plain TypeScript — do not convert them to React hooks or components.
- Route-level code is in `routes/`. Shared visual components are in `components/`. Do not mix.

---

## Build Commands

```bash
# Install frontend dependencies (required once after clone)
cd frontend && npm install

# Build the frontend only
cd frontend && npm run build

# Run backend tests only
./gradlew test         # Linux/macOS
.\gradlew.bat test     # Windows

# Full production build (frontend + backend + jar)
.\build.ps1            # Windows
```

### Build is healthy when
- `npm run build` exits 0 and prints `✓ built in X.XXs`.
- `./gradlew test` prints `BUILD SUCCESSFUL`.
- Pre-existing `tsc -b` "Cannot find module" errors are still present but do not block the build.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Interaction systems as plain TS, not React hooks | Avoid per-frame React re-renders; enables cleanup without component lifecycle coupling |
| `body.reveal-ready` CSS gate | Ensures content is visible if JS fails to load — the hidden state is only active after JS has successfully initialised |
| Single `IntersectionObserver` per session | More efficient than one observer per element; route refresh handled by calling `refresh()` |
| CSS variables for cursor position on `:root` | Both `body::after` gradient and `.site-cursor-aura` consume the same variables without JS-side duplication |
| Tilt via inline `style.transform` | Inline styles outrank all CSS rules, allowing tilt to override the reveal-state transform cleanly without specificity fights |
| `MutationObserver` in `initTilt` | Automatically picks up newly mounted `[data-tilt]` elements after route changes without re-running `initTilt` |

---

## Theme System

Five themes: `futuristic` (default), `classic`, `clean`, `fresh`, `summer-vibes`.

- Theme ID stored in the `crystal_theme` cookie (1-year TTL).
- Applied as `body[data-theme]` and `body.theme-ready` by `Layout.tsx`.
- CSS variables overridden per theme in `styles/themes/*/theme.css`.
- A 420 ms transition block in `global.css` smooths theme switches.
- `ThemePicker` component lives inside `Layout.tsx`.

---

## Interaction Systems Summary

| System | File | Trigger | Guard |
|--------|------|---------|-------|
| Scroll reveal | `lib/interactions/scrollReveal.ts` | `IntersectionObserver` | `body.reveal-ready`; reduced-motion fallback |
| Cursor aura | `lib/interactions/cursorAura.ts` | `pointermove` on `document` | Fine pointer + hover only; rAF batched |
| Pointer tilt | `lib/interactions/tilt.ts` | `pointermove` on element | Fine pointer only; `[data-tilt]` attribute |

All three are initialised in `Layout.tsx` on mount and cleaned up on unmount. Route changes trigger `revealRef.current.refresh()` via a second `useEffect` on `location.pathname`.

---

## Public Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `routes/Home.tsx` | Three.js crystal scene, lazy-loaded |
| `/about` | `routes/About.tsx` | Story panels, orbit visual |
| `/services` | `routes/Services.tsx` | Full quote form, pricing cards, addon grid |
| `/portfolio` | `routes/Portfolio.tsx` | Project band grid |
| `/portfolio/:slug` | `routes/PortfolioProject.tsx` | Individual project detail |
| `/support` | `routes/Support.tsx` | Support tier panels |
| `/contact` | `routes/Contact.tsx` | Structured contact + build scope form |
| `*` | `routes/NotFound.tsx` | 404 page |

---

## API Endpoints

| Endpoint | Method | Handler | Purpose |
|----------|--------|---------|---------|
| `/api/contact` | POST | `ContactController` | Structured contact enquiry |
| `/api/services` | POST | `ServicesController` | Quote request with optional file uploads |

Both return `{ success, message, fieldErrors }`.

---

## Known Pre-existing Issues (Do Not Fix Unless Tasked)

1. `tsc -b` reports "Cannot find module" for all packages — environment limitation, not a real error.
2. `vendor-three` chunk is 889 kB (gzip 239 kB) — Three.js is large; pre-existing.
3. All five Google Fonts loaded unconditionally — pre-existing.
4. `@MockBean` deprecation warning in Spring Boot tests — pre-existing.
5. Multiple duplicate `@media (max-width: 767px)` blocks in `global.css` — pre-existing.

---

## File Ownership Quick Reference

| What you want to change | File |
|-------------------------|------|
| Navigation items | `src/data/site.ts` |
| Theme definitions | `src/data/site.ts` + `styles/themes/*/theme.css` |
| Design tokens (CSS variables) | `styles/base/global.css` |
| Shared component classes | `styles/base/global.css` under `@layer components` |
| Scroll reveal selectors | `lib/interactions/scrollReveal.ts` — `REVEAL_SELECTORS` |
| Tilt defaults | `lib/interactions/tilt.ts` — `DEFAULT_MAX_DEG`, `DEFAULT_SCALE` |
| Pricing packages | `features/services/services.ts` |
| Portfolio projects | `features/portfolio/portfolio.ts` |
| Header / footer markup | `app/Layout.tsx` |
| Hero (homepage) | `routes/Home.tsx` + `components/hero/CrystalOpenerScene.tsx` |
| Hero (interior pages) | `components/PageHero.tsx` |
