# Skills — Crystal Powers

This document records the technical skills, patterns, and implementation methods used in this project. It is a reference for understanding how to work within this codebase correctly and consistently.

---

## Technology Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| Frontend framework | React | 19 | UI components and routing |
| Frontend build | Vite | 6 | Dev server, HMR, production bundling |
| Language | TypeScript | 5.7 | Type-checked JavaScript for all source |
| Styling | Tailwind CSS | 3.4 | Utility classes; all non-utility styles in dedicated CSS files |
| 3D engine | Three.js | 0.184 | WebGL diamond crystal scene |
| React 3D renderer | @react-three/fiber | 9.6 | React bindings for Three.js |
| 3D helpers | @react-three/drei | 10.7 | Float, Sparkles, ContactShadows, PerspectiveCamera |
| Client routing | react-router-dom | 7.1 | SPA routing, `useLocation` |
| Backend framework | Spring Boot | 3 | REST API, SPA hosting, email |
| Backend language | Java | 21 | All backend source |
| Build orchestration | Gradle | 9.4 | Runs `npm run build`, compiles Java, packages jar |
| Container | Docker | — | Production deployment image |

---

## Frontend Patterns

### Component structure

```
src/
├── app/          Shell-level components (Layout, App) — one instance per session
├── components/   Shared visual components — stateless where possible
├── features/     Feature-owned data and UI (contact, portfolio, services)
├── hooks/        Shared React hooks — one concern per file
├── lib/          Pure TypeScript utilities — no React imports
├── routes/       Page components — one file per route, no shared logic
└── styles/       CSS only — no inline styles in TSX except interaction systems
```

### How to create a new page

1. Create `src/routes/MyPage.tsx` — export a named function component.
2. Add the route in `src/app/App.tsx`.
3. Add a nav item in `src/data/site.ts` if it should appear in navigation.
4. Create `src/styles/pages/my-page.css` for page-specific styles.
5. Import the new CSS file in `src/styles/base/global.css` at the top.
6. Use `<PageHero>` for the interior hero — do not recreate the hero markup.

### How to create a new shared component

1. Create `src/components/MyComponent.tsx`.
2. Export a named function component with typed props.
3. Add component styles to `src/styles/base/global.css` under `@layer components` if they are shared, or to a page-specific CSS file if they are page-only.
4. Keep the component stateless where possible. Lift state to the route if needed.

### How to add a new React hook

1. Create `src/hooks/useMyHook.ts`.
2. Export a named function prefixed with `use`.
3. Include cleanup in `useEffect` return functions.
4. Read initial state synchronously inside `useState(() => { ... })` to avoid first-render flashes.

---

## CSS Skills

### Design token conventions

All CSS custom properties (design tokens) are defined in `global.css` under `@layer base :root { }`.

Naming pattern:
- `--color-*` — colour tokens
- `--panel-*` — surface/card tokens
- `--font-*` — typography
- `--hero-*` — hero section tokens
- `--cursor-*` — interaction system tokens (written by JS)

Do not define tokens inside component rules. All tokens belong at `:root`.

### Component class pattern

New component classes use the `@apply` directive for Tailwind utilities and direct CSS for design-token references:

```css
@layer components {
  .my-component {
    @apply rounded-[1.75rem] border p-6 backdrop-blur-xl;
    border-color: var(--panel-border);
    background: var(--section-surface-strong);
    box-shadow: var(--panel-shadow);
  }
}
```

### Scroll reveal opt-in

To make a new element participate in scroll reveal, either:

**Option A — use a pre-registered class:**
```tsx
<article className="story-panel">…</article>
```

**Option B — use the data attribute (works for any element):**
```tsx
<div data-reveal="up">…</div>    // fades up
<div data-reveal="left">…</div>  // slides from left
```

Elements inside `.page-scene` (PageHero) are always visible and do not need JS reveal.

