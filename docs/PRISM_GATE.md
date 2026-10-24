# Prism Gate — precision refinement, 23 October 2026

## Optical crystal finish for the rounded arrows - 23 October 2026

- [x] Refine the corner glass to a paler optical tint, IOR1.5,0.32-unit depth,0.035 roughness,0.025 coat roughness and0.96 transmission where the tier permits it. The separate diamond coating remains.
- [x] Composite clear face-on surfaces and denser grazing edges over the real DOM wave using surface-normal Schlick Fresnel. Add restrained optical softbox glints that respond to rotation without perimeter meshes, outlines, new textures or an ambient render loop. Keep polished roughness when Lighter omits transmission, avoiding the previous0.22 frosted approximation.
- [x] Rebuild the Blender sources, GLB and responsive posters with matching view-dependent alpha for the offline renders; cache revision `prism-optical-06`. The initial contract correctly rejected the alpha exported from a linked Fresnel graph. Fixed the recipe to export the explicit0.86 base alpha and reconnect the view-dependent graph for Blender's renders; browser owns its equivalent shader treatment.

End-of-batch checks: Blender5.2.1 generation completed, `python assets/blender/prepare_prism_gate.py` passed, `npm.cmd --prefix frontend run build` passed, and `node scripts/verify-prism-gate-browser.cjs` passed all40 checks. Separate low/standard live browser passes confirmed the requested tier, closed/angled scenes and zero captured shader/runtime errors; screenshots reviewed under `.codex-runtime/qa/prism-precision-20261023/optical-*.png`. DOM artwork is alpha-composited, not captured by Three's transmission buffer; true optical refraction of that DOM wave is not claimed. Existing Three chunk-size warning remains. Backend/provider/deployed/physical-device acceptance was not rerun for this material-only change.

Current GLB:237,204 bytes; SHA256 `5dbcb2ad9780191498e1cb2fb6d7c51ac83083e19a8be4d29c2ed4d432da9a00`. This supersedes prior material parameters and hashes; model geometry, authored animation, lowered projector, hologram, star drift and interactions remain. Changes are uncommitted.

## Slow independent star drift - 23 October 2026

- [x] Give every recycled star an independent random heading and2-5 CSS-pixel/second drift speed, with a gentle sinusoidal heading variation instead of jitter. Lighter mode uses55% speed.
- [x] Keep drift independent of mouse-repulsion spring offsets; freeze ambient positions during hyperjump so the outward/reverse journey stays coherent. Existing bounded population, recycling, reduced motion, pause, hidden/offscreen suspension and cleanup remain.

The change is owned by `frontend/src/features/experience/PrismStarfield.tsx`. The Prism browser verifier now samples actual canvas arc positions to check slow movement without pointer input and movement in both directions on each axis. No dependency or backend change. End-of-batch verification: `npm.cmd --prefix frontend run build` and all40 checks in `node scripts/verify-prism-gate-browser.cjs` passed against the built local preview with read-only synthetic APIs and no captured browser errors. Existing Three chunk warning remains; backend and full release QA were not repeated for this focused animation change.

## Hologram inside the Prism Gate - 23 October 2026

- [x] Move the studio information from below the scene into a holographic overlay between the four glass arrows.
- [x] Add a translucent cyan glass panel, illuminated edge, projection beam and short opening reveal; retain real DOM text, service buttons and link.
- [x] Lower the authored open diamond from Z1.87 to Z1.05. Rebuild GLB, both editable Blender scenes and all responsive fallback posters; preserve the closed pose and exact reversible 2.5-second path. Cache revision: `prism-hologram-05`.
- [x] Keep the projection and draggable hit surface as siblings, so panel buttons/links do not toggle or rotate the model. Preserve reset, pulse, star jump, Escape/focus, reduced motion and context-loss/retry behaviour.
- [x] Fit the panel to a shared 4:3 model frame. Compact screens keep readable type and 44px service targets, with internal scrolling for content that exceeds the aperture. The projection remains screen-facing when the glass model rotates.

End-of-batch verification: Blender 5.2.1 background generation completed; `python assets/blender/prepare_prism_gate.py` passed geometry/material/animation/poster checks and the new lower-projector endpoint assertion. `npm.cmd --prefix frontend run build` passed. `node scripts/verify-prism-gate-browser.cjs` passed38 installed-Edge checks against the built local preview, including the new scene containment and320/390/768px panel bounds. Six further compact-browser assertions passed for service interaction, keyboard access to the internally scrolled link, and Escape at320/390px. Reviewed desktop and mobile fallback screenshots. Reports/screenshots: `.codex-runtime/qa/prism-precision-20261023/`. No captured runtime errors. Existing deferred Three chunk-size warning remains. Backend, providers, physical devices and deployed release QA were not rerun for this frontend/model change.

