# 05 - Animation And Motion

## Purpose

Use for scroll reveal, cursor aura, tilt, route transitions, CSS transitions, GSAP, Motion, or animation planning.

## Responsibilities

- CSS: simple hover, focus, and lightweight transitions.
- Existing interaction foundation: reveal, cursor aura, and tilt in `frontend/src/lib/interactions/`.
- GSAP: coordinated timelines and ScrollTrigger only if explicitly installed/authorised.
- Motion: mount, unmount, layout, and route transitions only if explicitly installed/authorised.
- React Three Fiber: 3D scene animation.

## Rules

- No animation without purpose.
- No long page-entry delay, scroll-jacking, inaccessible pinned sections, permanent large-area blur, or continuous animation on every page.
- Reduced-motion fallback is required.
- Simplify mobile timelines.
- Disable pointer effects on coarse-pointer devices.
- Do not update React state on every pointer move.
- Avoid duplicate listeners and duplicate ScrollTrigger registration.
- Clean up timelines, observers, listeners, timers, and route transitions.
- Critical content must remain visible without animation.

## Document

For each animation, document trigger, duration, easing, cleanup, mobile behaviour, reduced-motion behaviour, and failure fallback.

## Validation

Verify no duplicate global listeners, no hidden critical content, no reduced-motion regression, and no new main-bundle growth without justification.

