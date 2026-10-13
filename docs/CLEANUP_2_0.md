# Repository cleanup — 12 October 2026

James requested removal of old/unrelated code, Markdown, pictures and random files, followed by a verification checkpoint and continued 2.0 implementation.

## Removed or organised

- Four unreachable source/design files: ObservatoryDraft, DesignSystemReference, CrystalOpening and observatory.css. Both actual HTML entries and the private migration catalogue are retained; the import graph now reports no unreachable source or unresolved/computed imports.
- Old opening.css and 70 obsolete opening/hero CSS selectors. Retained selectors/declarations are preserved using the installed PostCSS parser. Shared production CSS falls from105.75kB to95.66kB raw,19.73kB to17.80kB gzip in this checkpoint.
- Nine unused Thymeleaf templates. No Thymeleaf dependency or active controller/template consumer exists; the React SPA, metadata and legacy redirect controllers are retained.
- Redundant root npm lockfile and static sitemap. The real frontend lockfile and dynamic server sitemap remain.
- Six tracked old runtime logs and 11 unused public images/animations. Approved Clare captures, actual birthday artwork, referenced legacy migration pictures, brand originals, model/poster recipes, font licences and print deliverables remain.
- Three duplicate notes and five superseded theme-audit documents. Nine historical reports moved into archive;17 focused technical records moved into reviews with relative Markdown links updated.
- Bulky onboarding/content/progress histories preserved in dated archive snapshots; current guidance condensed. The active audit keeps all 157 explicit bold checklist entries and their states:102 checked/55 open. Historical milestones no longer dominate the live checklist.
-22 compiled bin files untracked, with bin/ and logs ignored. Automatic review blocked broad/physical generated-directory cleanup with “blocked by policy” and no detailed reason. The safer untracking path succeeded; ignored local bin/target contents remain. Do not delete private .codex-runtime data/encryption keys as clutter.

## Verification boundary

Production TypeScript/Vite build passes. Import reachability, original model animation and offline font provenance contracts pass. Backend H2 tests pass48/48, including five meaningful new team boundary tests for role assignment/root separation, channel audiences and suspension, invitation replacement/recovery, message ownership/version conflicts, pending MFA and CSRF/replay protection. No failures/errors/skips in that run. A clean backend test/package run follows to exclude stale resources; final result is recorded in [progress](CRYSTAL_POWERS_2_0_PROGRESS.md).

The deferred Three vendor chunk remains about1,007kB raw/276kB gzip and triggers Vite’s size warning. This is a warning, not a passing performance gate. No advisory rescan, browser suite, PostgreSQL run, physical-device/assistive test or production/provider action is implied. Full release acceptance remains open. Earlier baseline comparison/browser scripts may refer to the replaced design; review their intended scope before final QA rather than weakening expectations to get a pass.

After this explicitly authorised cleanup checkpoint, continue implementation under James’s implementation-first workflow. Final all-feature QA happens after implementation, with failures fixed and retested. Cleanup tests alone do not accept the entire 2.0 release.
