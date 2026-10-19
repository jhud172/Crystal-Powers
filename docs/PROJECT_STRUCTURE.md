# Crystal Powers project structure

`lib/dialogFocus.ts` owns shared Tab edge wrapping for native modal dialogs only. ProjectEditor owns one cleaned toolbar ResizeObserver; `admin.css` owns coordinated/responsive stickiness and password-toggle sizing. `scripts/lib/private-design-audit.cjs` optionally inspects existing synthetic private journeys under `CRYSTAL_PRIVATE_DESIGN_AUDIT=1`, restoring appearance/viewport/focus/styles and preserving form values. The rendered-text helper exports a callable audit without launching a browser when required.

D5 UI verifiers: `scripts/verify-rendered-ui-browser.cjs` owns computed solid text/reflow/increased-contrast fixtures; `verify-layered-contrast-browser.cjs` checks actual header/hero screenshot background pixels; `verify-brand-resources-browser.cjs` observes repeated native WebGL allocation/retirement. `verify-browser-zoom.cjs` uses `scripts/fixtures/zoom-extension/` only inside a new ignored isolated QA profile to call native browser zoom; never attach it to a user's profile. None introduces a production dependency or API.

Private operational design is owned by `styles/pages/workspace-design.css`; `components/PersonAvatar.tsx` renders local decorative initials shared by team and client. TeamWorkspace retains draft/access/conversation state; ClientWorkspace retains client identity/project state. `verify-workspace-design-browser.cjs` owns the read-only conversation visual/draft subset; existing lifecycle/recovery/support/billing harnesses retain their separate scopes.

Shared Liquid Light control/state finish is owned by `styles/base/liquid-controls.css`; surfaces/actions and dense-workspace primitives by `styles/base/liquid-surfaces.css`; public composition/reading cue by `styles/pages/liquid-composition.css`. Feature styles retain layout ownership. The new preview verifiers are `verify-liquid-shell-browser.cjs` (public routes/shell) and `verify-device-quality-browser.cjs` (retained device rendering with read-only fixtures).

Current Liquid Light brand source: `frontend/public/branding/crystal-powers-liquid-mark.svg` is the original small/still mark; `features/experience/LiquidBrandModel.tsx` owns its procedural editable3D geometry, while `BrandLogoCanvas.tsx` owns camera/lights/context lifecycle and the optional retained authored GLB. `BrandIdentity.tsx` owns variant/rotation/unfold controls. `verify-liquid-brand-browser.cjs` owns the scoped built-preview checks; full packaged logo acceptance remains `verify-brand-browser.cjs`.

React/TypeScript/Vite owns UI. Spring Boot/Java 17 owns APIs, validation, private media, email, persistence, authentication and production frontend hosting.

| Area | Owner |
| --- | --- |
| App routes, shell, navigation, metadata | frontend/src/app |
| Public route composition | frontend/src/routes |
| Liquid Light hero and retained device stages | frontend/src/features/experience |
| Owner authentication, publishing, members UI | frontend/src/features/admin |
| Private team login, conversations, support, delegated projects and financial operations | frontend/src/features/team |
| Private client activation, project conversations, billing and contact preferences | frontend/src/features/client |
| Public portfolio and project presentation | frontend/src/features/portfolio |
| Enquiry/services/studio/support features | frontend/src/features |
| Tokens, shared controls, route/feature CSS | frontend/src/styles |
| Development-only Liquid Light reference | frontend/design/observatory.html, frontend/design/main.tsx, features/design/LiquidLightDraft.tsx and LiquidReference.tsx; real Services builder and approved Clare JSON/captures |
| Controllers/security/services/repositories | src/main/java/com/crystalpower/website |
| Schema/hosted restrictions | src/main/resources/db/migration, src/main/java/db/migration |
| Original model recipes/scenes | assets/blender |
| Approved Clare source material | assets/portfolio/clares-life-celebrations |
| Font provenance/delivery/licences | assets/fonts, frontend/public/fonts/manrope |
| Current plans and operating guides | docs root and docs/skills |
| Technical reviews and historical records | docs/reviews and docs/archive |
| Print deliverables | output/pdf |

