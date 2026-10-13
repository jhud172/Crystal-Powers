# Crystal Powers — selected 3D identity

Selected direction: concept 04, a faceted blue crystal with a bright white core. This is an original Blender reconstruction, rather than the generated PNG mapped onto a plane.

Run `assets/blender/build_logo.py` with the existing Blender 5.2.2 runtime in background/factory-startup mode. The recipe does not touch an open scene, existing website models or provider settings.

## Editable construction

- A closed solid diamond with twenty front, side and rear optical facets, a raised white core and real three-segment edge bevels.
- Separate sapphire, cobalt, ice-blue, pale-blue and luminous-white materials; metallic white-blue bevel highlights.
- Exact `Crystal Powers` text as an editable font curve, with solid extrusion and four-segment rounded bevels, plus an independent wider reflective backing.
- Four named studio softboxes, invisible reflection environment and an orthographic camera with a mild three-quarter angle to show the depth.
- Native scene: `assets/blender/scenes/crystal-powers-logo-3d.blend`. The complete identity is parented to a named root for moving/scaling together.

The font is installed Windows Segoe UI Semibold, already used by the business-card recipe. It is packed into the native document for editing; delivery GLB contains mesh outlines, not a standalone distributable font. Existing website font delivery remains unchanged.

## Delivery

- `crystal-powers-logo-3d.png`: 2400 × 1000 transparent RGBA full identity.
- `crystal-powers-emblem-3d.png`: 1400 × 1400 transparent RGBA emblem.
- `crystal-powers-logo-3d.glb`: self-contained mesh/material export of the emblem and extruded lettering, without cameras, lights or a background plane.
- `manifest.json`: original construction and delivery metadata.

The Blender source retains editable lettering. The GLB uses converted duplicates which are removed from the native scene after export. Cycles photography and glTF real-time material appearance should be reviewed separately. These assets are not automatically installed into the website, and do not alter its phone/no-3D policy.

## Website integration

`python assets/branding/prepare_logo_web.py` trims transparent margins, creates responsive WebP/PNG delivery, isolates the rendered wordmark, makes the favicon and copies the original GLB into public models. Original Blender renders remain unchanged.

`BrandIdentity.tsx` owns header/footer interaction and fallbacks; `BrandLogoCanvas.tsx` is lazy-loaded only by an explicit eligible logo click. The six material groups of the crystal separate along their geometric directions and reverse with frame-rate-independent exponential easing. The wordmark and overall pivot remain anchored. The canvas renders on demand and stops invalidating at rest. Site stage ownership, visibility, quality and reduced-effects policy remain authoritative. Phones use a short 2D pulse without a canvas; reduced motion disables the decorative interaction while the home link remains usable. Private headers use the still emblem.
