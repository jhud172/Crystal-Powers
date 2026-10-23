# Prism Gate — precision refinement, 23 October 2026

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