To register a new named class: add it to `REVEAL_SELECTORS` in `lib/interactions/scrollReveal.ts` **and** add the `body.reveal-ready .my-class` / `body.reveal-ready .my-class.is-visible` rules in `global.css` following the existing pattern.

### Pointer tilt opt-in

Add `data-tilt` to any card-like element that is not a form, control, or text-heavy section:

```tsx
<article className="my-card" data-tilt data-tilt-max="4" data-tilt-scale="1.01">
  …
</article>
```

The tilt JS picks it up automatically via `MutationObserver`.

### Theme-aware CSS

Use CSS custom properties rather than hardcoded colours so all five themes work:

```css
/* ✅ correct */
color: var(--color-text-secondary);
background: var(--section-surface-soft);

/* ❌ wrong */
color: #d8def7;
background: rgba(255,255,255,0.04);
```

---

## Interaction System Skills

### Writing a new interaction module

Follow the pattern established in `lib/interactions/`:

```ts
// lib/interactions/myEffect.ts

export type MyEffectCleanup = () => void;

export function initMyEffect(prefersReducedMotion: boolean): MyEffectCleanup {
  if (typeof window === "undefined") return () => {};
  if (prefersReducedMotion) return () => {};

  // Activation guard
  if (!window.matchMedia("(pointer: fine)").matches) return () => {};

  // Set up listeners
  const onEvent = (e: PointerEvent) => { /* ... */ };
  document.addEventListener("pointermove", onEvent, { passive: true });

  // Return cleanup
  return () => {
    document.removeEventListener("pointermove", onEvent);
  };
}
```

Rules:
- Never update React state inside event listeners.
- Always use `{ passive: true }` for pointer and scroll events.
- Always cancel pending `requestAnimationFrame` calls in cleanup.
- Always clear `setTimeout` handles in cleanup.
- Wrap the body in `try/catch` and call a safe fallback if init throws.

### Integrating a new interaction in Layout.tsx

Add cleanup to the existing `useEffect` in `Layout.tsx`:

```ts
useEffect(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cursorCleanup = initCursorAura(reducedMotion);
  const tiltCleanup   = initTilt(reducedMotion);
  const myCleanup     = initMyEffect(reducedMotion);   // ← add here
  revealRef.current   = initScrollReveal(reducedMotion);

  return () => {
    cursorCleanup();
    tiltCleanup();
    myCleanup();                                        // ← add here
    revealRef.current?.destroy();
  };
}, []);
```

Export the new function from `lib/interactions/index.ts`.

---

## Reduced-Motion Skills

Always read `prefers-reduced-motion` at initialisation time and pass it to interaction systems as a parameter. Do not re-read it per event.

```ts
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```

For React components that animate, use the shared hook:

```ts
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

function MyComponent() {
  const reducedMotion = usePrefersReducedMotion();
  // skip or simplify animation when true
}
```

Always add CSS safety nets alongside JS guards:

```css
@media (prefers-reduced-motion: reduce) {
  .my-animated-thing {
    animation: none !important;
    transform: none !important;
  }
}
```

---

## Three.js Skills

The crystal scene (`CrystalOpenerScene.tsx`) uses:

- `@react-three/fiber` `Canvas` with `dpr={[1, 1.75]}` and `powerPreference: "high-performance"`
- `@react-three/drei`: `Float` (idle bounce), `Sparkles` (particles), `ContactShadows`, `PerspectiveCamera`
- `useFrame` for per-frame pointer-tracking rotation
- `useMemo` for geometry and material creation (avoids re-creation on re-render)
- `useRef<THREE.Group>` for imperative transform access
- `usePrefersReducedMotion` to scale down motion intensity when the user prefers reduced motion

WebGL detection via `browserSupportsWebGL()` (in the same file) runs in a `useEffect`. Non-WebGL devices get `CrystalWebGLFallback` — a CSS-only diamond.

