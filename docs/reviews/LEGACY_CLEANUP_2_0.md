# Crystal Powers 2.0 — verified legacy frontend cleanup

Review date: 10 October 2026. BASE-02 concerns removal of proven unused source, preserving active functionality, development references, original artwork and migration contracts. No dependencies installed or removed; no API, database, provider, public asset or branding change.

## Reference tracing before removal

`scripts/audit-frontend-reachability.cjs` uses the already installed TypeScript parser to trace static imports/re-exports, type imports, literal dynamic imports and CSS imports from both retained HTML entry points: `frontend/index.html` and `frontend/design/observatory.html`. It fails on unresolved local or computed code imports. Global declarations are protected. Source paths and uncommitted-file ownership were checked before deletion.

The first graph identified seventy unreachable frontend files. Separate script/recipe/server/development reference review found that `scripts/import-legacy-drafts.mjs` still consumes `features/portfolio/portfolio.ts`. That catalogue is retained as an explicit tool root. It contains unverified historical examples for a reproducible **private-draft migration**, not approved public projects. The importer and existing Flyway V2 SQL remain byte-identical; the importer was not executed and no migration was rewritten. Only Clare’s Life Celebrations is approved real public portfolio work.

The remaining **69 unchanged, Git-tracked files / 282,723 source bytes** were removed. They cover the superseded procedural hero/PageHero, unused effect/motion/UI helpers, earlier Home/navigation/static portfolio components, unused pointer/animation/interaction/Three helpers and types, and unimported page/theme/component CSS. All were unreachable from production, development and the retained migration tool. They can be recovered from the baseline Git revision `83872dd`; they are not moved into another active source tree.

The graph now reports **85 source/CSS files**, production reachability 81, development reachability 25, private-tool reachability 2, and **zero unreachable files, unresolved local imports or computed code imports** within that scope. Counts include conservative type-only edges and entry files; they are not bundle/module counts. The development preview and native design reference remain separate from production routing.

## Preserved behaviour and delivery

The original five models, all public images/films/posters, Blender recipes/scenes, appearance IDs/cookies, theme-aware asset data, owner workflows, special birthday route, metadata, SPA fallback, legacy redirects and backend contracts are retained. Public assets are not deleted merely because a frontend importer does not reference their URLs. Existing backend legacy resources/URLs remain outside this frontend removal scope. New scene/motion/owner feature owners stay under `features/`; no dependency or lockfile change is made.

The inactive `CrystalOpenerScene` Vite chunk branch is removed. Current skills now point to `ModelCanvas`, shared motion scope and semantic theme tokens instead of deleted files. Historical documentation retains its evidence with a current cleanup pointer.

`scripts/verify-legacy-cleanup.cjs` independently compares the reviewed prior packaged control with the new build. **All six JavaScript chunks and HTML are equivalent after generated filename normalisation**. Hash checks preserve **145 non-build asset/source/migration inputs** exactly. There is no claim that source deletion alone makes JavaScript load faster.

Tailwind scans every source file, so removing legacy source also removes seven generated utility selectors: `.inline`, `.table`, `.grid`, `.grow`, `.shadow`, `.blur`, `.transition`. The CSS parser comparison finds **zero changed retained selector declarations**. Production CSS decreases **792 bytes**, from 94,532 to 93,740 bytes (Vite gzip 17.86→17.65kB). Existing CSS and JavaScript filenames consequently change; raw whole-build byte identity is not claimed. Native class/state/appearance regressions check the retained journeys rather than treating the graph as runtime proof.

## Verification, reproduction and limitations

Frontend TypeScript/Vite and Gradle `bootJar` pass with no dependency installation. The build remains 664 modules; entry109.56/31.95kB gzip, scene35.81/12.58 and vendor warning remain. Fresh Home101/Studio43/shell169/birthday36/design320/motion69/static51 regressions and43 H2 tests pass (zero failures/errors). PostgreSQL42 remains prior dated evidence. Backend code/migrations are unchanged; the H2 suite was rerun because the Vite build configuration was cleaned. Browser/regression results are recorded in current progress. Physical/native-tab/assistive/hosted/content/privacy/dependency/release acceptance is separate.

Run `node scripts/audit-frontend-reachability.cjs` to reproduce the current graph without deleting anything. The ignored `.codex-runtime/qa/reachability-pc` retains the pre-removal candidate list, hash inventory, verified prior packaged control and compiled/CSS comparison. `node scripts/verify-legacy-cleanup.cjs` requires that reviewed control; absence or mismatched asset/code input fails instead of silently inventing a baseline. Future computed imports, new HTML entries or standalone tools require graph/root review before deletion.

Rollback individual removed files from Git together with any importer/config changes actually needed. Do not replace current scene/motion/owner code with old components merely to recover an old file. No migration or production data rollback is required for this cleanup.