Vite builds frontend/dist; Gradle copies it to Spring static resources. Spring serves the SPA and APIs, with legacy redirects and server-rendered metadata. Only published project revisions/media are public. The old Thymeleaf templates, unused prototypes, root npm lockfile/static sitemap and tracked logs were removed. bin/target/build/node_modules/runtime directories are generated or local, not source. bin is untracked; bin and logs are ignored.

Keep the legacy catalogue/importer and existing migrations reproducible; they are private historical drafts, not approved public projects. Public images are retained only when needed by active data/tools or protected provenance. Refer to [cleanup record](CLEANUP_2_0.md), [audit](CRYSTAL_POWERS_2_0_AUDIT.md) and [historical structure](archive/STRUCTURE_HISTORY_2026_10_12.md).

Current schema migrations are V1-V62 across SQL and Java migration directories. New source-only workflows and security migrations require final H2/PostgreSQL/backup acceptance. InvitationEmail is a shared admin/client-access feature, and MessageAttachments is shared by conversation and moderator queues. [Current handover](CODEX_SESSION_HANDOVER.md) and [release readiness](RELEASE_CANDIDATE_2_0.md) distinguish connected source from accepted behaviour.

V61 adds a private per-attempt token to support-message email delivery; staff message responses expose only the existing start timestamp, never the attempt token. Fresh H2/PostgreSQL and synthetic upgrade checks pass. The later V62 backup/restore check includes this column; old-writer/rollback acceptance remains open.

V62 similarly binds public enquiry notification results to private attempt tokens. Current local V62 backup/restore and restored-backend/anonymous-boundary checks pass; older-writer/rollback and full production/provider acceptance remain open. The restore helper reasserts browser-role revocations because target default grants can survive --no-acl.

Staff self-service security belongs to `frontend/src/features/team/TeamAccountSecurity.tsx`, embedded by `TeamSettings.tsx`; `TeamEntry.tsx` owns the confirmed-change sign-in notice. Backend HTTP/session setup belongs to `api/TeamAccountController.java`, credential proof/changes to `service/TeamAccountService.java`, and conditional writes to `repository/TeamIdentityRepository.java`. These reuse the existing MFA encryption, replay/version guards and schema; protected owner security remains separate. `scripts/verify-team-security-browser.cjs` owns labelled synthetic UI acceptance; real credential/authority assertions live in `TeamWorkspaceTests` on H2/PostgreSQL.

`TeamAccountConcurrencyTests` owns committed, disposable security/invitation races. Independent holder/contender transactions and a third observer connection verify the contender is waiting on that exact holder before releasing its commit. Database identity guards precede fixture cleanup; it accepts only its named H2 memory database or the existing guarded local PostgreSQL test target. This supplements, rather than replaces, request-level and synthetic UI checks.

The same test class now starts an isolated embedded server on a random loopback port for actual HTTP cookie rotation, protected access, logout, stale-challenge recovery and idle expiry. Its session listener and one-second session override are test-only; production configuration remains unchanged. `TeamAuthSessionTests` owns controlled delayed-password and context-repository invalidation cases. `TeamAuthController` binds pending results to their original session/challenge and uses the configured context repository through a request that cannot allocate a replacement session. `TeamEntry` owns failure-aware MFA cancellation and private-field cleanup, preserving eligible tab-memory work when restarting sign-in.

`security/AuthenticationSessions.java` now owns the shared live-session guard, bound repository request and idempotent logout used by owner, team and client authentication controllers. Credential results cannot publish into a session that ended or was replaced during their work. Owner challenge deadlines/version checks belong to `OwnerService`; pending-record and recovery-code response publication remain in `OwnerAuthController`. `OwnerClientSessionTests` owns controlled publication interleavings; `TeamAccountConcurrencyTests` additionally covers real owner deadline/recovery-code database races and actual owner/client cookie/role-boundary HTTP checks. No global repository configuration, schema or dependency changed.


Current utility/QA ownership: `frontend/src/lib/stripeUrl.ts` centralises trusted Stripe link destinations for client billing and documents. `scripts/verify-client-billing-browser.cjs` owns the intercepted client financial UI journey. `scripts/verify-populated-recovery.py` owns guarded loopback PostgreSQL/real HTTP/media recovery checks, while `scripts/prepare-rollback-candidate.py` builds a strictly allowlisted local transaction-hotfix backport with immutable original artifacts. Generated candidates, synthetic backups and QA evidence stay ignored under `.codex-runtime/qa/`; they are not source/public assets.
