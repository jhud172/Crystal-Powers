# Rendering quality — 10 October 2026

Current follow-on: [POSTER_LIVE_REVIEW_2_0.md](POSTER_LIVE_REVIEW_2_0.md) resolves the local poster/live mismatch with actual-renderer transparent captures, shared framing and native five-theme verification. Audit133/108; physical/hosted/full acceptance remains separate. Original review below retains its dated evidence.

## Purpose, scope and ownership

PERF-02 supplies bounded rendering choices for the original scenes without adding a shader stack, dependency, model copy or client publication. `features/experience/renderQuality.ts` owns the pure profiles; `useEffectsPreference.ts` persists harmless presentation choices; `ExperienceContext.tsx` shares them; `Layout.tsx` exposes labelled native controls. `ModelCanvas.tsx` applies the profile to the actual stage dimensions. The accessibility guide describes the same choices. Routing, owner security, enquiries, uploads, pricing and existing model/animation/screen contracts are unchanged.

Automatic chooses Lighter at **480 CSS stage pixels or below**, Balanced above. It does not fingerprint a GPU or claim to identify a physical phone. A private preview's actual iframe stage width governs its profile, rather than the enclosing owner's window width. Explicit Lighter/Balanced/Detailed remains available. Reduce effects disables the selector and removes optional 3D; system reduced motion still suppresses the automatic Aurora scene and decorative animation. Detail never authorises motion or extra stages.

| Setting | Internal tier | Maximum DPR | Environment cube face | Environment sphere segments | Native transmission target scale | Glass treatment | Lightformers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lighter | low | 1 | 128 | 16 × 8 | .25 if used; transmission disabled | Frosted reflective surface | 2 |
| Balanced | standard | 1.5 | 256 | 32 × 16 | .5 | Authored Aurora glass / existing optical-crystal treatment | 3 |
| Detailed | high | 2 | 512 | 48 × 24 | 1 | Same authored treatment at greater resolution | 3 |

DPR remains bounded by the browser/device ratio. Geometry control applies to the generated environment sphere. Original authored model geometry is shared across tiers: the validated seven-mesh laptop already reduced work on both tested widths. No unverified model decimation or advertised physical LOD. Reflections/environment are generated locally once per profile/appearance; no downloaded HDRI or decoder. Detailed is opt-in and explicitly described as using more power.

Native Three physical transmission supplies its existing sampling; resolution/activation controls its cost. The old custom `MeshTransmissionMaterial` branch checked underscore names against exported space-separated names, so it never applied to the original crystal. Removing that unreachable shader avoids activating multiple unbenchmarked backside/sample passes. No bloom or custom multisample refraction stack is added. The lazy scene chunk shrinks **49.26/16.21 → 35.38/12.42 kB gzip**; the shared preference/control adds **107.16/31.03 → 109.01/31.56 kB entry**, CSS **93.55/17.73 → 94.03/17.80**. Existing Three vendor warning remains.

## Verification and failures fixed

`scripts/verify-quality-browser.cjs` uses labelled read-only case/own-site image fixtures and actual shipped GLBs. It exercises native preferences/Escape/focus, all three device scenes and Aurora at all tiers, actual drawing-buffer DPR, 390/1440 automatic changes, saved preferences, Aurora animation/canvas continuity, reduced-motion/effects precedence, five appearances and the accessibility guide. It instruments actual WebGL draw and texture-allocation calls rather than treating the tier label as rendering evidence. No API writes or uncaught page errors.

Initial verification caught an implementation error: imperative `setDpr` was overwritten during Canvas configuration/parent updates. DPR now belongs to declarative Canvas configuration; actual stage width feeds the parent profile without replacing the animated model. Changing appearance/profile regenerates the one-shot environment while model pose remains continuous. A separate first wait timed out because the native header action scrolls a case scene offscreen, where its existing policy intentionally suspends it. Returning to the scene now forms part of the test; visible Aurora separately proves the same canvas and uninterrupted opening. One early source refresh wait timed out; the test now requires the mounted opening after reload before claiming a still-state pass. Stable source and packaged repeats are recorded in current progress; no acceptance threshold was weakened. A first TypeScript build also caught declaration ordering and was corrected before runtime verification.

Installed Edge reports **ANGLE / NVIDIA RTX 3070 Ti / D3D11**. At emulated DPR2, the same 1296 CSS-pixel laptop stage produces drawing buffers **1296 / 1944 / 2592 px** wide. Its opaque meshes retain approximately 4,800 draw submissions over each 2.8-second hinge sample across tiers. Browser animation-frame intervals are around **4.2 ms median / 4.3 ms p95** on this PC; these are browser scheduling diagnostics, not GPU render times, physical-mobile performance or thermal proof. Aurora measured targets include **462 × 351** Balanced transmission and **1234 × 937** Detailed transmission, plus the actual 256/512 environment faces. Low uses simpler reflected glass. Absolute frame-time/quality acceptance on weaker physical devices remains PERF-03.

Before/after dark/light Aurora and device tier screenshots are under ignored `.codex-runtime/qa/quality-pc`. Visual review retains readable real screenshots, authored form and usable controls. **3D-03/ASSET-04 remain open:** original Cycles posters have brighter photographic floors and different framing from the live transparent scene; quality choices alone do not resolve that mismatch. Shared motion/visibility policy and release acceptance also remain separate open gates.

## Reproduction and rollback

Use the installed Playwright module and Edge path documented in the current handover, set `CRYSTAL_QA_URL` to isolated loopback 5175 or 8084, then run `node scripts/verify-quality-browser.cjs`. Evidence remains ignored. Build with `npm --prefix frontend run build`; use `SKIP_FRONTEND_BUILD=1` for Gradle to avoid unauthorised `npm ci`. No dependency installation occurred.

Rollback is confined to these profiles, preference/context/shell/guide additions and renderer changes. Remove only `crystal_render_quality` if clearing that harmless preference is needed; do not clear owner data or other preferences. No migration, API change or model re-export is required. Original .blend scenes, validated GLBs and posters are retained.