Current GLB:237,280 bytes, SHA256 `4c6aec622337e655354b961198a0dc4faacbe89e5d7847c37bde998b375aac47`. This entry supersedes older descriptions of information appearing below the stage and earlier asset hashes. Changes remain uncommitted.

## Rounded liquid-glass corners — 23 October 2026

This material/geometry checkpoint supersedes the earlier rimmed Prism Gate description.

Live visual review found an overly white fill because the DOM wave is outside Three's transmission capture. The corner material now uses exported BLEND alpha0.68 and matching browser transparency/depth-write handling, so the real wave remains visible behind it. This is composited transparency plus shallow scene refraction; it does not claim physical refraction of DOM pixels. The no-rim/BLEND-alpha asset checks and original geometry/animation checks pass on final GLB SHA256 `05ef5945d9d7dbd3c3750b2b60c4eb54b33a71d975b9810dcb8d019e52022c6f`.

Final grouped checks: asset preparation/no-rim contract, decoded geometry and animation-contract checks pass; production frontend build passes. Prism browser34 + public shell75 = **109 scoped browser checks**, with zero captured runtime errors. Includes an explicit live-WebGL assertion after dragging, opening/reversal, starfield, pulse, context-loss/retry, five appearances and responsive/reduced-motion paths. Blender closed/open renders reviewed; rotated live capture is `liquid-glass-angled.png` in the ignored QA report folder. Existing Three chunk warning remains; full backend/device/deployment acceptance was not rerun for this asset/material batch. All current glass work and prior starfield changes remain local/uncommitted.

Rebuilt the four corner arrows as continuous rounded volumes: broad0.28-unit outer bends,0.24-unit inner bends, capsule ends and13 elliptical depth rings with0.075-unit face roll. Removed all eight neon-rim meshes and the CSS silhouette halo. Glass now uses a pale cyan tint,90% transmission,0.085 roughness, full clearcoat and faint whole-body emission; browser refraction is shallow (0.12 thickness,1.38 IOR). The faceted centre and reversible2.5-second motion remain. This is an original liquid-glass-inspired material, with natural curved-surface reflections rather than separate luminous outlines.

Original Blender recipes and both editable scenes/posters regenerated; cache key `prism-liquid-04` invalidates previous deliveries. Actual exported GLB237,280 bytes,7 meshes,5,532 vertices/8,716 triangles (fewer triangles than the previous rimmed version). Geometry decoding, indices/normals/transforms/UVs, exact inverse animation and the explicit no-rim asset contract pass. Build passes; final browser results are recorded below. No new dependency or backend/provider change; existing uncommitted full-screen/starfield work is preserved.


## Full-screen prism and hyperjump — 23 October 2026

Grouped verification after the camera/framing and slower-travel corrections: `npm.cmd --prefix frontend run build` passes; `verify-prism-gate-browser.cjs`33 checks and `verify-liquid-shell-browser.cjs`75 checks pass (**108 scoped browser checks**, zero captured runtime errors). This covers fixed wave position, full viewport stage, actual pointer repulsion, all stars departing/returning, pause, surface drag/click, interrupted opening, context-loss/retry/Escape, five appearances,320/390/768 layouts, enlarged text and reduced motion. Closed and travelling renders reviewed. Final main136.31kB/40.52gzip, CSS172.28/30.36; existing deferred Three chunk warning unchanged. No full backend, physical-device/thermal, full assistive or deployed acceptance is claimed. Local reports/screenshots remain under `.codex-runtime/qa/prism-precision-20261023` and `liquid-shell-d2`.

James requested a viewport-fixed animated wave behind scrolling content and a full-screen Prism Gate directly below the hero. Implemented a full-width, minimum-viewport-height stage, matching live/poster camera framing, pointer-repelling twinkling stars, bounded recycling (120 desktop /48 compact or lighter), and a reversible2.5-second outward/inward star jump with motion trails. Travel begins with the authored opening; all stars leave the screen while open and return on closing. Pointer events pass through the decorative layer to the original crystal controls.

