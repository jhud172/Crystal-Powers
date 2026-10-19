# Crystal Powers 2.0 — live rendering and matching stills

Current selected-design follow-on:16 October2026. See current acceptance below. The10October implementation and native Aurora page evidence is historical and does not describe the selected Home/Studio consumers.

Original review date:10October2026. Local PC implementation and installed Edge evidence; production deployment and physical-device acceptance remain separate.

## Change and ownership

The previous Blender photographs differed visibly from the browser's camera, exposure and materials. The current five models now have stills captured through the actual `ModelCanvas.tsx` renderer, with the same Balanced profile, authored pose and own-site screen textures. Original Blender scenes, models and photographic renders are retained. No imported assets, dependency installation, account changes or API writes are involved.

`scenePresentation.ts` owns the camera and canonical frame for each model. A contained-camera adjustment preserves that frame across narrower/wider stage ratios. The phone is framed more closely; the legacy crystal's root translation is compensated in its display wrapper. Aurora has brighter restrained illumination; the legacy crystal has clearer frosted/reflected facets. This is art direction, not a claim of physically accurate glass. Screen filtering uses bounded anisotropy. All five stages and the new stills are transparent, allowing each page's semantic appearance colours to show through.

`ScenePoster.tsx` owns dimensioned responsive 800/1600 WebP delivery and PNG fallback. Home, generic model stages, Studio's artefact and the isolated development draft reuse it. Failed new-image delivery falls back to retained photography. About selects the appropriate light/dark artwork family. Native Home controls reserve their action/status/palette rows so changing live/still or closed/open does not resize the artwork surface.

## Reproduction and provenance

- `scripts/scene-photography-fixture.cjs`: isolated read-only loopback harness; imports the actual renderer and matching canonical context module. It adds no product route.
- `scripts/render-live-posters.cjs`: captures twelve exact model/appearance/pose views from the existing source runtime on port 5175. Records hashes for renderer, presentation, quality profiles, own-site screens, models and captures.
- `assets/blender/prepare_live_posters.py --promote`: validates reviewed ignored captures against current inputs, geometry framing and alpha before promoting twelve PNGs, twenty-four WebPs and manifests to `frontend/public/renders/live/`. Run without `--promote` to validate delivered files without modifying them.
- `scripts/verify-poster-browser.cjs` and `assets/blender/compare_live_posters.py`: real renderer/still pairs at three frame ratios; image-outage fallback; independent pixel measurements and retained-photograph negative controls.
- `scripts/verify-scene-delivery-browser.cjs`: actual packaged anonymous Home/Studio, all five native appearances, both poses and phone/desktop viewports; exact delivered image bytes. No API fixtures or writes.

Use the existing approved Playwright runtime and installed Edge through `CRYSTAL_PLAYWRIGHT_MODULE` and `CRYSTAL_BROWSER_EXECUTABLE`. The source photography harness is restricted to port 5175; packaged acceptance is restricted to disposable port 8084. Never use owner credentials or synthetic publications for these checks.

## Verified evidence

Canonical validation passes twelve RGBA captures and twenty-four responsive WebPs, totalling **817,568 WebP bytes**. All source/model/screen hashes agree; alpha is retained; no object touches the sixteen-pixel capture margin. These are additional to the twenty-four retained photographic WebPs, which remain unchanged.

Source browser acceptance passes **110 checks / 36 actual model-pose-frame pairs**. Independent comparison records minimum raw silhouette intersection-over-union **0.9402**, complete bidirectional foreground coverage within one pixel, maximum perceptual mean colour error **5.76/255** and maximum bounding difference **one pixel**. Acceptance requires coverage at least 0.985, perceptual colour error at most 8/255 and bounds within three pixels. Three original photographic negative controls fail the same colour criterion as intended.

The comparison initially used a brightness-derived mask, which misclassified dark device screen pixels, and demanded identical sampled edges from live MSAA and resized WebP. The final comparison uses actual alpha, retains raw overlap/colour diagnostics, and separately checks one-pixel edge coverage and one-pixel low-pass colour. Phone framing and texture filtering were also improved. This measures visual coherence rather than claiming bit-identical GPU and image sampling.

