# Crystal Powers 2.0 — asset provenance and export review

Current follow-on: [POSTER_LIVE_REVIEW_2_0.md](POSTER_LIVE_REVIEW_2_0.md) resolves the local poster/live mismatch with actual-renderer transparent captures, shared framing and native five-theme verification. Current16October3D-03 acceptance is recorded there; physical/hosted/full acceptance remains separate. Original review below retains its dated evidence.

## Implementation brief

Objective: finish the current collection's provenance/export validation and reduce avoidable laptop draw calls while retaining the original editable scenes, hinge choreography, named screen metadata and real project-image replacement. Inspect actual GLBs/accessors rather than treating the manifest's counts as geometry proof. Poster/live material/framing and physical GPU acceptance remain separate.

Owners: original recipes/scenes in `assets/blender/`, exported models/stills in `frontend/public/models/` and `frontend/public/renders/`, runtime scene/material/screen handling in `features/experience/`. No downloaded or purchased model, new dependency, API/data/price/provider change. Any optimisation must be reproducible, retain source scenes, prove finite geometry/normals/indices/UVs/transforms, preserve self-contained binary resources and animation/screen contracts, then pass actual browser loading/animation/screenshot replacement/fallback checks before replacing a delivered model.

The existing prepare script checks header/count/metadata contracts and generates posters, but does not decode geometry arrays or validate their actual values. Add a read-only deeper model verifier, record hashes/provenance and measured results. Keep failed checks visible and fix the underlying export/runtime issue; do not relax the intended contract solely to obtain a pass.

Rollback: restore the previous web export using Git, keep original `.blend` sources and recipes unchanged unless explicitly improved. No data migration. Current collection acceptance does not pre-approve future imported assets or establish permission for client images; those stay behind the existing publication controls.

## Current collection provenance

The current five-model collection is original repository-authored geometry. `build_assets.py` creates the crystal/laptop/monitor/phone meshes and material factors procedurally; `build_observatory.py` creates Aurora geometry, named opening pivots and deterministic packed mineral texture. The retained `.blend` scenes contain the corresponding original objects, materials, cameras and animation. No downloaded or purchased mesh, texture, HDRI, decoder or externally generated visual is used by these exports. Runtime environment lighting is constructed from Three geometry/lightformers rather than a downloaded map. Blender is an authoring tool; this record does not treat its software licence as an asset licence.

| Delivered model | Original recipe / retained scenes | Bytes / meshes | Relevant contracts |
| --- | --- | ---: | --- |
| Crystal | build_assets.py; crystal-dark/light + two cinematic scenes | 227,840 / 5 | CrystalTurn; legacy original optical sculpture |
| Laptop | build_assets.py; laptop-dark/light; lossless export step below | 1,063,912 / 7 | LaptopOpen 3.75 s; DisplayHinge; Screen aspect 1.715909 |
| Monitor | build_assets.py; monitor-dark/light | 62,828 / 5 | Screen aspect 1.778947 |
| Phone | build_assets.py; phone-dark/light | 91,180 / 7 | Screen aspect 0.483871 |
| Aurora / Observatory | build_observatory.py; four dark/light closed/open scenes | 423,864 / 52 | CrystalOpen/Close ~2.417 s; 22 pivots / 12 facets / original embedded mineral texture |

Posters/films are renders of those original scenes. The two `studio-screen.png` / `studio-mobile.png` textures are captures of this studio's own earlier Crystal Powers page, not client work; desktop capture was visually inspected. Actual client screenshots use the existing owned upload/publication permission boundary. Only Clare's Life Celebrations is approved as real public portfolio content. Website font delivery/provenance review remains separate; screenshots do not establish a font redistribution licence.

Decoded current GLB SHA-256 identities:

```text
crystal      6ee2932d8051bf380167d625b79d934bf5526776634b67ab29acb6c043348be1
laptop       2cb80444bd5e56a390fdfb86392ff1f968654dd543d19a60ee21e089a7434646
monitor      bd010785c69687d3e14974c9ab7dff3238f424ff1cf537447d563df200b235ca
phone        bfb5113ee043db454f5ac9770b1f4f378be12f2f029233bd53e4febec9df6676
observatory  f37548366d608406f1f2ec748b6483c39c8ca8525af0212a1460816bd5bfb835
```

## Geometry and optimisation evidence

