# Crystal Powers 2.0 — shared motion and cancellation

> Follow-on cleanup, 10 October 2026: unused legacy interaction/component source was removed after reference tracing and replacement QA. This earlier implementation record is historical for those paths. See [LEGACY_CLEANUP_2_0.md](LEGACY_CLEANUP_2_0.md) for retained owners, controls and Git recovery.

Review: 10 October 2026. Implements MOTION-01/02; MOTION-03 retains a real background-tab acceptance gate. No dependency installation, data/API contract change or production publication.

## Policy and ownership

`hooks/useMotionPolicy.ts` subscribes once per experience to system reduced motion, compact viewport and document visibility. `ExperienceContext.tsx` shares the result and the existing effects/detail choices across the shell, opening and optional stages. Component intersection visibility remains stage-owned. The one-active-stage contract is retained; `release(id)` clears only the departing stage's ID using the latest state, so old cleanup cannot deactivate a newer stage. `ModelStage.tsx` now releases its stage on unmount; the opening uses the same ownership operation.

| State | Decorative DOM cues/film | Interactive 3D |
| --- | --- | --- |
| Full motion | Short route/section cues; optional crystal film | Existing bounded rendering quality and explicit controls |
| Lighter detail, or Automatic at ≤480px viewport | Cues and film suppressed; readable still content | Actual stage width still controls the renderer's Automatic tier; explicit interaction remains available |
| System reduced motion | Immediate content and no film/choreographed opening | Opening uses stills; optional device rotation remains user controlled; automatic animation disabled |
| Reduce effects | Immediate content, no film | Still artwork, no live canvas |
| Hidden document | Cues cancelled, CSS loops paused, film paused | Stage canvas unmounted; choreography settles to readable content; visible return may resume the owned stage |

The ambient compact policy concerns page decoration. WebGL continues to resolve Automatic from the actual stage width, retaining the measured DPR/environment/transmission bounds. Device-level physical and thermal acceptance remains separate.

## Motion specification

`features/experience/MotionScope.tsx` owns the public route/section cues inside the existing shell element. Public route mount/change uses 180ms; a section's first viewport intersection uses 220ms. Both use `cubic-bezier(.2,.7,.2,1)`, 4px vertical settling and opacity 0.96→1. Content is readable before, during and without the effect. There is no exit delay, router key/remount, scroll-jacking or hidden heading. Owner routes retain immediate focus/content without the public route cue.

Each effect owns its Web Animations objects and section observer. Route/policy change or unmount cancels outstanding animations and disconnects the observer; completed animations are removed from the set. Missing animation/observer support preserves ordinary visible content. The old 850–1,180ms staggered heading entrances are removed. Active public `data-reveal` CSS no longer hides essential section text. The legacy interaction modules remain retained pending the separate import/unused-code review.

The existing opening still owns reversible authored choreography, timeout, focus, drag/palette/pulse and its failure fallback. The shared policy governs whether it should run. A deliberate Close remains closed when preferences change; Skip to work uses instant scrolling when ambient motion is suppressed. Optional film playback also yields to another active stage.

## Verification and limits

`scripts/verify-motion-browser.cjs` exercises the actual disposable packaged runtime on port 8084, using installed Edge and a clearly labelled read-only project/own-site image fixture. It checks 390/768/1440 viewports, dynamic system/effects/detail choices, section visibility, missing observer fallback, native controls, four repeated Home/case/device cycles, stage release, one live canvas, route focus, animation completion, bounded listeners and zero API writes/browser errors.

The visibility branch explicitly dispatches deterministic document-visibility signals. It proves cancellation, settled content, zero GPU draw submissions while hidden and controlled visible return under those inputs. It does **not** certify an actual user's background tab. Direct headless/headed/off-screen/native-CDP probes in this PC's Edge continued to report unmodified native visibility as visible, including a connection without Playwright's focus defaults and a separate extension-free profile. Those probes cannot support native hidden-tab acceptance. All owned probe windows were closed; no personal browser or signed-in context was used. Ignored isolated profiles are not repository deliverables.

The first listener assertion incorrectly assumed every visibility subscription belonged to motion. Actual portfolio collection/detail hooks legitimately subscribe for revalidation. The corrected test requires one motion subscriber plus the known route-owned refresh subscriptions, one system preference subscriber and one compact policy subscriber, with no growth across cycles. Another test initially expected an explicitly dismissed opening to restart automatically; it now explicitly opens through the native button, preserving the user's Close intent.

Final packaged motion acceptance passes **69 checks** with no API writes or browser/console errors. The missing-observer branch originally failed because the stages checked property presence rather than constructor callability; both guards now use `typeof IntersectionObserver === "function"`, and the callable guard is shared by the scope. Frontend 664 modules/bootJar and final quality 98/shell 169/static 51 pass. Earlier motion-core Home 101/quality 98/birthday 36 evidence is retained with its scope/date. Final 28 cold loading profiles also pass with zero failures/unexpected canvases; `performance-pc/after-motion.json` records the measurements. Build/packaging and affected regressions are recorded in current progress. Backend security/provider tests from the preceding checkpoint remain dated evidence because this change touches frontend motion only. No screen-reader, physical touch/thermal, native background-tab or hosted release acceptance is inferred from these browser checks.

## Reproduction and rollback

Build with `npm --prefix frontend run build`; package with `SKIP_FRONTEND_BUILD=1` and Gradle `bootJar` to avoid unauthorised dependency installation. Launch a disposable local 8084 memory database with disabled mail. Set the existing `CRYSTAL_PLAYWRIGHT_MODULE`, installed `CRYSTAL_BROWSER_EXECUTABLE` and `CRYSTAL_QA_URL`, then run `node scripts/verify-motion-browser.cjs`. Reports remain in ignored `.codex-runtime/qa/motion-pc`.

Rollback shell/scope, shared policy/context and both stage consumers together. Restore any previous entrance CSS only with corresponding reduced-motion/readability checks. No database migration is involved; original scene/model assets and matching-still provenance are unchanged.