Packaged native acceptance passes **144 checks / 20 five-theme pose pairs**: all thirty-six image responses match their manifests and expected MIME/compression behaviour; responsive appearance/pose selection, aligned native surfaces, phase preservation, no overflow, themed Studio art and zero API writes/browser errors. The original native run failed because auto-sized controls changed the surface height by 52 pixels; reserving control rows fixes that measured failure. Phone open-pose live/still captures were visually reviewed. Both Balanced and a final Automatic native run passed all144 checks; final20-pair native colour error is at most5.22/255. Automatic resolves compact stages to Lighter and wider stages to Balanced. A test-harness attempt used nonexistent option value `auto`; it was corrected to the actual `automatic` value before final acceptance. Native colour diagnostics can be reproduced with `python assets/blender/compare_live_posters.py --native`; source alpha owns silhouette proof, while native screenshots verify the actual composited page colours.

Reports and captures are retained under ignored `.codex-runtime/qa/live-posters`, `poster-pc` and `scene-delivery-pc`. Local pixel agreement does not establish physical phone/touch, sustained thermal/GPU, assistive-technology, background-tab, hosted delivery or full release acceptance.

## Rollback

Restore the previous renderer/presentation and poster consumers together, or return consumers to the retained photographic directory. Preserve original Blender sources and model files. No database migration is required. Re-run canonical hash validation and affected browser checks whenever renderer, model, camera, quality or own-screen inputs change; do not reuse stale capture evidence.


## Current selected-design poster/live acceptance —16 October2026

Accepted3D-03 locally after inspecting the current renderer, presentation/policies and actual product consumers. Liquid Light uses DOM artwork; optional project devices preserve screenshot-first content. The original five-model collection retains its same reviewed photography/renderer/material/camera hashes. No new model, image, material, scene, dependency, API or public project was created or changed.

Fresh `node scripts/verify-poster-browser.cjs`:110 checks/36 actual renderer and responsive poster pairs; `python assets/blender/compare_live_posters.py`: full bidirectional coverage within one pixel, maximum perceptual mean colour error5.7575/255 and maximum bound difference1px. Minimum raw silhouette overlap0.94017 is retained diagnostically; acceptance retains the existing one-pixel/colour/bounds limits. Three deliberately mismatched retained photographs are rejected as negative controls. `python assets/blender/prepare_live_posters.py` validates12 RGBA poses/24 responsive WebPs,817568 WebP bytes, exact renderer/model/screen hashes, transparent/unclipped capture bounds; no promotion/provenance refresh occurred. Dark laptop live/poster pixels were visually compared.

Replaced the obsolete Aurora-homepage assumptions in `verify-scene-delivery-browser.cjs` with current packaged Home/Studio artwork and actual optional project-device controls. Final suite244 checks:36 shipped images/hash/MIME/compression pairs, all five appearances at390/1440,30 ready device views (three devices/five appearances/tablet768 anddesktop1440), exact reserved canvas geometry, screenshot/close/focus return, phone still-only policy and zero API mutations/uncaught errors. Home/Studio are actual anonymous routes. Device data/media are explicit read-only response fixtures using only approved Clare JSON/captures; this does not publish a project or accept HOME-03. Native Dark laptop and Light phone captures reviewed. Sticky headers can appear in tall element screenshots; no product layout change was made from that capture artefact.

The first current-page run timed out waiting for animated artwork to become geometrically stable. Corrected the verifier to scroll its stable section container while decoding the actual artwork. This was a harness failure; no animation/requirement was disabled. Final format-version2 rerun records all30 native view dimensions/tiers and passes. Updated `compare_live_posters.py --native` to validate the current244-check/30-view report; its output clearly separates source optical pixels from native packaged delivery. It no longer falsely expects20 native Aurora pose pairs or claims current native whole-page colour equivalence from historical captures. Script syntax and whitespace checks pass.

Current jar remains `536db71b9d5a9f9c89099eb773ed3c3e1cf32e75dd079c18662dd9e8c2cf46b4`; no product source changed in this checkpoint. The preceding full release98 H2 tests/47 PostgreSQL team tests retains its exact scope; no unrelated full build/test rerun was needed for verifier/docs changes. All reports/images are ignored under `.codex-runtime/qa/poster-pc`, `scene-delivery-pc`, `poster-current-*` and `scene-current-*`.

Counts169 named/115 checked/54 open; all209 checkboxes/132 checked/77 open (17 verified subchecks and23 shared gates). Physical GPU/thermal/touch, native background-tab acceptance, whole-page accessibility/visual acceptance, real publication/provider/operating facts and deployed release remain open. Existing PC changes remain uncommitted; no push, external account/provider action or deployment occurred.