`PrismStarfield.tsx` owns the separate2D canvas, recycled particles, pointer refs, visibility/resize subscriptions and cancelled animation frame. It stops drawing at the empty jump endpoint, suspends offscreen/hidden, clamps DPR to1.5 (1 in lighter mode), and uses a static field for reduced motion or the independent Pause stars control. No dependencies, external assets, backend or provider changes. The autonomous wave is fixed in viewport coordinates; foreground sections scroll normally without scroll-jacking. Detailed results follow in `PRISM_GATE.md`; full release/device acceptance remains open.


## Source and integration

Pulled remote updates and merged `origin/main` at `ea48e65` into `James/crystal-powers-2-completion`, preserving the later 2.0 logic/design work. The incoming opening was previously deleted on this branch; it is now deliberately integrated below the retained autonomous Liquid Light hero. Its stylesheet is explicitly imported. No deployment or remote push is part of this task.

Original reproducible recipe: `assets/blender/build_prism_gate.py`. Editable rest/open scenes: `assets/blender/scenes/prism-gate-{closed,open}.blend`. Web delivery: `frontend/public/models/prism-gate.glb` and transparent PNG/WebP posters under `frontend/public/renders/`. All geometry/materials are original, with a deterministic packed microfinish; no third-party downloads or new dependencies.

## Design and motion

Four slimmer optical L profiles share rounded silhouettes with eight concentric light guides. Profile fillets are 0.075 units; face chamfers are 0.018 units; guides are 0.0075 units. Glass depth is 0.34 units. Corner centres move symmetrically from ±0.76 to ±1.02 units. The central diamond loses the four decorative blocks and uses a smaller optical aperture. Muted glacial glass and lower emission replace the heavier neon treatment. Browser and Cycles lighting are separate renderers, not pixel-identical evidence.

Five pivots export `CrystalOpen` / `CrystalClose`: 121 baked samples over 2.5 seconds at 48 fps, starting at frame zero. Corner expansion uses minimum-jerk easing. The projector begins after 12% of the timeline, lowers by 0.28 units and hinges about one axis from 90 degrees to approximately 7 degrees. Quaternion samples avoid a compound spin. Closing follows exactly the same path backwards; browser velocity easing preserves in-flight reversal. The previous full-stage CSS translation/scaling was removed so two animation systems no longer move the object independently.

Click / Enter / Space opens or closes; drag and arrow keys rotate; Reset view returns the inspection angle; Pulse light brightens materials and settles over 2.4 seconds. Escape dismisses, retires the canvas and restores trigger focus. WebGL is explicitly activated and does not reopen itself after dismissal or steal another active stage. Existing shared adaptive quality, shader preparation, cancellation, resource cleanup and context-loss handling are retained. Cache revision: `prism-precision-02`.

Projection content uses ordinary document flow, shared appearance tokens and a short 550 ms reveal / 350 ms copy transition. It cannot overlap the artwork or controls because of enlarged copy. Hidden content is inert. Screens below the shared 768×600 eligibility boundary, reduced effects and system reduced motion use still artwork with all information accessible; no forced intro. Offscreen/hidden stages suspend/unmount the canvas. The Liquid Light hero remains autonomous and unchanged.

