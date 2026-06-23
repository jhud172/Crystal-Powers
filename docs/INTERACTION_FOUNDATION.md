# Interaction Foundation — Crystal Powers

**Created:** 2026-06-22  
**Scope:** Scroll reveal, cursor aura, pointer tilt, reduced-motion, pointer capability, route-change behaviour, cleanup strategy, overdrive / secret-node audit.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Scroll Reveal Architecture](#2-scroll-reveal-architecture)
3. [Cursor Aura Architecture](#3-cursor-aura-architecture)
4. [Tilt Architecture](#4-tilt-architecture)
5. [Reduced-Motion Behaviour](#5-reduced-motion-behaviour)
6. [Pointer Capability Detection](#6-pointer-capability-detection)
7. [Route-Change Behaviour](#7-route-change-behaviour)
8. [Cleanup Strategy](#8-cleanup-strategy)
9. [Overdrive — Audit Result](#9-overdrive--audit-result)
10. [Secret-Node — Audit Result](#10-secret-node--audit-result)
11. [How Future Components Opt In](#11-how-future-components-opt-in)

---

## 1. Overview

All interaction systems are initialised once in `app/Layout.tsx` via `useEffect`. They are implemented as pure TypeScript modules in `src/lib/interactions/` and do not use React state for per-frame updates.

```
frontend/src/
├── hooks/
│   ├── usePrefersReducedMotion.ts   Reactive reduced-motion media query
│   ├── useMediaQuery.ts             Generic reactive media query
│   └── usePointerCapability.ts      Reactive pointer type detection
└── lib/
    └── interactions/
        ├── scrollReveal.ts          IntersectionObserver scroll reveal
        ├── cursorAura.ts            --cursor-x / --cursor-y updater
        ├── tilt.ts                  [data-tilt] pointer tilt
        └── index.ts                 Re-exports all three modules
```

---

## 2. Scroll Reveal Architecture

### CSS gate

Elements that participate in scroll reveal start invisible via CSS, but **only** when JavaScript has added `body.reveal-ready`. Without that class the elements are always visible, which is the safe fallback if the script fails to load.

```css
/* Hidden — requires JS gate */
body.reveal-ready [data-reveal],
body.reveal-ready .story-panel,
body.reveal-ready .showcase-card,
body.reveal-ready .project-band-card,
…

/* Revealed — by JS adding .is-visible, or always for PageHero */
body.reveal-ready [data-reveal].is-visible,
body .page-scene [data-reveal],   /* PageHero always pre-revealed */
body.reveal-ready .story-panel.is-visible,
…
```

The `body .page-scene [data-reveal]` rule has specificity `0-2-1` and appears after the hidden-state rule in the cascade, so it always wins for `PageHero` elements regardless of whether `body.reveal-ready` is set.

### JavaScript

`initScrollReveal(prefersReducedMotion)` in `src/lib/interactions/scrollReveal.ts`:

1. Adds `body.reveal-ready` to enable the CSS hidden state.
2. Pre-marks all `.page-scene [data-reveal]` elements with `.is-visible` to prevent a flash.
3. If reduced motion is active **or** `IntersectionObserver` is unavailable, immediately adds `.is-visible` to all matching elements and returns early.
4. Otherwise, creates a single `IntersectionObserver` (threshold `0.08`, root margin `0px 0px -32px 0px`) that:
   - Adds `.is-visible` to each element as it enters the viewport.
   - Calls `observer.unobserve(element)` immediately after — each element reveals once only.
5. Returns a `ScrollRevealController` with `refresh()` and `destroy()` methods.

The entire initialisation is wrapped in `try/catch`. If anything throws, `revealAll()` is called as a safety fallback before returning.

### REVEAL_SELECTORS

```
[data-reveal], .story-panel, .showcase-card, .project-band-card,
.portfolio-card, .contact-preview-intro, .contact-preview-card,
.contact-form-section, .final-callout
```

---

## 3. Cursor Aura Architecture

`initCursorAura(prefersReducedMotion)` in `src/lib/interactions/cursorAura.ts`:

- Writes `--cursor-x` and `--cursor-y` (percentage strings, e.g. `"42.3%"`) to `document.documentElement` (`:root`).
- These drive `body::after`'s radial-gradient glow and the `.site-cursor-aura` element, both defined in `global.css`.
- Updates are batched through `requestAnimationFrame` — CSS variables are set at most once per display frame.
- React state is never updated.

### Activation conditions

All three must be true:

| Condition | Check |
|-----------|-------|
| Fine pointer | `(pointer: fine) and (hover: hover)` via `matchMedia` |
| Not reduced motion | `prefersReducedMotion === false` |
| Not touch event | `e.pointerType !== "touch"` guard per event |

### Pointer leave

When the pointer exits the document viewport (`pointerleave` on `document`) the custom properties are removed. The CSS fallback values (`50%` / `20%`) take over so the glow returns to a neutral centre position rather than freezing at the last known coordinates.

### Pointer-events safety

`.site-cursor-aura` is defined with `pointer-events: none` and `z-index: -32` in `global.css`. It cannot intercept clicks, focus, or form interactions.

---

## 4. Tilt Architecture

`initTilt(prefersReducedMotion)` in `src/lib/interactions/tilt.ts`:

- Attaches element-scoped `pointermove`, `pointerleave`, and `pointerenter` listeners to every `[data-tilt]` element.
- Transform is applied via **inline `style.transform`** (highest specificity), which cleanly overrides the reveal-state transform once `.is-visible` has been added by scroll reveal.
- Rotation is calculated from the pointer's position relative to the element's bounding rectangle, normalised to `[-1, 1]` and clamped by `data-tilt-max`.
- Updates are batched through `requestAnimationFrame`.
- React state is never updated.

### Configuration via data attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-tilt` | (presence) | Enables tilt on the element. |
| `data-tilt-max` | `5` | Maximum rotation in degrees. |
| `data-tilt-scale` | `1.02` | Scale factor at peak tilt. |

Values are parsed with `parseFloat`. Invalid or absent values fall back to defaults.

### Reset sequence

On `pointerleave`:
1. The current `requestAnimationFrame` call is cancelled.
2. `style.transition` is set to `transform 500ms cubic-bezier(0.16, 1, 0.3, 1)`.
3. `style.transform` is set to `perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)`.
4. After `560ms`, the inline `style.transform` and `style.transition` are cleared so CSS retakes control cleanly.

If the pointer re-enters during the reset, the timer is cancelled and tilt resumes from the current position.

### Activation conditions

Both must be true:

| Condition | Check |
|-----------|-------|
| Fine pointer | `(pointer: fine)` via `matchMedia` |
| Not reduced motion | `prefersReducedMotion === false` |

Touch events (`e.pointerType === "touch"`) are ignored even if a fine-pointer check passes.

### New elements after route changes

A `MutationObserver` watches `document.body` for added nodes and attaches tilt to any newly mounted `[data-tilt]` element. A `WeakSet` prevents double-initialisation if the same DOM node is observed more than once.

### Elements with tilt enabled

| Element | File | Data attributes |
|---------|------|-----------------|
| `.showcase-card` | `routes/Home.tsx` | `data-tilt` (defaults) |
| `.showcase-card-media` | `routes/Home.tsx` | `data-tilt-max="3" data-tilt-scale="1.01"` |
| `.project-band-card` (Home) | `routes/Home.tsx` | `data-tilt-max="4" data-tilt-scale="1.01"` |
| `.project-band-card` (Portfolio) | `routes/Portfolio.tsx` | `data-tilt-max="4" data-tilt-scale="1.01"` |

Tilt is intentionally **not** applied to: story panels (text-heavy), pricing/addon cards (interactive controls), contact form sections (accessibility-critical), or the PageHero.

---

## 5. Reduced-Motion Behaviour

| System | Reduced-motion behaviour |
|--------|--------------------------|
| Scroll reveal | `body.reveal-ready` is still added; all elements receive `.is-visible` immediately without animation. |
| Cursor aura | `initCursorAura` returns a no-op immediately; no listeners are attached; CSS variables are never set. |
| Tilt | `initTilt` returns a no-op immediately; no listeners are attached. |
| Three.js diamond | Handled by the existing `usePrefersReducedMotion` hook in `CrystalOpenerScene.tsx` (now imported from the shared `hooks/` location). |

The `@media (prefers-reduced-motion: reduce)` block in `global.css` additionally applies `animation: none !important` to `.site-cursor-aura` and `transform: none !important` to `[data-tilt]` as a CSS-only safety net, independent of JavaScript.

---

## 6. Pointer Capability Detection

Three files are available:

### `hooks/usePrefersReducedMotion.ts`

Reactive React hook. Reads `(prefers-reduced-motion: reduce)` on first render (synchronous) and updates on change.

### `hooks/useMediaQuery.ts`

Generic reactive React hook for any CSS media query string. Returns `boolean`.

### `hooks/usePointerCapability.ts`

Reactive React hook returning `{ isFinePointer, hasHover, isCoarseOrTouch }`. Used in components that need to conditionally render hover-only UI. The interaction modules use `window.matchMedia` directly (not this hook) because they are pure TypeScript rather than React components.

---

## 7. Route-Change Behaviour

Interactions are initialised **once** in `Layout.tsx` on mount:

```ts
// Mount — runs once
useEffect(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  cursorCleanup = initCursorAura(reducedMotion);
  tiltCleanup   = initTilt(reducedMotion);
  revealRef.current = initScrollReveal(reducedMotion);
  return () => { /* cleanup */ };
}, []);

// Route change — refresh scroll reveal for newly mounted elements
useEffect(() => {
  const raf = requestAnimationFrame(() => revealRef.current?.refresh());
  return () => cancelAnimationFrame(raf);
}, [location.pathname]);
```

- `initCursorAura` and `initTilt` do not need re-initialisation — the cursor aura has no route-specific state, and the `MutationObserver` inside `initTilt` automatically picks up newly mounted `[data-tilt]` elements.
- `revealRef.current.refresh()` re-scans the DOM for unobserved reveal elements after the route component has mounted. It runs inside `requestAnimationFrame` to ensure the new DOM is painted before the scan.
- Duplicate global listeners are prevented because cursor aura and tilt are only initialised once.
- `body.reveal-ready` persists across route changes, which is correct — the CSS gate only needs to be enabled once per session.

---

## 8. Cleanup Strategy

| System | Cleanup |
|--------|---------|
| Cursor aura | Removes `pointermove` and `pointerleave` listeners from `document`; cancels any pending `requestAnimationFrame`; removes `--cursor-x` and `--cursor-y` from `:root`. |
| Tilt | Disconnects the `MutationObserver`; calls each element's cleanup function which removes the three pointer listeners, clears any pending rAF and timeout, and clears inline `style.transform` / `style.transition`. |
| Scroll reveal | Disconnects the `IntersectionObserver`; removes `body.reveal-ready`. |

All three cleanups are called from the `useEffect` return function in `Layout.tsx`, which runs when the `Layout` component unmounts (i.e. the React application tears down).

---

## 9. Overdrive — Audit Result

**Decision: dead CSS removed.**

The `body.is-overdrive` rules found in `global.css` were:

```css
body.is-overdrive {
  --color-accent-strong: #a7f3ff;
  --panel-tint-soft: rgba(125, 211, 252, 0.22);
}
body.is-overdrive .site-shell {
  filter: saturate(1.12);
}
```

And in the reduced-motion block:
```css
body.is-overdrive .site-secret-node-core { animation: none !important; }
```

**Findings:**
- No JavaScript adds or removes the `is-overdrive` class anywhere in the source.
- `.site-shell` is defined in `global.css` but is not used in any JSX or HTML file — it is itself dead markup.
- The purpose (an accent colour intensification mode) was never completed.
- No matching markup or clear intended interaction exists.

**Action:** All three rules removed from `global.css`.

---

## 10. Secret-Node — Audit Result

**Decision: dead CSS removed.**

The `.site-secret-node` family of selectors was found in two files:

**`global.css` (reduced-motion block):**
```css
.site-secret-node { transform: none !important; }
body.is-overdrive .site-secret-node-core { animation: none !important; }
```

**`navbar.css`:**
```css
.music-button .site-secret-node-core { width: 0.62rem; … }
```

**Findings:**
- No React component or HTML creates `.site-secret-node`, `.site-secret-node-core`, or `.site-secret-node-ring` elements.
- `.music-button` (which contained the sole structural use of `site-secret-node-core`) is also not instantiated anywhere in the React source — it appears to be an abandoned music player button concept.
- No clear intended interaction or easter egg trigger was identified.

**Action:** All three dead selectors removed from their respective CSS files. The `.music-button` styles themselves are left in place as their removal is outside the scope of this task.

---

## 11. How Future Components Opt In

### Scroll reveal

Add one of the supported CSS classes or the `data-reveal` attribute to the root element:

```tsx
// Named class (pre-registered in REVEAL_SELECTORS)
<article className="story-panel">…</article>

// data-reveal attribute (works for any new element)
<div data-reveal="up">…</div>
<div data-reveal="left">…</div>
```

Elements inside `.page-scene` (i.e. inside `PageHero`) are always pre-revealed and do not need `.is-visible`.

To register a new named class, add it to `REVEAL_SELECTORS` in `src/lib/interactions/scrollReveal.ts` **and** add corresponding hidden/visible CSS rules in `global.css` following the existing `body.reveal-ready` pattern.

### Pointer tilt

Add `data-tilt` to any non-form, non-text-heavy, non-accessibility-critical element. Optional fine-tuning via `data-tilt-max` and `data-tilt-scale`:

```tsx
<article className="my-card" data-tilt data-tilt-max="4" data-tilt-scale="1.01">
  …
</article>
```

Tilt is automatically applied on mount and on route change via the `MutationObserver` inside `initTilt`. No further registration is needed.

**Do not add `data-tilt` to:** form elements, inputs, labels, text-heavy sections (more than a paragraph of body copy), pricing cards with embedded interactive controls, or any element where a transform would move a click target away from the pointer.

### Reduced-motion safety

Both scroll reveal and tilt respect `prefers-reduced-motion` at initialisation time. New components using the hooks (`usePrefersReducedMotion`, `usePointerCapability`) receive reactive updates if the user changes their preference while the page is open.