`verify_model_geometry.py` decodes every accessor in all five GLBs: finite positions/normal values, unit normals, valid triangle indices and vertex/UV counts, chunk/accessor/view bounds, self-contained buffers/images, transform/quaternion/hierarchy integrity, actual UV-corresponding rectangular screen dimensions/aspect, clip times/output quaternions and named hinge/opening targets. It does not certify manifold topology, physical GPU performance or optical poster/live equivalence. The initial verifier assumed mesh-local Y-up screens; the real exporter retains an axis conversion on a parent, so the correct test measures UV-corresponding geometry independently of pose.

Laptop baseline: **1,322,404 bytes / 104 meshes / 38,103 export vertices / 30,902 triangles / four materials**. Final: **1,063,912 bytes / seven meshes / 35,714 vertices / same 30,902 triangles/four materials**. Approximately **19.5% smaller**, with 97 fewer mesh primitives. `optimise_laptop_export.py` merges only unanimated translated static children with the same parent/material, removes irrelevant cube UV seams from merged untextured parts and deduplicates identical position/normal data. It preserves the separate screen's full UVs/extras, the hinge node, exact keyframes/interpolation and authored material values. Repeating the export is byte-identical. No new geometry tier is justified solely by this local measurement: the same improved export serves both widths; physical benchmarks/quality tiers remain PERF-02/03.

`compare_laptop_exports.py` independently matches all **30,902 world-space triangles**, including winding and shading normals, rather than assuming a mesh-count reduction preserves appearance. Maximum position difference **5.96e-8**; minimum normal dot **0.99999987**; materials/hinge keys identical. The initial Blender-join candidate failed because normals on thin bevel surfaces changed; it was rejected. Final consolidation uses decoded export data without recomputing normals. Centroid bucket neighbours address floating-point bucket boundaries while retaining the <10 µm position and >0.9999 normal-dot criteria. No failed candidate was promoted.

Real installed-Edge comparison: **18 passing checks**, original/candidate ready scenes, real screenshot replacement, rotation/reset/authored animation, mobile/desktop bounds, native close/focus, model-outage screenshot/retry/close and no API write/page error. A single controlled demand rotation records **143 → 46 instrumented WebGL draw submissions**, including shared scene/environment work, not just model primitive counts. This is local rendering-submission evidence, not hardware frame time/INP/thermal or physical phone proof. Baseline/candidate desktop and candidate mobile images were visually compared. Case/image responses are explicitly labelled read-only browser fixtures; no public project was created.

Final packaged repeat: **19 checks pass**, including Resource Timing proof that the browser consumes the exact promoted 1,063,912-byte candidate. HTTP200/hash also matches the delivered file; no-store model delivery remains. Actual renderer reports ANGLE/NVIDIA RTX3070Ti/D3D11. An initial delivered-mode fixture incorrectly routed the baseline for both variants; corrected to baseline-only routing, with raw failed report retained. Final measured submissions again 143→46. Home101/static HTTP51 refresh; default frontend662/bootJar/contracts pass. All original scenes/poster bytes stay unchanged. This proof does not accept ASSET-04/3D-03, physical/GPU frame-time/thermal or hosted release gates.

`prepare_web_assets.py --validate-only` now checks the existing **24 responsive WebP** posters and refreshes the model manifest without re-encoding unchanged imagery. Geometry-consistent laptop posters remain; final material/framing/exposure matching for the whole collection remains 3D-03/ASSET-04. Source scenes/films are retained.

## Reproduce / safely promote an export

```powershell
python assets/blender/verify_model_geometry.py
python assets/blender/optimise_laptop_export.py --source frontend/public/models/laptop.glb --output .codex-runtime/qa/laptop-optimised.glb
python assets/blender/compare_laptop_exports.py frontend/public/models/laptop.glb .codex-runtime/qa/laptop-optimised.glb
python assets/blender/prepare_web_assets.py --validate-only
node frontend/scripts/verify-animation-contract.mjs
```

For comparative browser testing after promotion, supply `CRYSTAL_LAPTOP_BASELINE` pointing to a retained pre-optimisation export and `CRYSTAL_LAPTOP_CANDIDATE` to the candidate; both stay local. Original baseline SHA-256: `44dbf03feb4aef4c424510735902cbdcafaf7b7aea2d9c9835709384ecef3477`. Running comparison against two identical optimised files cannot prove the original draw reduction. Authoring changes require first re-exporting the original laptop from its retained scene, then validating a separate optimised candidate. Do not run broad re-export/render commands merely to refresh this one model. Current PC Blender is **5.2.1 LTS** at `C:/Program Files/Blender Foundation/Blender 5.2/`; the earlier portable 5.2.2 location is a historical laptop note and is absent on this PC.