## Regeneration

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python assets/blender/build_prism_gate.py
python assets/blender/prepare_prism_gate.py
node frontend/scripts/verify-animation-contract.mjs
npm.cmd --prefix frontend run build
```

Use the installed Blender path on each machine. The live Blender MCP connection was unavailable here; installed Blender 5.2.1 LTS built the real scenes and Cycles renders in background mode. The asset preparer validates embedded buffers, materials, pivot roles, finite samples, quaternion normalisation, bounded per-sample movement, exact reversed paths and transparent poster dimensions, then writes responsive WebP files.

## Deferred grouped verification

The first exported samples started at 1/48 second; switching the authoring timeline/NLA tracks to frame zero corrected the offset. Initial visual inspection also caught a skewed rest pose from compound Euler rotation; the final single-axis hinge restores a face-on diamond. Failed evidence remains in local logs. Asset/animation validation then passed. Final build/browser results are recorded below. Physical-device performance and deployed acceptance remain separate open gates.

The extra real `WEBGL_lose_context` check found a keyboard recovery defect: retry succeeded but its disappearing button left focus on the document. Retry and failed-control transitions now transfer focus to the persistent trigger. Original failure evidence: `.codex-runtime/qa/prism-precision-20261023/context-retry-focus-failed.json`. Final relevant checks are rerun after this correction.

Final correction gate: frontend production build passes; Prism browser24 + public shell75 + shared device-model24 = **123 scoped browser checks**, all passing with zero captured runtime errors. Actual WebGL context loss, fallback, retry and keyboard Escape/focus recovery pass. Asset and animation-contract scripts pass; GLB235,724 bytes,15 meshes/9,340 triangles. CSS171.43kB/30.16gzip, main133.04/39.06, deferred Three1,007.40/276.32; existing large-chunk warning remains. Backend/database/provider/device/deployed suites were not rerun for this frontend/asset-only batch. Browser evidence is built-preview/synthetic GETs, not a new packaged or production release. Reports/screenshots: `.codex-runtime/qa/prism-precision-20261023`, `liquid-shell-d2`, `device-quality-d1`.


## Latest Prism interaction refinement — 24 October 2026

Completed the requested frontend batch before running grouped verification:

- [x] Keep the DOM hologram stationary; composite the transparent glass canvas above it, with pointer events passing through to the actual controls.
- [x] Close with a 1.15-second fade/blur and contraction towards the projector, while reversing the authored crystal motion. Hide and make controls inert immediately; retire WebGL after closing and restore trigger focus. In-flight reversals remain supported.
- [x] Make the first drag visible immediately through the rendered artwork, then prepare the closed live scene only after deliberate interaction. Initialise the renderer at the current angle; retain direct manipulation on compact/reduced artwork. No automatic arrival WebGL.
- [x] Update Prism controls, service tabs and shared chapter links with rounded glass styling, hover glow, pressed feedback and keyboard focus.
- [x] Remove Pause/Resume stars controls; preserve automatic offscreen/reduced-motion resource policy.
- [x] Restore cyan pulse in the actual optical-glass shader plus a brief soft glow, with full settling after 2.4 seconds.
- [x] Restore native wheel scrolling over the glass and hologram; remove contained overscroll and keep vertical touch panning through the canvas wrappers.

Verification: `npm.cmd --prefix frontend run build` passes. Grouped browser checks: Prism **50**, shared motion **50**, quality **95**, delayed observers **4**, public section navigation **139** = **338 passing assertions**, with zero captured runtime errors. Five appearances, 320/390/768/1440px coverage, doubled text, native wheel input, actual shader uniform writes, context loss/retry and keyboard focus included. Read-only API fixtures on built preview8084; this is frontend evidence, not a refreshed packaged/backend/provider/device acceptance. The existing deferred Three.js chunk warning remains. No dependency install, backend change, commit, push or deployment for this refinement.

Evidence: `.codex-runtime/qa/prism-interaction-20261024/report.json` (screenshots alongside), `motion-pc/report.json`, `quality-pc/report.json`, `batched-intersection/report.json`, `section-anchors-preview-prism/report.json`. The first stationary-transform assertion used exact serialised subpixels and was corrected to compare the DOM matrix and before/after bounds. A navigation runner initially required packaged APIs on preview; added an explicitly labelled opt-in read-only fixture mode (`CRYSTAL_QA_READONLY_FIXTURES=1`), retaining real APIs by default. Both corrected journeys pass. The earlier packaged checkpoint below is historical; this frontend build supersedes its UI, without rerunning its unrelated backend suite. Original release blockers and named-item totals remain unchanged.

## Deeper reversible starfield — 24 October 2026

- [x] Add a bounded distant star population with smaller, dimmer perspective at rest and staggered acceleration from the vanishing point. Desktop:120 near +120 distant stars; compact/light-motion budget:48 +48.
- [x] Extend travel to6 seconds (4.5 seconds with light motion). Distant stars continue rushing after the crystal finishes opening; travel ends with zero visible stars and stops requesting frames.
- [x] Use one continuous depth/travel coordinate in both directions. In-flight reversal retains the population and current position; returning to rest restores nearby and distant ambient stars. Keep pointer repulsion, offscreen cleanup and reduced-motion still artwork.

Grouped verification after implementation: production frontend build passes; **53 Prism +50 shared motion +4 delayed-observer checks =107 passing assertions**, zero captured runtime errors. Built preview8084 with labelled read-only API fixtures; no new backend/provider/device/release acceptance. Initial browser attempts hit a stopped preview (connection refused); restarted preview8084, then reran all three suites successfully. Existing deferred Three.js size warning remains. Main JS153.75kB/46.19gzip versus153.45/46.03 before this refinement; no new dependency. Evidence:`.codex-runtime/qa/prism-depth-20261024/report.json`, `motion-pc/report.json`, `batched-intersection/report.json`. Preview remains running; no commit/push/deployment.