When extending the scene:
- Add new drei helpers to the `manualChunks` function in `vite.config.ts` if they increase the `vendor-three` chunk significantly.
- Keep `aria-hidden="true"` on the Canvas and all HUD labels — the hero copy is the accessible content.
- Test WebGL fallback by calling `browserSupportsWebGL()` and temporarily returning `false`.

---

## Spring Boot Skills

### API pattern

All API controllers return `ApiResponse`:

```java
{ "success": boolean, "message": string, "fieldErrors": {} }
```

Front-end components check `response.success` and display `response.message`. `fieldErrors` is a map of `fieldName → errorMessage`.

### File upload validation

The services endpoint validates:
- Maximum file count
- Allowed content types (images and videos only)
- Total upload size

Validation is in the service layer (`UploadValidationService`), not the controller.

### SPA forwarding

`SpaController` catches all unmatched routes and forwards to `/index.html` so React Router handles client-side navigation. Do not add new Spring MVC routes that would conflict with React's route list.

### Email delivery

`EmailService` uses Spring's `JavaMailSender`. Configuration is environment-variable-driven. Do not hardcode email addresses or credentials.

---

## Build Skills

### Frontend build

```bash
cd frontend
npm install        # first time only
npm run build      # tsc -b && vite build
```

Build output is `frontend/dist/`. Gradle copies this into `src/main/resources/static/` before packaging.

### Full pipeline

```powershell
.\build.ps1              # install deps, build frontend, run tests, package jar
.\build.ps1 -SkipTests   # skip Java tests
.\build.ps1 -RunAfterBuild   # start the server after build
```

### Vite configuration

Manual chunk splitting in `vite.config.ts`:

```ts
manualChunks(id) {
  if (id.includes("three") || id.includes("@react-three")) return "vendor-three";
  if (id.includes("react")) return "vendor-react";
  if (id.includes("CrystalOpenerScene")) return "crystal-scene";
}
```

Add new heavy lazy-loaded components (Three.js scenes, large feature modules) to this function.

### TypeScript notes

The project uses `tsc -b` which in the current environment reports "Cannot find module" for all packages because `node_modules/` is not in the global `tsc` resolution path. This exits 0 and does not prevent the Vite build. Real type errors introduced by new code will cause `vite build` to fail with exit code 2 — these must be fixed.

---

## Accessibility Skills

- All interactive elements use semantic HTML (`<button>`, `<a>`, `<input>`, etc.).
- Focus rings use `var(--color-accent-strong)` via the `:focus-visible` rule in `global.css`.
- The Three.js canvas and all HUD labels are `aria-hidden="true"`. The hero text is accessible via `aria-labelledby="home-hero-title"`.
- Mobile nav panel uses `aria-hidden={!isMenuOpen}` — menu items are unreachable when closed.
- Never suppress focus outlines.
- Always test keyboard navigation after adding interactive elements.
- Tilt (`data-tilt`) preserves keyboard focus behaviour — only pointer events are handled, and `transform` does not move the clickable target.

---

## Performance Skills

- Use `React.lazy` + `Suspense` for any component that imports Three.js or is heavier than ~20 kB.
- Never import Three.js from a route-level file — always use a lazy-loaded component.
- Use `requestAnimationFrame` to batch per-frame DOM writes; never set CSS properties on every pointer event directly.
- Use `{ passive: true }` on all scroll and pointer event listeners.
- `will-change: opacity, transform, filter` is applied to reveal elements only when `body.reveal-ready` is set — this ensures compositor hints are not wasted on invisible content before JS loads.
- Avoid `backdrop-filter: blur()` on more than a few elements simultaneously on mobile.

---

## Security Skills

- Never commit credentials. Use `.env.example` as documentation; real values go in deployment environment variables.
- Scan modified files for secrets using `runtime-tools-secret_scanning` before committing.
- Check new dependencies with `runtime-tools-gh-advisory-database` before adding them.
- The contact and services APIs validate and sanitise all inputs server-side — do not rely on front-end validation alone.
- File uploads are validated for type and size in the service layer, not the controller.
