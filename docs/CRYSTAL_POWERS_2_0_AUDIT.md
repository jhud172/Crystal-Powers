# Crystal Powers 2.0 — design, workflow and usability audit

## Authenticated hosted admin review and laptop batch — 30 October 2026

- [x] Use James's real signed-in owner session for read-only review of the hosted dashboard, members, roles, five editor sections, three security forms, team conversation, business projects, groups, moderation queue, request list, embedded members, workspace settings, channel creation and archive views. Four widths320/390/768/1440px produce80 layout observations plus4loaded-member rechecks, with0 horizontal overflow/navigation-action collisions. Captured console errors0; actual reduced-motion emulation gives data-motion=reduced and animation=none, then restored. Screenshot inventory includes initial loading and settled states; these layout observations do not prove message/payment/upload mutations. Evidence: .codex-runtime/qa/admin-live-2026-10-30/layout-report.json. No production form submission or business/credential change.
- [x] Correct visual findings as one batch: centre/widen the narrow security panel, reduce its overlarge heading, round and animate security choices, add spacing below editor address and dashboard count, and extend owner panel/form/card spacing to embedded team administration. Existing full/light/reduced policy remains authoritative; opacity-only arrivals preserve sticky geometry. No new dependency or global event listener.
- [x] End-of-batch production frontend build passes;205owner design +41owner UI +22workspace checks pass,0failures. Five themes, six widths, all security variants and embedded member form are included. Full backend H2 test task passes283tests/16suites,0failures/errors/skips, including the pending department-routing code that James requested to commit with all work. Existing optional Three.js bundle warning remains. CSS218.86kB/38.04gzip; main JS159.15kB/47.91gzip. No external email/provider tests were sent.
- [x] Review all pending source/config/docs for laptop handoff; added-line credential-pattern scan and git diff --check pass. Keep ignored runtime databases, screenshots, encrypted credentials and bootstrap artefacts out of Git. Pending mail-routing defaults preserve APP_MAIL_TO and existing Reply-To when department overrides are unset; no provider/DNS/new mailbox/invitation enablement.
- [x] Commit/push all reviewed source/config/docs as62f933c41c9f716dc3cb566d4001ca6a96dc206a on main. Render dep-dbi5kkbm8hqs73aptnsg is LIVE, finished30 October08:53:00UTC. Four tested asset byte comparisons and10health/auth/publication/media/direct-route assertions pass14/14; no new Render error logs. Evidence: .codex-runtime/qa/admin-live-2026-10-30/release-report.json. The signed-in live review above covers751efcc; new fixes have local browser acceptance and exact hosted-byte evidence, with owner reauthentication needed after the restart. Actual Codex activation, external mail receipt, full provider/legal and physical-device gates remain separate. Final docs-only [skip render] commit records the result without another restart.

## Owner studio spacing and interaction batch — 29 October 2026

- [x] Replace crowded owner actions with a labelled responsive navigation group, visible current member state and separated touch targets. Introduce owner-scoped optical panels, generous section/form spacing, responsive member/profile cards, distinct permission tiles, rounded inputs and clearer project/editor action groups. New composition belongs to styles/pages/owner-workspace.css; existing theme tokens and shared controls remain authoritative.
- [x] Add180–220ms hover/focus/background/border transitions and fine-pointer button lift only under full motion. Panel changes use a260ms opacity arrival; no sticky/fixed ancestor transforms, perpetual loops, new listeners/dependencies or hidden content. Touch has no required hover; reduced motion removes animation/transitions. Existing business/authentication/permission contracts are unchanged.
- [x] Fix the member-creation fieldset missing the existing admin-form-fields layout class; this was the remaining collapsed field/button spacing found during visual review.
- [x] End-of-batch checks: production frontend build passes;103 synthetic local presentation checks cover dashboard/members/roles at320,390,768,1024,1440,1920px across all five verified appearance IDs, navigation collisions/target sizes, form spacing, keyboard focus, reduced motion and runtime errors. Existing owner authentication/security UI suite passes41checks. Final0failures; initial focus check needed actual keyboard navigation and theme fixtures needed real IDs before final acceptance. Evidence: .codex-runtime/qa/owner-design/ and owner-pc/. Existing deferred Three.js chunk warning remains; CSS217.06kB/37.88gzip, main JS159.15kB/47.91gzip.
- [x] Commit/push the isolated design batch as751efcc4910e3186685dba42c417947d70389b80 on main. Render dep-dbhs8k8473hc73b0i720 is LIVE, finished29 October22:13:01UTC. Four served assets (CSS/main/Admin/TeamMembers) exactly match the tested local build. Fourteen hosted HTTP assertions pass,0failures: asset bytes, health, closed bootstrap, anonymous owner boundary, sole approved featured Clare project, both JPEGs and four HTML routes. No new Render error logs. Live browser /admin renders the masked sign-in form without overflow or captured console errors and loads index-bq8FcR7a.css. Evidence: .codex-runtime/qa/owner-design/live-report.json and live-admin.jpg. Initial Python urllib probe returned403; normal PowerShell HTTP probes passed without changing site security.
- [ ] Recheck authenticated hosted dashboard/member/role visuals after owner sign-in; the deployment restarted sessions. Existing144 local fixture checks and exact served bytes are separate from a live authenticated journey. No business data or credentials changed; pending Codex activation and full backend/provider/physical-device gates remain separate.

## Codex setup continuation — 29 October 2026

- [x] Complete normal owner UI assignment after sign-in and verify persisted join, not just selected UI text: accountb43ff2e4-176d-4415-8ec6-7c7f3f413855 → profile19dc1826-0873-4f2d-823c-cf4241459fa2, exactly READ_CHANNELS, EDIT_PROJECTS, PUBLISH_PROJECTS, not archived. Ordinary invitation replacement preserves the profile. No direct database writes, page-code modification or confirmation bypass. Evidence: .codex-runtime/qa/codex-live-setup/assigned-role.jpg.
- [ ] User completes private activation password/confirmation and normal authenticator enrolment. Activation page is prepared; INVITED/MFA off is intentional until credential handoff. Then verify a real session's granted and denied capabilities. No invitation email sent; no private token/credential in source or audit.

- [x] Recheck production metadata after the reported OK: saved profile has exactly READ_CHANNELS, EDIT_PROJECTS and PUBLISH_PROJECTS, but the INVITED account still has no assigned profile and MFA remains off. No activation or claim of effective restricted access. A fresh owner tab is signed out; normal owner sign-in is needed to complete assignment.
- [x] Merge only OWNER_SETUP_TOKEN to an empty value and remove its own ignored DPAPI token/copy helper; preserve all unrelated settings, owner identity/key, local Codex guard/credentials and company-email work.
- [x] Confirm cleanup deployment dep-dbhp6ejbc2fs73f29ng0 LIVE29 October18:42:09UTC on345f8ef. Eight checks pass,0failures: health, closed setup, anonymous owner boundary, sole approved featured project, two public JPEGs and absence of two obsolete local bootstrap files. No new Render error logs. Evidence: .codex-runtime/qa/codex-live-setup/cleanup-report.json. No local application build/full-suite rerun for configuration/docs-only work.
- [ ] Assign/verify restricted role, activate account with normal password/MFA, and perform actual least-privilege session checks. Definition-only metadata does not complete this gate.

## Live owner and approved portfolio — 28 October 2026

- [x] Confirm user-completed protected-owner MFA and normal owner session; no credential/seed reset or secret inspection.
- [x] Publish only Clare’s Life Celebrations, reviewed saved revision2, through the owner UI with real owned desktop/mobile uploads and accessible descriptions. Feature at order0. Live project2c27be56-b57f-4d92-91c7-88dc5c7f81bb.
- [x] End-of-batch verification:18 public HTTP assertions pass,0failures; approved fields, sole public project, featuring, separate screenshots, public JPEG delivery, health and anonymous/setup boundaries. Live browser verifies Home, portfolio, case study, mobile screenshot switching and390/768px overflow; no captured public console errors. Evidence: .codex-runtime/qa/clare-live/. No application code/build change or full-suite rerun.
- [ ] Finish temporary restricted live Codex account. User approved the exact three grants; matching profile is saved and invitation created. Account remains INVITED/unactivated, with no password/MFA and role_profile_id still null: assignment confirmation blocked browser control. Human OK is pending, followed by verification of the restricted profile BEFORE activation. No invitation email sent; local identity guards remain intact.
- [x] Disable temporary OWNER_SETUP_TOKEN and remove own ignored encrypted token/helper; verify setup remains closed after the live29 October cleanup deployment. Only the obsolete bootstrap artefacts were removed; other credentials/settings are preserved.

This supersedes earlier empty-production-portfolio and pending-owner-enrolment notes. Provider/legal/physical-device/full-release gates remain separate.

## Scannable MFA enrolment — 28 October 2026

- [x] Add private, on-device QR generation through the shared authenticator component, covering owner/team first enrolment and both replacement flows. Preserve manual setup/copy, existing MFA/CSRF/challenge/recovery contracts and server verification. No third-party QR requests or secret persistence.
- [x] Explicit dependency approval received. qrcode-generator2.0.4 is runtime; jsqr1.4.0 is development-only independent verification. npm reports0 vulnerabilities. Production frontend/bootJar/static inventory pass;161 frontend +1 backend assets match,0 stale. Existing Three.js size warning remains.
- [x] Pass167 synthetic QR assertions across owner/team at320/390/768/1440px and independently decode8/8 actual browser screenshots. Pass owner41, team entry79 and staff security137 existing assertions. Correct stale persistent-menu interaction in the owner verifier and use existing port guards. Tests never use the owner's actual secret or codes. [QR setup guide](MFA_QR_SETUP.md).
- [x] Commit/push only QR source/dependencies/tests/new guide as345f8ef; retain all unrelated uncommitted email/audit/provider preparation changes. Render deploy dep-dbgv9195efls73b4358g is live, finished28 October13:14:17UTC. The public main entry and shared private QR chunk exactly match the tested built files; real health is200/up and no new server errors were logged. Anonymous setupAvailable is nowfalse, consistent with the owner account having been created; do not repeat first-owner setup. Complete MFA by signing in normally and scanning the QR. Evidence: .codex-runtime/qa/mfa-qr/live-report.json. No actual private seed/code was read during hosted verification.

## Authorised live Codex account preparation — 28 October 2026

Setup deployment verification,28 October11:55:25UTC: Render dep-dbgu445g1s2s73caec50 is live on50abb4f. Live health returns200/up, and the anonymous owner session reports setupAvailable=true/authenticated=false. No new Render error logs. The Windows-protected bootstrap token decrypts correctly for this user; the ignored copy helper parses successfully; both files are ignored and git diff --check passes. No new owner/team row or password was created. Browser tab control failed during the final refresh, so the user must refresh /admin, choose first-owner setup, copy/paste the protected token, use james@crystal-powers.com and complete their own password/MFA/recovery-code entry. Then remove OWNER_SETUP_TOKEN and its local protected copy, verify setupAvailable=false, and finish the separately authorised jhud172@gmail.com restricted publisher. Do not consider this the completion of the live Codex account or Clare publication.

James explicitly authorised a separate live Codex publisher using jhud172@gmail.com and approved james@crystal-powers.com for his protected owner. Read-only inspection of the actual Crystal Powers Supabase project huhweqykbumewoewlvxl found0 owner rows,0 workspaces and0 matching staff accounts. The65 migration head and the known25 October live enquiry establish that this is the actual application database. The live session endpoint reports setupAvailable=false. Earlier sign-in failures therefore did not establish a forgotten owner password: no owner had been provisioned. Correct the earlier assumption; no account/password/MFA was reset.

Prepared a cryptographically random bootstrap token, stored only in the server's OWNER_SETUP_TOKEN and Windows-user DPAPI encryption under ignored .codex-runtime/security/live-owner-setup.dpapi. Render's merge operation preserves all other environment variables and automatically triggered deploy dep-dbgu445g1s2s73caec50 from current main50abb4f. No account SQL writes, schema changes, default password, authentication bypass, local-to-production guard removal, provider email or new code deployment. The pending company-email source changes remain uncommitted/undeployed.

Next: confirm the deployment is live, open the existing first-owner form, prefill only the chosen owner email, and hand over password/MFA/recovery-code setup. The user can run the ignored Copy-LiveOwnerSetupToken.ps1 locally to copy the encrypted bootstrap token without printing it, or copy OWNER_SETUP_TOKEN from their Render environment settings. Do not read/store their new owner password, MFA secret or recovery codes. Then remove the server bootstrap token, confirm setup is unavailable, create the restricted Codex publisher through existing team invitation/role services, generate its own password and enrol normal MFA, protect its credentials locally, and publish Clare through existing authorised APIs. Codex access/removal must remain separate from the protected owner. No live Codex account exists yet.

## Release continuation — 28 October 2026

- [x] Refresh the current checkout and read the newer25 October email handover before continuing. Main remains at50abb4f; ten pre-existing department-email source/configuration/documentation/test changes are uncommitted. Preserve them and their undeployed status.
- [x] Read-only live checks confirm `/api/health` returns200/up and `/api/projects` returns200 with an empty list. The approved Clare package remains ready; it has not become a production publication through Git.
- [ ] Complete Clare production publication through the protected owner workflow. The current live studio is signed out. One user-authorised sign-in attempt was rejected; its password was cleared and masking restored. No credentials were copied into source, scripts, runtime credential files or documentation. The owner must sign in or use the existing recovery workflow; do not reset/bypass the owner or promote the local-only Codex account.
- [x] Reconcile the email audit with the dated25 October company-email checkpoint: Lark domain/founder receiving setup is partially verified; the staff directory, first sign-ins and final website notification receipt are not complete. Department-routing code stays local/uncommitted with blank destinations falling back to the founder route. Preserve the original recipient/idempotency/uncertain-delivery safeguards. No email/provider/account/DNS/billing mutation is authorised or performed by this review.

Final28 October batch: focused InquiryEmailServiceTests and ExternalTransportTests pass19 tests in2 suites,0 failures/errors/skips. The two approved Clare JPGs still match their manifest hashes/bytes. git diff --check passes, and a fresh fetch confirms HEAD/origin main are0 ahead/0 behind. Frontend/full backend/PostgreSQL/browser/provider suites were not repeated for this documentation review; these focused checks verify the existing undeployed mail-routing/transport code. No commit/push/deploy, email, DNS, billing or credential reset. Live owner sign-in/publication remains pending.

## Live main deployment verified — 24 October 2026

- [x] Commit all208 pending source/asset/documentation files as5e9cdf3 and fast-forward/push main without force. Ignored runtime data and encrypted credentials remain outside Git.
- [x] Diagnose the initial Render build failure, correct the Docker source layout/approved JSON context, and patch Vite6.4.3→6.4.5 (npm audit0 vulnerabilities). Correction committed/pushed asfd9c5ef67742b49a0115be55fd5e73e55171584b.
- [x] Verify Render deploy dep-dbe9ekijnfac73digcr0 is **live**, finished24 October2026 at11:37:40UTC. The existing Crystal Powers Starter service/plan and provider settings are preserved. Its real PostgreSQL database successfully applied62 migrations fromV3 throughV65 and started normally. New runtime error log query returns0 entries.
- [x] Verify https://crystal-powers.com serves the exact new frontend entry hash. **46 deployed read-only browser/HTTP checks pass**: real health/projects JSON; Home/Work/Studio/Services/Support/Contact plus owner/team/client entries at390/1440px; explicit Home links; no horizontal overflow/runtime errors/5xx; all three anonymous account sessions remain unauthenticated. Scope is existing features/returning visitor, excluding the separately tracked Companion acceptance and real provider/private-auth transactions. First smoke ran during routing propagation and still saw the previous asset hash; retained as live-main-pre-routing-report.json. Repeat after the switch passes without an application change. Evidence: `.codex-runtime/qa/live-main-report.json` and live-main screenshots.

Clare's approved captures/content source is committed, but its published revision and local Codex account live in the ignored local database. Production `/api/projects` currently returns an empty list. No local account/credential/database was copied to production, no owner credential was reset, and no production project was published by Git. Production Clare publication still requires the authorised live owner workflow. Broader legal/provider/physical/private/deployment acceptance items must not be marked complete from this smoke result alone.

This documentation-only checkpoint uses Render's documented `[skip render]` commit phrase so recording live evidence does not trigger another application rollout. The deployed application revision staysfd9c5ef; the main branch can additionally contain this release-note-only commit.

## Main deployment correction — 24 October 2026

The authorised main push5e9cdf3 triggered Render deploy dep-dbe9dhuk1f9s73f2q000, which failed during frontend compilation. The Docker frontend stage flattened the repository layout and excluded assets; the development design reference therefore could not import its approved Clare JSON. Preserve `/app/frontend` and copy only the public approved content JSON under `/app/assets/portfolio/...`; narrow Dockerignore exceptions continue excluding Blender sources, media bundles, runtime databases and credentials. An isolated source tree matching that Docker layout now passes a forced TypeScript build. The local Docker daemon is unavailable, so Render is the full container-build authority.

The deployment npm audit also found one high Vite advisory. Under James's existing dependency-update approval, update the compatible6.x version from6.4.3 to6.4.5. npm audit now reports0 vulnerabilities; frontend production build passes with identical output asset hashes and the existing deferred Three.js warning. No backend code or schema changed for this correction; retain the just-completed272 passing backend tests. A fresh offline bootJar and deployed smoke verification follow. The previous live service remained available during the failed build.

## Explicit Home navigation — 24 October 2026

- [x] Add a labelled Home link before Work in the shared desktop/mobile/footer navigation, preserving the brand artwork and existing routes. Add the mobile Home description and exact root matching so Home is active only on the homepage.
- [x] Build and verify the actual local preview:38 passing browser assertions at320/390/768/1001/1024/1280/1440px cover route return, active state, mobile closure, header spacing, no horizontal overflow and no runtime errors. Evidence: `.codex-runtime/qa/home-nav-report.json` and desktop/mobile screenshots. Production frontend build passes with the existing deferred Three.js chunk-size warning; no dependency or backend behaviour change.

## Local Codex publisher and approved Clare publication — 24 October 2026

- [x] Create a dedicated temporary Codex team login without resetting the protected owner. Ordinary password/MFA/CSRF/session controls; restricted custom publisher role with exactly READ_CHANNELS, EDIT_PROJECTS and PUBLISH_PROJECTS. Deny reserved automation identities outside the loopback local H2 runtime; retain normal account behaviour and management removal visibility.
- [x] Store credentials only in Windows-user DPAPI encryption under ignored .codex-runtime/security/codex-local.dpapi; provide an explicit offline provision/remove tool outside the shipped application. Removal suspends the account, revokes sessions and deletes its credential file while retaining audit/project records. [Lifecycle and removal](LOCAL_CODEX_ACCOUNT.md).
- [x] Use the real normal team session and existing media/project APIs to upload both approved Clare captures, assign owned cover/desktop/mobile IDs, save and review revision2, publish and feature /portfolio/clares-life-celebrations in the persistent LOCAL database. Source hashes match the approved portable package; no invented projects or client metrics. Existing owner and legacy projects remain untouched.
- [x] Verify normal password/MFA sign-in, exact grants and owner403; pass33 real browser assertions for published portfolio/case study, screenshots/device switching, reload, Home featuring and the restricted team projects UI at1440/768/390px, zero captured runtime errors or failing public media/project responses. Evidence: .codex-runtime/qa/clare-local/.

Final batch verification: `SKIP_FRONTEND_BUILD=1 ./gradlew.bat test --offline --no-daemon --console=plain` passes **272 tests /16 suites,0 failures/errors/skips**. Focused policy/authority tests and offline`bootJar` pass. Actual local full-stack browser regression passes33 assertions with1 published project, alongside the33 Clare/team checks. Packaged static inventory matches162 files with0 stale; new JAR SHA256`b9da9fc67feef6abda7c1c3532713141d1c1a71d977868c9ea5d89fd0ceaab45`. Node syntax checks and`git diff --check` pass. No frontend source changed in this batch, so the already-built/current frontend was reused. The live Codex account intentionally remains active; destructive end-to-end removal was not run against this working account. No PostgreSQL/provider/deployed release verification in this batch.

This supersedes the empty-local-portfolio state in the earlier connection-repair checkpoint below. Production publication/HOME-03, live provider/legal release gates and removal of the temporary local account remain separate release work. No dependency installation, production mutation, commit/push or deployment.

## Local portfolio connection repair — 24 October 2026

- [x] Diagnose the actual screenshot: the frontend preview was running while backend8080 was stopped; `/api/projects` returned500, correctly producing the unavailable/retry UI. This was not a missing-project card styling defect.
- [x] Back up the saved local database before startup at `.codex-runtime/local-start-backup-20261024-112810/crystal.mv.db`. Start the actual application with the local H2/media profile on loopback8080; Flyway successfully applied62 pending migrations fromV3 toV65. Retain the original local encryption key. Outgoing email, invitations, billing/recovery/refunds and external AI are disabled for this local runtime.
- [x] Give Vite dev/preview an explicit shared IPv4 API proxy. Preview defaults to loopback8084/strict port and now refuses ordinary startup unless real backend health and published-project JSON succeed. UI-only fixture previews require the explicit `CRYSTAL_FRONTEND_ONLY=1` opt-in. Document both-server startup in README.
- [x] Leave backend8080 and frontend8084 running; verify actual same-origin API and page journeys without mocked responses or business writes.

Current local published list is genuinely empty. Read-only inspection of the pre-start backup already showed0 visible published projects and1 archived project with a retained publication revision. No projects were newly published, unarchived, deleted or fabricated to hide the connection problem. The portfolio now shows its honest unpublished empty state; approved Clare source material still requires the normal owner upload/review/publication workflow.

Verification: frontend build, offline`bootJar`, backend migration/startup, successful`prepreview` guard and **35 actual local full-stack browser/HTTP checks** pass. Includes both health/project endpoints, proxy/backend parity, anonymous owner/team/client sessions, real missing-project404, portfolio filters/reload/reflow at390/1440px and eight public/private entry pages; zero captured runtime errors or failing API responses. Evidence:`.codex-runtime/qa/local-full-stack-20261024/report.json` and portfolio screenshots; runtime logs:`local-backend.log` / `local-frontend.log` under`.codex-runtime`. A preview process retired during an early run; relaunched as a tracked running server. A filter assertion initially read before React Router committed; wait for the selected state and rerun passes. Packaged static inventory:161 frontend +1 backend files matched,0 stale; JAR SHA256`2c509da3e0b6143191e960abd018eeccefacf91f7493756ed28be4a62d4d8b64`. No dependency installation, real provider action, production mutation, commit/push or deployment. Backend unit suites were not repeated because no Java/business/security logic changed; this checkpoint verifies the actual startup/proxy defect.


## Crystal Studio liquid optics and smooth transitions — 24 October 2026

- [x] Upgrade the live signature with clearcoat, shallow physical transmission on eligible tiers, Fresnel transparency on economical tiers, stronger oriented softbox reflections and a soft cyan/rose/violet neon rim. Preserve the original Blender geometry and shared render budgets; no extra outline meshes, bloom pass or dependency.
- [x] Interpolate finish tint, authored-gradient contribution, roughness, transparency and emission through persistent shader uniforms. Finish changes no longer flip vertex-colour shader definitions or trigger preparation/poster replacement.
- [x] Interpolate existing key/rim light colours, key position and light intensity. Crossfade the stage atmosphere/halo and rendered-preview adjustments. No React state updates per frame, continuous idle spin or permanent draw loop.
- [x] Use a1.25-second minimum-jerk unfold coordinate with eased velocity for continuous in-flight reversal; smoothly separate shell/backing/core and brighten the core slightly while unfolding. Preserve camera, reset, orbit, scroll, focus, still/reduced-motion fallback and resource retirement.

Grouped final verification after the batch/correction: frontend production build passes; **61 Studio +36 logo +40 native-resource +50 motion +95 quality =282 passing browser assertions**, zero captured runtime errors or recorded shader-link failures. Native uniform/matrix observations prove intermediate material/light/layer values, unchanged live preparation/poster state during morphs, rapid finish retargeting, continuous unfold reversal, final idle and same-canvas control changes. Existing tests also cover low/balanced/detailed tiers, five appearances, responsive/still fallback, actual context loss/reopen and19 retired native contexts. Reports:`.codex-runtime/qa/crystal-glass-20261024/report.json` (screenshots alongside), `liquid-brand-d1`, `brand-resources-studio-20261024`, `motion-pc`, `quality-pc`.

The first optical shader failed linkage because this Three.js version uses a four-component `vColor` even for RGB colour attributes; native shader logs identified the invalid `mix` overload. Use `vColor.rgb` in the RGB branch and add explicit native linkage diagnostics to the verifier. Corrected full runs pass. Main159.03kB/47.87gzip unchanged; lazy logo chunk10.58/4.15 versus6.35/2.71 before the optical upgrade; CSS209.49/36.79. Existing deferred Three.js chunk warning remains. Browser optics override the reusable asset materials; no Blender geometry/native-scene change was needed. Built preview/read-only fixture evidence only; no backend/provider/device/deployed verification, new dependency, commit, push or deployment. Release blockers remain open.


## Crystal Studio — Blender signature and interactive viewer — 24 October 2026

- [x] Replace the procedural Liquid Light approximation with a real original Blender model traced from the current SVG signature: cyan-to-violet shell, optical backing and mint core; preserve the original crystal as an explicit alternative.
- [x] Upgrade the public header/footer experience with Crystal Studio, a larger responsive stage, live/preview labelling and persistent Reset/Unfold actions. Popup bounds stay inside the viewport.
- [x] Add Studio/Aurora/Sunset lighting,30–180% intensity,65–120% object size, rotation and direct orbit, finish choices, shell/core isolation, mesh construction and reversible layer separation. State changes retain the same live canvas; reset restores the scene and camera.
- [x] Preserve lazy activation, shared render quality, reduced/compact previews, keyboard/focus and context-loss recovery. Stable controls remain usable in the rendered preview; live-only geometry inspection is disabled there. Preserve vertical touch panning and wheel page chaining over the object.
- [x] Validate and reopen the editable Blender scene, validate the embedded GLB/gradient/axis/triangle budget/transparent fallback, and complete grouped browser verification.

Original source and regeneration guide:[Crystal Studio](CRYSTAL_STUDIO.md). Recipe:`assets/blender/build_liquid_brand.py`; scene:`assets/blender/scenes/liquid-brand-crystal.blend`; web:`frontend/public/models/liquid-brand-crystal.glb` (280,580bytes /15,360triangles /3meshes), portrait:`frontend/public/renders/liquid-brand-crystal.png` (720×800RGBA). Existing SVG/heritage assets retained; no downloaded model/texture/HDRI or dependency installation.

Findings fixed during the batch: visual review caught Blender's axis conversion turning the logo edge-on and OrbitControls resetting the initial camera zoom. Convert authoring coordinates before glTF export, preserve framing on orbit reset, and assert upright exported bounds. The native-file verifier initially assumed uncompressed BLENDER headers; recognise Blender5 Zstandard saves and additionally reopen the real scene successfully in Blender5.2.1LTS. Added cache revision`studio-02` for the corrected asset. Obsolete procedural geometry/CSS was replaced or removed; dated documentation is explicitly superseded.

Final relevant verification: production frontend build passes; Blender build/reopen and `python scripts/verify-liquid-brand-asset.py` pass. **53 Studio +36 logo +40 native-resource +50 motion +95 quality +346 appearance =620 passing grouped browser assertions**, zero captured runtime errors. Actual rendered pixels, camera orbit, reset, idle draws, five appearances, context loss/reopen and320/390/768/1024/1440px coverage; resources40 observes19 retired contexts. Reports:`.codex-runtime/qa/crystal-studio-20261024`, `liquid-brand-d1`, `brand-resources-studio-20261024`, `motion-pc`, `quality-pc`, `appearance-stability-20261024`. `verify-brand-browser.cjs` compatibility assumptions were updated and syntax checked; its separate packaged acceptance was not rerun. Main159.03kB/47.87gzip, CSS208.93/36.62; Three.js remains deferred with the existing chunk warning. Prepared environment code is now shared between the lazy logo/model chunks. Built preview/read-only fixture evidence only; backend/provider/native-device/deployed gates remain unchanged and open. No commit/push/deployment in this batch.


## Stable 3D detail dropdown and preference changes — 24 October 2026

- [x] Replace the expanding in-flow detail list with a bounded floating list inside the appearance panel. Choose above/below from available space before paint; retain radio semantics, keyboard navigation, nested Escape and outside dismissal. Resize/scroll listeners exist only while open and are cleaned up.
- [x] Stop preference/visibility changes replaying entrance animations on content already seen. Remember arrival/visible sections for the current route; new routes and unseen sections retain their existing cues. Preserve reduced motion, cancellation and viewport-fixed artwork.
- [x] Verify unchanged menu/header/trigger/heading geometry and document scroll across open, close and selection, including repeated Lighter↔Automatic changes with full motion enabled.

Measured causes: opening the old list increased the panel from571.72 to768px on1440×900; after the dropdown fix, the full-motion regression exposed a separate4px heading movement when Lighter→Automatic re-enabled arrival cues. Both are corrected. Grouped final verification: frontend production build, **346 menu/geometry +50 motion +95 quality =491 passing browser checks**, zero captured runtime errors. Public and private entry shells, five appearances, compact/short windows, normal/reduced motion, keyboard/focus and actual rendering quality covered. Read-only fixtures on built preview8084; backend/provider/native-device/deployed checks not rerun for this frontend-only correction. Main155.13kB/46.58gzip, CSS203.44/35.70; existing deferred Three.js chunk warning remains. Evidence:`.codex-runtime/qa/appearance-stability-20261024/report.json` and `stable-detail-open.png`, `motion-pc/report.json`, `quality-pc/report.json`. No dependency installation, commit, push or deployment; release blockers remain open.


## Persistent, correctly anchored appearance menu — 24 October 2026

- [x] Theme changes retain the open menu and focus on the selected option. Effects/detail choices remain in the same open disclosure.
- [x] Add a centred44px Close appearance control; preserve Escape, outside-pointer and toggle dismissal, focus restoration and route-change cleanup.
- [x] Anchor the panel below the complete header, rather than its shorter appearance button; constrain height for short windows and keep it above floating launchers while open.

Grouped verification: `npm.cmd --prefix frontend run build` passes;253 dedicated menu +50 motion +95 quality = **398 passing browser assertions**, zero captured runtime errors. Dedicated coverage spans `/about`, `/admin`, `/team`, `/client`;1440×900,1024×700,768×600,390×844,320×480,1440×360; all five appearances, nested detail Escape, effects, focus, all dismissal controls, panel bounds and44px centred close target. The first320px run found a floating Companion launcher intercepting the lower menu controls; corrected the header disclosure's stacking order and reran the complete dedicated matrix successfully. Theme verifiers now explicitly dismiss after selection instead of assuming auto-close;34 relevant verifier files pass syntax checks. Main154.03kB/46.23gzip, CSS203.10/35.63; existing deferred Three.js warning remains. Built preview/read-only fixture evidence only; no backend/provider/device acceptance or deployment. Reports:`.codex-runtime/qa/appearance-persistence-20261024/report.json`, `motion-pc/report.json`, `quality-pc/report.json`. Existing release blockers remain open.


## Deeper reversible starfield — 24 October 2026

- [x] Add a bounded distant star population with smaller, dimmer perspective at rest and staggered acceleration from the vanishing point. Desktop:120 near +120 distant stars; compact/light-motion budget:48 +48.
- [x] Extend travel to6 seconds (4.5 seconds with light motion). Distant stars continue rushing after the crystal finishes opening; travel ends with zero visible stars and stops requesting frames.
- [x] Use one continuous depth/travel coordinate in both directions. In-flight reversal retains the population and current position; returning to rest restores nearby and distant ambient stars. Keep pointer repulsion, offscreen cleanup and reduced-motion still artwork.

Grouped verification after implementation: production frontend build passes; **53 Prism +50 shared motion +4 delayed-observer checks =107 passing assertions**, zero captured runtime errors. Built preview8084 with labelled read-only API fixtures; no new backend/provider/device/release acceptance. Initial browser attempts hit a stopped preview (connection refused); restarted preview8084, then reran all three suites successfully. Existing deferred Three.js size warning remains. Main JS153.75kB/46.19gzip versus153.45/46.03 before this refinement; no new dependency. Evidence:`.codex-runtime/qa/prism-depth-20261024/report.json`, `motion-pc/report.json`, `batched-intersection/report.json`. Preview remains running; no commit/push/deployment.


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


## Current bulk checkpoint — 24 October 2026

**131/156 named feature/release items are locally complete;25 remain open, plus8 separate phase-acceptance boxes.** The [bulk acceptance review](reviews/BULK_ACCEPTANCE_2026_10_24.md) is the current evidence ledger. This batch adds confirmed client scope and fixes asynchronous layout shifts, delayed-observer Prism freezing, a collision with the existing Prism fragment and retired assets leaking into incremental packages.

Final applicable checks pass:263-case backend tasks with7 corrected cases per database;38 actual-session workflow,31 earlier actual-role,401 refreshed identity/security,242 motion/quality/adaptive,139 public-navigation and106 static-delivery assertions;48 cold profiles;57 populated recovery checks. The cleaned package contains159 matching frontend files plus backend robots.txt, with0 stale static files. Each result retains its candidate/date/fixture scope in the review. Actual native target activation/minimisation both left the document visible in this automation session, so native-background acceptance remains unproven.

Operating facts, real provider/scanner, physical/assistive, phase and deployed acceptance remain open. James excludes the separate assistant/chat feature; only its conflicting heading ID was namespaced to preserve existing homepage navigation. Earlier dated checkpoints below are historical. Final cleanup is verified: owned QA18084/baseline8085/PostgreSQL55447 stopped; existing frontend preview8084 preserved. No commit/push/deployment.

## Bulk acceptance stages — 23–24 October 2026

- [x] Real-session browser stage:37 checks pass against the packaged current application and a fresh PostgreSQL database. Browser password/MFA/cookie sessions for owner and moderator, separate client login; actual ordering, saved tracking, unshared/shared replies, client response/preferences, workspace/profile settings, private group membership and group-restricted channel creation; owner revision/private image library/consent-gated publication/unpublish; client logout cleanup. Reflow at390/768/1440px on five populated surfaces. No intercepted API responses, no runtime errors, no real provider operations. Source fixture: `scripts/run-real-session-browser.py` / `verify-real-session-browser.cjs`; evidence: `.codex-runtime/qa/populated-recovery-browser-20261023235540/browser-report.json`.
- [x] Corrections in the new verifier: uniquely identify fixture projects; change the contact preference from its actual saved value; check group membership through the authorised detail endpoint rather than the deliberately compact list; target the native group select without including its option text in an exact label match. Earlier failures remain in their isolated evidence directories. No application defect was demonstrated by those test assumptions.
- [x] Automated motion correction gate passes; native headed visibility probe is retained separately in `native-visibility-bulk/report.json` and does not establish native-background acceptance.
- [x] Stability correction gate:48 cold profiles initially had no response/runtime/network/overflow failures, but the measurements exposed real loading CLS up to0.539 on owner/client/privacy pages. Reserve the first-view main-frame height for those asynchronous routes and enforce a0.10 project CLS budget. Frontend build/package and48 final cold profiles pass with the new CLS gate: maximum0.06565. Owner390px0.0244, client390px0.06565, unpublished privacy390px0.0089, team0. Static delivery91 passes. Extended real role lifecycle/delegated editor31 checks pass on this stability candidate; the restore step deliberately accepts its existing confirmation. This is an application fix, distinct from verifier corrections.
- [x] GPU measurements:15 valid desktop GPU profiles +7 compact still/hologram cases and2 explicitly non-comparable baseline entries completed with no measured GL/disjoint/runtime errors. The retained package predates Prism and has one laptop startup GL1281 flag recorded separately; current-candidate startup errors are explicitly asserted absent. Current Prism automatic/low/high median GPU costs0.169/0.059/0.334ms; these are per draw-bearing callback, not whole-frame/mobile/thermal proof. Evidence: `render-cost-pc/report.json`. Renderer/model code is unchanged by the subsequent workspace/privacy CSS stability fix.
- [ ] Full release completion — external/provider, operating-fact and physical/assistive-device gates below still require their actual evidence. A local tick does not silently close them.


- [x] Remaining staff base-role browser batch:22 checks pass with real UI-issued invitations, recipient activation, MFA enrolment, role-specific navigation/direct API denial, support tracking and admin suspension revoking existing sessions. Admin, support and member plus the earlier moderator/owner/client journeys cover every account type locally. Evidence: `.codex-runtime/qa/populated-recovery-browser-20261024000000/roles-browser-report.json`. The first lifecycle attempt needed an explicit member reload after activation in another browser; the final run waits for the confirmed active roster before suspension.
- [x] Automated motion/quality correction gate:50 lifecycle +41 Prism +95 quality +40 brand-resource +12 adaptive checks =238 passing assertions. Quality originally counted decorative2D stars as WebGL; corrected the verifier without changing application behaviour. Native background visibility remains an unproven acceptance item because real Edge minimisation still reported the document visible; deterministic hidden-state checks are separately labelled and passing.

### Final product gap batch — confirmed client scope

CLIENT-02 source review found no dedicated client-visible confirmed-scope field. Added V63's optional `support_request.project_scope`, shared tracking version/authority checks, a6,000-character limit, scope-change history and staff/client rendering. Missing input from old clients preserves the current scope; an explicit blank clears it. The staff field explains that only already-agreed scope is shared and that it does not change issued payment terms. Draft recovery/filtering keeps scope alongside progress, with safe old-draft defaults. Added integration regressions for stale/legacy/clear writes, client isolation, bounds, permissions and CSRF; extended the real browser and populated-recovery labs. Frontend build passes after correcting an initial TypeScript variable-scope mistake. Acceptance now passes:263-case backend tasks,7 focused corrections per database,38 real-session browser checks and57 populated recovery/rollback checks. CLIENT-02 is locally complete; operating/provider/device/release gates remain separate.

## Backend integration and recovery batch — 23 October 2026

James requested fresh backend integration after the private UI batches. The earlier intercepted-browser results remain separate from this actual-server/database checkpoint.

- [x] Inspect existing backend contracts, permission checks, migration ownership, test isolation and provider-disable settings before changes.
- [x] Fix local QA portability: Windows currently reserves TCP55347–55446, including the usual55432 database port. Permit only the additional explicit loopback QA port55447 in Gradle, database assertions and backup/restore/isolation helpers. Existing disposable-name/empty-target/new-media restrictions remain. No host networking or production configuration was changed.
- [x] Give the populated-recovery lab an explicit8084/default or18084 alternative application port, refusing occupied ports and stopping only its own child. Preserve the existing preview.
- [x] Extend real-HTTP recovery coverage for display-order bounds/concurrency/capability/privacy, matching saved staff/client progress, unrelated client project denial and stale client-preference writes. Synthetic credentials remain in process memory; actual provider operations stay disabled.
- [x] Fresh H2 `test bootJar`:256 tests in14 suites, zero failures/errors/skips; packaged existing built frontend successfully.
- [x] Local database guard rejection checks: remote host, ordinary database port, non-disposable database name and unsupported recovery-port arguments rejected before database access (4 checks).
- [x] Packaged real-HTTP populated recovery:53 checks pass on PostgreSQL17.10. Backup/restore comparison covers45 tables,133 rows,2 sequences and1 private JPEG; browser-role isolation checks deny8 representative private reads. Current and retained earlier candidates authenticate, read/write and reject stale/cross-role requests after restore. Twelve new workflow assertions run across both candidates. Financial/provider states are explicitly imported synthetic snapshots, not real Stripe operations.
- [x] Fresh actual PostgreSQL `postgresTest`:256 tests in14 suites, zero failures/errors/skips; full run exited0 in5m56s. H2/package run exited0 in3m34s. This verifies local controller/service/repository/security/validation/concurrency/webhook contracts; real provider calls remain separate.

### Final commands, evidence and limits

- `$env:SKIP_FRONTEND_BUILD='1'; .\gradlew.bat test bootJar --offline --no-daemon --rerun-tasks --console=plain` — passed; reuses the previously built current frontend/dist, installs no dependencies.
- Set `PG_TEST_DATABASE_URL=jdbc:postgresql://127.0.0.1:55447/crystal_rebuild_test_20261023_backend` and synthetic local credentials, then `.\gradlew.bat postgresTest --offline --no-daemon --console=plain` — passed. Target-only representative anon/authenticated default grants were configured before migration so the schema boundary is exercised.
- `python scripts/verify-populated-recovery.py --candidate build/libs/crystal-power-website-2.0.0.jar --rollback-candidate .codex-runtime/qa/candidates/f7541b58604b2d6f194ba8000bddc18dc4ffa7c836ebf47d74b261d0561c0bd1.jar --source crystal_rebuild_test_recovery_20261023_backend --target crystal_restore_20261023_backend --run populated-recovery-backend-20261023 --pg-port 55447 --app-port 18084` —53 checks passed; fixture creates fresh databases only.
- The final isolation helper and XML copies live in `backend-integration-20261023/`; H2 and PostgreSQL summaries are each256/0 failed/0 errors/0 skips. Current package SHA256: `fb36727564d34a5fa59fda0ac81843c6bdc9cba59555552bc494ceb48097da43`; a copy is retained under ignored `qa/candidates/`.
- Python helper syntax and `git diff --check` pass. Existing test warnings: deprecated MockBean, unchecked transport-test operations and JVM class-sharing notice. Existing line-ending notices remain; none is a failing check.

No application logic defect was exposed by this batch. The corrected failures were QA environment/port selection; the initial ordinary online Gradle attempt was stopped before tests, then rerun using cached dependencies and the repository's short Java temporary-directory workaround. These are fresh local backend integration results, not browser end-to-end proof for every protected UI state, live external-provider delivery or deployed2.0 acceptance. Physical/assistive-device, Stripe sandbox/full financial provider, real mail/scanner, published legal/operator configuration and deployed release gates remain open. Do not tick those broader gates from these results.

Evidence: `.codex-runtime/qa/backend-integration-20261023.log`, `backend-postgres-tests-20261023.log`, `backend-integration-20261023/` and `populated-recovery-backend-20261023/`. The initial PostgreSQL socket failure is retained in `backend-postgres-20261023.log`; the successful alternative startup is separate. Final cleanup confirmed: owned QA application18084 and PostgreSQL55447 are closed; existing preview8084 remains listening. The local test/restore databases and evidence are retained for inspection. Existing frontend work is preserved. No dependency installation, real payment/email, deployment or commit/push.

## Protected admin, team and client batches — 23 October 2026

Two related implementation batches are complete and their final local checks pass. This extends the earlier whole-site visual pass; it does not mark the production release complete.

- [x] Channels, private groups, team members, business projects, client requests, reference-file review and client projects: add labelled filters with announced loaded-page counts, clear/focus recovery and honest pagination scope. Filtering preserves the open detail and message, tracking or review drafts; queries are not persisted.
- [x] Staff requests and client projects: present saved status, estimated progress and next step together, with explicit reference-copy actions. Unsaved staff tracking edits remain separate from confirmed progress.
- [x] Business project ordering: replace the browser prompt with a responsive native dialog. Validate integer/range, preserve the concurrency token, retain input on conflict, trap keyboard focus, return focus on close and lock cancellation/input while awaiting confirmation. Existing publication permissions still apply.
- [x] Team personal/workspace settings and client contact preferences: add independent saved/unsaved feedback and clearer form grouping; enlarge selectable contact cards. Owner editor save feedback is announced. Separate saves and retained sibling drafts remain intact.
- [x] Correct the actual visual finding: Tailwind reset native dialog margins, leaving compact order/publication/refund reviews at the top-left. Restore centred placement, verify mobile visually, and rerun affected guarded-confirmation suites.

### End-of-batch verification and correction log

`npm.cmd --prefix frontend run build` passes. Grouped Edge runs against the built loopback preview pass **1,224 functional/rendered-UI assertions across 19 suites**, plus **748 opt-in private visual/input assertions across eight scopes**. The separate typography sweep passes **105 states / 26,429 sampled glyphs**. These are local synthetic fixtures, not production transactions. No captured runtime errors remain in the final reports.

| Suite | Final checks |
| --- | ---: |
| New private filtering/order/progress/settings regression | 70 |
| Channels/messages/workspace | 79 |
| Support requests and updates | 48 |
| Team members / role profiles / private groups | 43 / 47 / 55 |
| Upload review | 44 |
| Team settings / security / authentication / lifecycle | 54 / 137 / 79 / 16 |
| Client authentication / access / recovery / billing | 79 / 20 / 51 / 25 |
| Staff billing and refunds | 31 |
| Owner editor/private preview / session | 53 / 24 |
| Shared rendered UI | 269 |
| Private visual/input: editor / owner session / members / roles | 413 / 29 / 48 / 36 |
| Private visual/input: support / staff billing / client billing / order dialog | 42 / 115 / 48 / 17 |

Checks include 320–2560px loaded-list reflow, draft retention when filtering, keyboard/focus recovery, order conflicts and pending state, permission denial, settings independence, authentication/security/recovery, publication review and invoice/refund recovery. Visual audit scopes include theme, compact viewport, enlarged text and input/focus checks as recorded in each report; the new order-dialog scope covers its current theme rather than every theme. The rendered-UI suite sampled 4,425 solid-text surfaces. Desktop private-page contact sheets and the centred 390px order dialog were reviewed.

Corrected test findings separately from application defects: fixture permissions now use the actual reply/tracking capabilities; saved next-step assertions are scoped away from editable textareas; independent status indicators no longer collide with global-success selectors. Split decorative status icons from their readable text. A final navigation cancellation was the existing guard correctly retaining tracking edits even after retyping the saved value; the verifier now deliberately uses **Discard progress draft** before navigating. Final rerun: 70/70. Earlier failed reports are retained locally for traceability.

Evidence: `.codex-runtime/qa/private-workflows-20261023/report.json`, the named `*-pc/report.json` suite folders, `.codex-runtime/qa/private-design-d5/*/report.json`, `.codex-runtime/qa/rendered-ui-d5/` and `.codex-runtime/qa/typography-20261023/`. Commands: `node scripts/verify-private-workflows-browser.cjs` and the existing workspace, support-workflow, team-members, role-profiles, upload-review, team-groups, client-recovery, billing-workflow, team-settings, team-security, client-auth, client-access, team-auth, team-lifecycle, client-billing, preview, session, rendered-ui and typography browser verifiers, using installed Edge/Playwright and opt-in private audits where supported. Run complete batches before verification, then fix and rerun the affected scope.

### Remaining acceptance

- [x] Local backend integration: see the fresh H2/PostgreSQL and real-HTTP recovery batch above.
- [ ] Deployed role/session isolation and real account acceptance for the final release; local results do not establish those results.
- [ ] Physical phone/tablet/touch/GPU and assistive-technology acceptance across the full private state matrix.
- [ ] Real Stripe/mail/upload-scanner operations and production configuration, tested only through an agreed non-live/provider procedure first.
- [ ] Confirm legal/trading name, public company email, retention/deletion and aftercare terms; still undecided.
- [ ] Complete the broader release checklist below. Existing deferred Three chunk warning remains; no dependency, backend or API-contract changes were made in these batches. Changes remain local and uncommitted.

## Whole-site design and interaction batch - 23 October 2026

Implemented the homepage direction across the public pages and shared owner/team/client controls: original optical vector studies, native chapter navigation, contextual pointer lighting, readable composition, consistent forms/dropdowns/focus/hover/scrollbars, selected-content copy actions with manual fallback, decorative drag/selection rules, and owner search for small libraries. Text, messages and public project images retain normal browser controls. The detailed page-by-page implementation/acceptance matrix is now at the top of [FRONTEND_DESIGN_GOAL_2_0.md](FRONTEND_DESIGN_GOAL_2_0.md); its implementation ticks do not close the broader full acceptance gates.

Corrected findings: legacy square-field CSS overrode protected rounded controls; the owner UI test lacked isolated initial session/CSRF fixtures; Prism duplicated shared motion/visibility subscriptions; its missing-observer guard could call an undefined constructor; and entrance transforms could briefly move the fixed wave. The test now distinguishes decorative2D stars from WebGL canvases, samples fresh drift frames after scrolling, and asserts wave stability during twelve initial fast-scroll frames. Production role/security/payment/validation contracts remain.

Final frontend build passes. Final consolidated evidence: **700 scoped browser checks**, plus **105 typography states /26,429 glyph samples**, all passing;4,335 solid-surface text samples, no captured runtime errors. Breakdown: new interactions129, public shell75, team22, owner41, client billing25, private billing visual/input48, rendered UI269, Prism41, motion50. Reports/screenshots and retained failure findings are recorded in the design goal test log. Local fixtures only: no real account, publication, system clipboard modification, email delivery or transaction is claimed. No dependency installation. Existing Three bundle warning remains; full physical-device, protected role/state, provider/mailbox/deployed and undecided business-policy acceptance remain open. Backend regression was not rerun for these frontend-only changes. Changes remain local and uncommitted.

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

## Continuous homepage wave - 23 October 2026

Removed the homepage Pause/Resume animation button, its React state and the LightVeil pause prop at James's request. The wave runs automatically during normal viewing; system reduced motion, Reduce effects and visibility safeguards remain. The separate prism controls and work reveal remain. Updated the accessibility guide, Liquid Light implementation notes and quality-browser assertions.

Verification at the end of this change: `npm.cmd --prefix frontend run build` passed, plus 15 focused installed-Edge browser assertions against the built local preview at 390px and 1440px. Confirmed no manual pause/resume button, actual changing wave transforms, open/Escape reveal interaction, no horizontal overflow, reduced-motion still artwork and no uncaught browser errors. API responses were synthetic read-only fixtures. Existing Three bundle-size warning remains; backend and full release QA were not repeated for this small frontend change.

## Typography spacing safeguard — 23 October 2026

James requires visible letter separation at every device size. Removed negative letter spacing and the negative display token throughout the stylesheets, including private screens and the separate birthday experience. Display tracking is now positive, compressed line heights are raised, and the hero wordmark selector outranks the shared paragraph margin reset. Wordmark spans can wrap within the available width; kerning/ligature behaviour is explicit. Condensed italic birthday display text uses additional0.06em tracking after actual glyph collisions were found there. `docs/skills/04-ui-design-system.md` records the permanent rule.

Grouped verification: production frontend build passes; new `verify-typography-browser.cjs` passes105 states (14 routes×7 widths,320–2560px, plus doubled homepage headings) and24,364 sampled glyphs with zero detected rendered-pixel collisions/negative tracking/page overflow. Public-shell75 and prism34 checks also pass. Browser screenshots reviewed at1024px; responsive screenshots and report are in `.codex-runtime/qa/typography-20261023`. Private-route evidence is entry screens, not every authenticated panel. No physical-device or full release acceptance is claimed; existing Three chunk warning remains.

The initial typography harness incorrectly treated overlapping ink bounding boxes as touching pixels and returned an invalid fixture for missing project detail. Corrected the fixture and used raster collision confirmation before accepting findings. The remaining seven failing birthday viewport groups were real condensed-italic collisions; widened their tracking and reran the complete affected set successfully. Earlier reports are retained locally as `initial-metrics-fixture-failed.json` and `birthday-italic-failed.json`. Backend/provider checks were not repeated for typography-only changes. Existing prism/starfield work remains preserved and uncommitted.


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


## Prism refinement — 23 October 2026

Final correction gate: frontend production build passes; Prism browser24 + public shell75 + shared device-model24 = **123 scoped browser checks**, all passing with zero captured runtime errors. Actual WebGL context loss, fallback, retry and keyboard Escape/focus recovery pass. Asset and animation-contract scripts pass; GLB235,724 bytes,15 meshes/9,340 triangles. CSS171.43kB/30.16gzip, main133.04/39.06, deferred Three1,007.40/276.32; existing large-chunk warning remains. Backend/database/provider/device/deployed suites were not rerun for this frontend/asset-only batch. Browser evidence is built-preview/synthetic GETs, not a new packaged or production release. Reports/screenshots: `.codex-runtime/qa/prism-precision-20261023`, `liquid-shell-d2`, `device-quality-d1`.

Remote `main` (`ea48e65`) brought the new Prism Gate and reviewed runtime-artifact cleanup into the completion branch. Resolved the deleted-opening/shared-renderer conflicts by retaining the 2.0 adaptive quality, preparation, resource ownership, image accessibility and Liquid Light hero, then integrating the refined prism as a deliberate homepage section.

Rounded, slimmer optical corners and matching guides, simplified diamond aperture, calmer materials, 48 fps/2.5-second exact reversible quaternion hinge, responsive in-flow projection and explicit canvas activation are implemented. Editable Blender scenes, model and responsive posters regenerated locally with installed Blender 5.2.1. See [Prism Gate](PRISM_GATE.md) for motion specification, corrections, commands and current scoped evidence. Full 2.0/design/device/provider/deployed acceptance remains open; previous packaged-test evidence retains its original byte/revision scope.


**Laptop handoff19October:** password-label reflow, responsive measured editor stickiness and native-modal keyboard loops are finished and verified. Nine functional/rendered journeys565 + seven private visual/input audits730 pass (1,295 scoped checks/16 states); frontend build/bootJar pass. Current package `89de812ded2e78fcbb060693cd30e478c06927e1861b70e1682896713d3dc116`,146 matching frontend files/615 unchanged non-frontend entries. Full details, original findings, limits and remaining work are in the design goal and [laptop handover](LAPTOP_HANDOVER_2_0.md). Broad release/design/device/provider/deployed/facts parents remain open. This is source synchronisation, not release acceptance.

**Latest D5 scope:** team metadata contrast fixed; increased-contrast styling added. Current build/package `1ab93293afec317b5056fdc802fc521aefbd3052b8de3d74c3e14fe94954f64e` passes578 affected preview checks, including native Edge200/400% zoom,4,545 solid-text samples,170 layered background/text rectangles and19 retired WebGL contexts over12 cycles. All615 non-frontend archive entries match the preceding corrected regression package. Exact evidence and remaining broad acceptance are recorded in the [design goal](FRONTEND_DESIGN_GOAL_2_0.md). This does not mark all-page, physical-device, assistive or external release parents complete; prior package-specific tests below retain their original scope.

**Superseding19October consolidated checkpoint — local regression gate accepted:** current Liquid Light package `f7541b58604b2d6f194ba8000bddc18dc4ffa7c836ebf47d74b261d0561c0bd1` passes256 H2 and256 actual PostgreSQL tests (14 suites each; zero failures/errors/skips),35 packaged browser suites/2,148 checks,12 adaptive-policy checks and41 populated recovery checks. Full Gradle test/PostgreSQL/bootJar and all grouped browser/recovery jobs exited0. The revoked-admin finding below is corrected within this scope; original failed evidence remains preserved. New recovery proves current and explicitly security-hotfixed prior-frontend candidates against restored populated V62 data, not untouched-release/old-schema production rollback. Exact commands/artifacts/failures/limits: [design goal](FRONTEND_DESIGN_GOAL_2_0.md), newest progress and handover. Broader visual/input/contrast/resource and physical-device/provider/deployed/undecided-facts gates remain open. No whole2.0 release completion, publication, push or deployment is claimed.

**Current consolidated gate reopened:** final H2 verification found one revoked-admin message-post acceptance (200 vs required401;247/248 passed). The failed run stopped before PostgreSQL/package. Explicit locked credential rechecks are now implemented after existing workspace locks; focused revocation/delegation regression passes31 checks, but the corrected full database/package run is still in progress. See handover/current progress. Earlier green checkpoints retain only their historical scope; no current complete release acceptance.

**Brand/reflow correction checkpoint:** material options/reset, stable geometry reuse and new favicon/monochrome/app icon set implemented. Narrow process/service labels and wordmark/text-link enlargement fixed. Final build and160 scoped browser checks pass. See the design-goal testing section for contrast/reflow coverage and remaining actual-device/full acceptance.

**Private design checkpoint:** team conversation/navigation, owner entry/library and client project/request/billing surfaces implemented with local initials and visible action groups. Final frontend build and7 scoped fixture browser suites/292 checks pass. Design goal records verified subsets, CSRF fixture correction and remaining role/device/full acceptance; no broad audit parent is accepted.

**Populated case/gallery design checkpoint:** native thumbnail/fit/actual-size viewer, loading/retry/late-result isolation and modal scroll/focus finish implemented. Final build and25 gallery/75 public-shell checks pass after correcting same-URL reload reuse. Approved Clare local fixture only; no project publication. Design-goal testing section records the verified subsets and remaining private/device/full acceptance.

**Shared/public design continuation:** coordinated action/panel/filter/model-control finish, Support composition, native reading cue and outside dismissal implemented. Final frontend build plus75 scoped public-shell and25 logo Edge checks pass. Design-goal testing section records exact verified subsets; authenticated/populated/final acceptance remains open and main audit counts are unchanged.

**Adaptive design checkpoint:** sustained-frame automatic quality and consistent system reduced-motion3D retirement implemented. Final frontend build and12 policy/25 logo/24 device-model Edge checks pass after fixing the discovered reduction/focus mismatch. Detailed limits and deferred physical/final QA remain in the design-goal testing section; no broad audit parent is accepted.

**D1 brand continuation:** original smooth Liquid Light SVG/procedural3D logo, degree rotation, reversible unfold and original-model selector are implemented. Final frontend build and22 scoped Edge checks pass. Exact evidence and still-open brand/full-page acceptance are recorded in `FRONTEND_DESIGN_GOAL_2_0.md`; no parent audit item is accepted by this partial design checkpoint.

**Design D1 underway,19 October:** shared Liquid Light native controls implemented; final frontend build and45 scoped Edge checks pass after a checkbox glyph correction. See [D1 evidence and remaining scope](FRONTEND_DESIGN_GOAL_2_0.md#d1-foundations--shared-native-controls-19-october-2026). Main audit completion counts are unchanged; this does not accept whole-page or complete design requirements.

## Current implementation status — 19 October 2026

**Local logic gate verified — 19 October 2026.** Frontend build and corrected package pass; all **248 tests pass on H2 and 248 on actual PostgreSQL 17**, zero failures/errors/skips in both 14-suite inventories. The final package passes **21 Edge browser suites / 1,246 checks** and **41 populated recovery checks**. Actual owner HTTP exposed and verified a fix for read-only transactions wrapping permission/workspace locks; 22 standalone endpoint regressions now cover that gap. The populated restore compares 45 tables, 130 total rows, four schema checks, two sequences and one private JPEG, then proves MFA, client access, private files, financial state and subsequent writes. A separately hotfixed previous local frontend also passes compatibility checks; the original older JAR remains unchanged and is not claimed to pass. **Next phase: coordinated Liquid Light design, D1–D5 in FRONTEND_DESIGN_GOAL_2_0.md.** External provider/operating/device/deployed gates and final design acceptance remain open.

**Historical 16 October checkpoint (superseded above for current tested scope).** Liquid Light selected. The laptop changes at `0bba0da` have been reviewed on PC. The selected opening, Blender logo, responsive navigation and custom appearance controls are integrated. The current 16 October full release build passes frontend/assets/bootJar and139 H2 tests; all139 tests also pass on actual PostgreSQL17. Controlled session publication, real database expiry and actual local owner/team/client HTTP role/cookie checks are recorded separately. Final packaged synthetic browser checks pass41 owner/51 client recovery/79 team entry. Earlier team-security/settings and backup/restore proofs retain their dated package scope. These establish only their recorded local scope. New regressions fixed owner authority revalidation and conflicting client-reply retries. Current V62 backup/restore comparison passes; earlier restored-owner browser/MFA/media/logout evidence retains its recorded package scope. Expanded role/workflow/concurrency, provider, physical-device and deployed-release gates remain open; local PostgreSQL/restore evidence does not accept them automatically. See the dated progress checkpoints for exact scope and earlier advisory/browser results.

James also authorised a business hub with admin-provisioned accounts, role permissions, Discord-style text channels/groups/customisation, upload moderation, support replies/tracking and future company email. [Team hub scope and source status](TEAM_HUB_2_0.md) records actual implementation and remaining work. Team identity/MFA/member administration and persistent role-restricted text-channel foundations are in source; these are not runtime/security acceptance. [Company email setup](COMPANY_EMAIL_SETUP_2_0.md) records the configuration contract and missing actual mailbox/provider/operator facts.

The checklist retains133 original IDs,24 HUB/MAIL IDs and12 CLIENT/PAY IDs: **169 total /115 checked /54 open**. Thirteen named design/shell/opening deliverables now have selected-design local acceptance; whole-page and full release gates remain open. New request, moderation and backup acceptance still needs expanded runtime/provider/PostgreSQL proof; Stripe/GBP/deposit/balance/monthly-support choices are approved; client and billing additions remain unverified. Current ownership and connected workflows are consolidated in [handover](CODEX_SESSION_HANDOVER.md); [release readiness](RELEASE_CANDIDATE_2_0.md) supersedes old candidate/hash/three-migration claims. Earlier checks remain dated evidence, not acceptance of these additions.

James confirmed16October that legal/trading identity, public company email/domain, enquiry/upload retention and aftercare/support terms remain **undecided**. CONTACT-08, NEW-01, CONTENT-03/05 and MAIL-01/05/06 retain their factual/provider dependencies; do not invent or publish those details. Stripe/GBP/deposit/balance/optional explicitly agreed monthly support remain approved separately.

Finish all applicable implementation, then run final QA; fix failures and needed additions, repeat until no applicable test fails. Preserve meaningful tests and update obsolete visual expectations to the selected design. Skipped physical/hosted checks are not passes. Actual legal/retention/support/mailbox facts and authorised production publication still need to be resolved before release.


Historical detail is in [the dated audit record](archive/AUDIT_HISTORY_2026_10_12.md). Current cleanup evidence is in [progress](CRYSTAL_POWERS_2_0_PROGRESS.md).

## Current working order — 19 October 2026

James has separated code completion from the visual redesign. This order supersedes the earlier interleaved design/build/test checkpoints:

1. **Logic implementation:** reconcile every remaining frontend/backend requirement with its actual source, finish missing behaviour, and record defects and deferred cases below. Preserve the current presentation while wiring usable controls. No new visual direction, animation/art/model production or repeated full builds/suites during this phase.
2. **Consolidated logic verification:** once the logic implementation inventory is complete, build/package once and run the relevant database, security, contract and browser workflow checks together. Record actual results, fix failures in batches and rerun affected checks; repeat the final relevant regression set until there are zero applicable failures. A skipped or unavailable check is still open.
3. **Design implementation:** after the logic phase passes, implement the selected Liquid Light designs across the app as one coordinated phase, then perform responsive, accessibility, motion, performance and final regression verification with the same fix/recheck discipline.

James expanded this phase on19October: [Immersive frontend design goal](FRONTEND_DESIGN_GOAL_2_0.md) owns the full custom-control inventory, refined vector/animated3D logo, model/render/interaction work, adaptive layouts/effect tiers and substantial feature-batch testing/correction log. It is the design phase of the existing active2.0 goal; logic-first order and the main audit's named counts are unchanged. Creating the brief is not design implementation or acceptance.

### Logic implementation inventory — local gate verified

These are review states, not new completed audit checkboxes. Existing verified subsets retain their original dated scope; an unchecked parent still requires its full acceptance.

19October continuation: the initial local source closure review is complete and the planned workflows have connected implementations. Feature work is frozen for the first consolidated logic verification/correction pass; the older row notes below describe where acceptance is still missing, not a claim that the corresponding implementation is absent. New runtime findings reopen the relevant implementation work. No parent/release checkbox is accepted by this source-review milestone. The local gate now passes at the latest checkpoint; earlier source-only row notes retain their historical scope. Design implementation may now begin.

| Workflow | Frontend/backend ownership | Current closure review |
| --- | --- | --- |
| Public enquiry, brief, uploads and saved reference | contact/services features; SupportIntakeService/Store, validation/mail | Source closure complete: retry key/original endpoint now belong to the visit-only brief, File identity detects replacement beyond matching metadata, pending sends guard navigation; consolidated acceptance pending |
| Owner and team entry, activation, MFA, security and recovery | admin/team entry features; authentication/session/account services | Previous session fixes verified at their checkpoint; native-fragment/client-entry changes await the consolidated batch;19October team-entry scope reset, request-owned pending state and stale logout protection implemented; acceptance deferred |
| Staff provisioning, roles, suspension, groups and channels | TeamMembers/TeamRoleProfiles/TeamGroups/TeamWorkspace; member/access/role/channel services |19October fresh management reload after access changes, stale invitation removal and live action guards; channel writes serialise with role/group/archive changes and recheck current authority. Wider closure review/acceptance pending |
| Conversations, unread, mentions, drafts and private files | team conversation/attachment features; channel/attachment/scan services |19October authority/group boundaries, ordered/cancellable workspace reads, inaccessible draft pruning, refused-workspace cleanup, scoped mention previews/recipient reads and review queue cleanup implemented. Initial source closure complete; consolidated lifecycle/attachment acceptance pending |
| Requests, tracking, correspondence and moderation | SupportInbox/UploadReview; support services/repositories |19October support-file review/removal and scan start/results lock the workspace and recheck authority; previous support-tracking/mail result tokens retained. Full closure review/acceptance pending |
| Client identity, activation, access and correspondence | ClientEntry/ClientAccess/ClientWorkspace; ClientAccessService/ClientPortalService |19October live post-lock staff checks, suspended-account linking refusal, versioned invitation replacement with stale-state conflicts, scoped/cancellable access reads, invitation clearing and refresh recovery; acceptance deferred |
| Billing drafts, issuing, checkout, subscriptions, invoices and refunds | BillingDrafts/ClientBilling and financial panels; billing/Stripe/refund services |19October draft/invoice mutations lock workspace and recheck authority; client return URLs recheck current account/project access after provider IO while retaining provider records; billing UI scopes fields/results and rejects stale redirects or credential-bearing/non-standard-port destinations. Financial flow closure review/acceptance pending |
| Invitation email and provider recovery | InvitationEmail; InvitationEmailStore/Service and delivery stores |19 October source fix: fresh component scope per invitation, cancelled old reads and busy cleanup; provider/lifecycle acceptance deferred |
| Persistence, API validation, metadata, privacy readiness and operations | migrations/repositories/security/web/config and operating guides | Source closure complete with unchanged V1–V62 schema; shared structured API errors now cover team settings/role/account controllers. Current database/backup/rollback acceptance pending; real operating facts remain undecided |

### Deferred logic testing and correction log

**First consolidated logic pass and correction batch completed, 19 October.** Build, both database suites and all 18 executed browser suites pass. This is acceptance of the exercised cases, not every unchecked parent or provider path. The subsequent client/populated-recovery checkpoint closes the local logic gate with248 tests on each database,21 browser suites and41 recovery checks. Coordinated design may now begin; external and final release gates remain open. Historical source-only notes in the inventory above are superseded for the tested scope by the results below.

| Batch | Required checks | Current result |
| --- | --- | --- |
| Build and contracts | TypeScript/Vite, backend compile, production static resources/bootJar; source/API consumers and validation | `scripts/verify-release.ps1` passed. After grouped frontend fixes, fresh frontend build and bootJar passed. No backend change after the full database suites. Logs use `logic-batch-2026-10-19-*` under ignored `.codex-runtime/qa/` |
| Identity and navigation | Owner/team/client activation, replacement fragments, Back/Forward and blockers, MFA/recovery, expiry, logout, stale responses, single-flight controls and no private browser storage | Current packaged client-auth 79, client-recovery 51, team-auth 79, team-security 137, team-settings 51, owner 41, navigation 15 and shell 169 browser checks pass. Fixtures prove their exercised UI states, not external identity/provider acceptance |
| Authority and concurrency | Every role/resource boundary, custom grants, suspension/reissue/recovery; client/billing/invoice/channel/message/moderation/scan operations waiting behind admin suspension; post/edit/read/mention after group removal; no extra invitations/events/drafts/messages/file changes | All 23 new observed-lock cases pass on H2 and PostgreSQL within the full suites. Wider role/resource combinations remain reviewable open acceptance |
| Client administration | Suspended account cannot acquire a new project until explicit recovery; invitation replacement advances revision and stale replacement conflicts; failed/refused access reload clears account/link, retry restores controls; old member links/management state clear; route changes and old email/clipboard results cannot restore another request's private state | Extended TeamWorkspaceTests case passes on both databases. New client-access browser verifier passes 20 checks for scoped links/version conflicts/refresh/recovery/late clipboard/expiry. Staff-management local subset additionally passes 43 browser checks; real invitation mail and final design/device acceptance remain open |
| Public retry and workspace lifecycle | Unchanged enquiry survives route/remount with original key/endpoint; file replacement changes intent; clear retires retry state; late workspace JSON cannot restore lost channels, eligible drafts recover, refused mentions/workspace clear private UI | Enquiry-retry 23 and team-lifecycle 16 checks pass. Real synthetic local enquiry/disabled-mail reference recovery passes within enquiry 153. Lifecycle tests use controlled transport responses; no real account/provider operations |
| Hub and support | Channels/groups/messages/pins/mentions/unread, draft recovery, uploads/scan/review/download/removal, tracking/assignment/internal versus client messages and saved versus delivered outcomes | Current packaged workspace 78, support-workflow 48, upload-review 44, team-groups 55, archived-group 41 and role-profiles 47 checks pass. Workflow denial/busy-state findings fixed; actual scanner/provider and remaining permission combinations stay open |
| Billing and delivery | GBP immutable requests, consent, checkout/portal URLs, duplicates/late callbacks, signed events, deposit/balance, renewals/cancellation, reconciliation/invoices/refunds and email uncertainty | All 27 BillingWorkflowTests invocations pass on both databases with mocked Stripe. Added settlement replay, event backoff/mode/deduplication, subscription snapshots, refund proposal/confirmation, nullable bindings and invoice-worker overlap/stale completion. New SignedWebhookTests17 and FinancialRecoveryTests19 pass on both databases for raw ingress and committed allocation/refund recovery. The new25-check client billing journey and41-check populated recovery now pass. Actual sandbox/provider acceptance remains separate |
| Databases and recovery | Full H2 suite; guarded disposable PostgreSQL suite; migration/restore/role isolation/rollback and restored app smoke checks for the final logic revision | 14 suites / 248 tests / zero failures, errors or skips on each database. Latest PostgreSQL used guarded disposable `crystal_rebuild_test_20261019_signed_recovery` on loopback 55432. V1–V62 applies; previous restore/isolation evidence retains its older dated source/package scope; final recovery coverage still open |
| Corrections and final logic regression | Record command, failure, fix, rerun and evidence; rerun final applicable set after corrections, then permit the design phase | Latest grouped correction build passes; final21 browser suites /1,246 checks pass against jar SHA256 `6ec0dbed08f7b1ccbd59db504c7d2336e1d1734111b09aba478cc70a3b13afcf`. Inventory: `.codex-runtime/qa/logic-client-recovery-2026-10-19-browser-final-inventory.json`. Remaining coverage review precedes complete logic acceptance/design |

Actual company mailbox/DNS/provider setup, Stripe account verification, scanner integration and James's legal/contact/retention/support decisions stay separately open. They do not justify inventing configuration or marking local logic unreviewed indefinitely; complete and verify the configurable application paths, then record any unavailable external acceptance precisely. Physical-device and deployed visual acceptance belong to later final release gates.

## How to work through this file

Work in the order in section 11, then review each page separately. Use task IDs in commits and progress notes. Tick a task only after its behaviour and applicable acceptance checks pass. For anything that needs content or a business decision, record that dependency rather than inventing an answer.

All **133 original task/phase/release IDs** are preserved (123 prioritised tasks plus eight phases and two release tasks). At the12October reopening checkpoint,102 named deliverables were ticked and the expanded checklist had192 total boxes. That snapshot and the preceding115-checkpoint count are historical; use the current totals above and latest dated evidence. Partial implementations remain unticked; checkbox counts are not percentages of feature completion.

Each page has an audit, a proposed composition, actionable tasks, ownership and a completion gate. The shared acceptance checklist in section 12 applies to every redesigned page. Keep a short dated evidence entry in section 13 when a page is completed.

Priority: **P0** = release readiness dependency; **P1** = core 2.0 work; **P2** = enhancement after core journeys work. Effort is relative: **S** = contained change; **M** = several components; **L** = a feature or asset production phase. These are not time or price estimates.

## 1. What the app actually is

Crystal Powers is an independent digital studio led by James. The public site introduces the studio, presents work, explains website/app/system services and collects enquiries. The owner studio manages projects privately, then publishes them to the public portfolio without a deployment.

### Active architecture and ownership

| Area | Current implementation | Preserve / use for 2.0 |
| --- | --- | --- |
| Public routing | `frontend/src/app/App.tsx`, React Router | Existing URLs, direct entry, `/home` redirect, back/forward |
| Shared shell | `frontend/src/app/Layout.tsx` | Skip link, route focus, navigation, theme persistence, footer |
| Public page source | `frontend/src/routes/` | Route ownership; extract feature components when useful |
| Active styles | `styles/index.css`, `base/studio-tokens.css`, studio/base/interior/admin styles and `pages/liquid-light.css` | Extend semantic tokens and active page styles; draft-only CSS lives separately under `styles/design/` |
| Signature visual and 3D | Home: `LiquidLightHero.tsx`; device/Studio stages: `ModelStage.tsx`; shared `ModelCanvas.tsx`, `ExperienceContext.tsx` | Reversible light opening, native controls and still fallback; preserve the separate device stage lifecycle |
| Original asset pipeline | `assets/blender/`, exported `frontend/public/models/` and `renders/` | Editable originals, GLB animation clips, device screen metadata and optimised stills |
| Portfolio | `features/portfolio/projectApi.ts`, `ProjectPresentation.tsx`, `FeaturedProjects.tsx` | Published-only public data; separate private media/preview |
| Enquiries | Connected Website/App/System/General/Support contract, shared visit-only brief/files, progressive builder and review/error/success locally verified | Privacy information, physical/screen-reader acceptance and release deployment |
| Owner publishing | `routes/Admin.tsx`, `features/admin/` | Draft/published distinction, revisions, conflicts, private uploads, reauthentication |
| Backend | Spring Boot 3.5.16 / Java 17, controller/service/repository/security packages | Maintain layering, CSRF/session/MFA protection, storage boundaries |
| Delivery | Vite build → Gradle static resources → Spring | SPA fallback, legacy `.html` redirects, server metadata, robots and dynamic sitemap |

Dependencies include React, React Router, Three.js, React Three Fiber and Drei. Tailwind 4/PostCSS migration is installed with James’s explicit approval; unused GSAP/@gsap/react/Motion were removed. Liquid Light uses a single owned native Web Animations timeline. The cleanup build passes; advisory and final visual compatibility acceptance remain open.

Unused legacy components and the superseded Observatory preview/CrystalOpening component have been removed after import tracing. Original device/model recipes and migration inputs remain.

### Complete route and screen inventory — original audit coverage

The evidence column below records 1 October coverage. The current status board above and section 13 record the 10 October recheck; earlier desktop/mobile evidence is not silently re-dated.

| Surface | Route / state | Audit evidence |
| --- | --- | --- |
| Homepage | `/` | Source, desktop/mobile browser, crystal viewer activation |
| Studio | `/about` | Source, desktop screenshot, mobile DOM/overflow check |
| Services / quote builder | `/services` | Source, desktop full-page and mobile viewport screenshots, selection interaction |
| Portfolio index | `/portfolio` | Source, desktop empty-state screenshot, mobile DOM/overflow check |
| Project case study | `/portfolio/:slug` | Source only for populated content; no published local projects |
| Support | `/support` | Source, desktop full-page screenshot, mobile DOM/overflow check |
| Contact | `/contact` | Source, desktop/mobile full-page screenshots, selection-continuity check |
| Owner sign-in | `/admin` signed out | Source and loaded browser DOM; no credentials entered |
| Owner setup / MFA / recovery codes | `/admin` authentication states | Source only |
| Password recovery | `/admin/reset`; recovery panel from sign-in | Source and loaded desktop DOM; no reset request sent |
| Owner dashboard / new draft / archived work | `/admin` signed in | Source only; no owner session used |
| Project editor / media / story / revisions / preview | `/admin` selected project | Local UI and actual isolated owner/private/public workflows verified; full gate open |
| Account security | Visibility/confirmation, locked requests/modes and guarded replacement-code exits | Full actual password/authenticator/code/session workflows and dedicated sections | Local UI rejection/completion/download fixtures pass; server rotation acceptance remains open |
| Session expiry / reauthentication | `/admin` modal state | Local UI and real server invalidation/retry verified |
| 404 | unmatched route and missing project | Source and desktop browser; mobile unmatched route check |
| Home alias | `/home` → `/` | Route source |
| Legacy links | `/home.html`, `/about.html`, `/services.html`, `/portfolio.html`, `/support.html`, `/contact.html` | Backend redirect source |
| Special birthday experience | `/birthday/mission-vi` | Source and desktop browser of current post-birthday state |
| Historical birthday experience | same special route before date cutover | Source only; no clock manipulation |

No standalone privacy, accessibility, FAQ, booking, client portal or service-detail routes currently appear in the active route table. Proposed additions below are explicitly new work.

### Important documentation drift

Laptop work added current ownership/pointers to `docs/agent.md`, `PROJECT_STRUCTURE.md`, `content.md`, `memory.md` and historical audits. `CRYSTAL_POWERS_2_0_PROGRESS.md` contains the later Aurora, email and CSP evidence. Handover/release notes also retain older chronological statements such as “providers pending”, “Gradle blocked” and “old release live”; these are superseded by their later dated evidence, not current blockers. Use the current status in this audit and the latest progress entries. Documentation reconciliation remains partial until final page content/architecture is agreed.

- [x] **BASE-01 / P0 / S:** Reconcile architecture, content and session documentation against the completed 2.0 implementation. Mark the old audit as historical with a pointer to this file; do not erase its historical evidence.
- [x] **BASE-02 / P1 / M:** Trace imports before removing legacy components/CSS/assets. Remove only proven unused material after the replacement has passed QA.

## 2. Overall audit findings

These are pre-existing observations, not regressions introduced by this documentation task. Design judgements are recommendations; source findings and browser observations are labelled separately.

| ID | Priority | Evidence and finding | User impact | Recommended change |
| --- | --- | --- | --- | --- |
| F01 | P1 | Browser/source: public pages use a restrained dark editorial system, similar large headings, thin rules and repeated rectangular model posters | Consistent, but insufficient variety and spectacle for the requested futuristic 2.0 | New spatial composition and material language; distinct page identities within one system |
| F02 | Resolved core / P1 remaining | Current source/live: Home uses Aurora `CrystalOpen`/`CrystalClose`; one click opens, further click reverses/closes; ready open state observed today | The requested physical opening now exists; the larger work-reveal composition remains unfinished | Retain the new asset and improve the surrounding page; finish HOME-02/3D-04 rather than rebuilding the old turn-only crystal |
| F03 | Partial / P1 | New posters/materials and blob CSP fix replace the original mismatch; textured live Aurora verified today | Final palette/exposure coherence across five appearances and GPUs remains uncertain | Review current Aurora still/live pairs, especially open poses and alternate crystal palettes, on representative devices |
| F04 | Open / P1 | Fresh live mobile: six packages, eleven additions and three maintenance options still precede the form; 9,735 px document height at 390 px viewport | Large decision burden and long return trips to edit choices | Promote the reviewed guided-builder design into the real Services route with compact comparison and editable summary |
| F05 | P1 | Source: both enquiry endpoints use `ContactForm`, requiring package and maintenance; support links to `/contact` without context | A general question or existing-client issue must fit a new-build form | Introduce explicit enquiry intent and validate the correct fields for each intent |
| F06 | Open / P1 | Fresh live: Starter selection updated Services summary; clicking its app/bespoke Contact link produced an empty package select and “Nothing selected yet”; source still uses route-local state | Repeated work and interrupted enquiries | Shared in-memory brief state for non-sensitive selections, with explicit reset and supported back navigation |
| F07 | P1 | Mobile screenshot: Contact places empty package/addition/maintenance/contact-summary blocks ahead of its first field | Visitors scroll past information they have not supplied | Put the form first on mobile; reveal a useful summary after selections exist |
| F08 | Open / P0 | Fresh live public projects API returns `[]`; Home now displays an intentional no-work message | The live offer still lacks project proof despite improved fallback design | Prepare truthful, permission-cleared content; complete a populated case study and owner publication journey |
| F09 | P1 | Source: Contact additions is a single select; Services supports multiple selections with pipe-delimited values | Different capabilities for the same brief | Reuse a consistent multi-selection control while preserving the server format |
| F10 | P1 | Source: `ProjectPresentation` uses `image` on the active canvas, but `ModelStage` poster always uses a generic device render | Case-study device looks generic until the visitor activates 3D | Add a lightweight project-specific 2D screen composition to the inactive device view |
| F11 | Resolved core / P1 remaining | Source/live: Work/Services/Studio/Support/Contact labels aligned and a compact mobile project CTA exists | The original navigation inconsistency is corrected; full shell/appearance/footer design acceptance is still open | Retain consistent labels; finish DS-06/07 and keyboard/zoom/five-appearance acceptance |
| F12 | P1 | Source: published project metadata and `RouteMetadata` both update page metadata; client hook does not update `og:image` | Potential competing metadata effects and stale share image during SPA navigation | Give route metadata one clear owner; test direct HTML and client navigation independently |
| F13 | P2 | Source: SPA fallback returns HTTP 200 for unknown page paths; React shows 404 | Visual recovery works; HTTP semantics need separate review | Review a real server-side 404 response without breaking valid SPA routes |
| F14 | P1 | Source: owner editor has valuable safeguards, but dashboard uses plain rows/order numbers, and the public shell surrounds private work | Managing a growing showcase takes extra scanning; public nav distracts | Dedicated owner workspace, thumbnail/status overview and clearer save/publish hierarchy |
| F15 | Partial / P1 | Source: five semantic DOM palettes added; Aurora/Ember/Tide are separate sculpture palettes; scene/poster still groups site appearances into light/dark | The DOM system is richer, but sculpture palette and site theme are not a complete shared material system | Preserve IDs/preferences; finish scene/poster treatment and test every combination deliberately |
| F16 | P1 | Source: laptop still has 104 meshes / 106 nodes; legacy crystal stage uses transmission, Aurora has 52 meshes, and canvas requests high-performance power | Future effects could raise draw calls/GPU cost sharply | Model optimisation and measured quality tiers before adding heavier effects |
| F17 | Resolved locally | Development Home now describes the original Aurora still and links the actual live experience separately; builder aftercare copy matches the working choice | Superseded asset/integration descriptions removed | Current development review passes 320 checks; the reference remains development-only |

### What should be retained

The independent founder positioning, truthful copy, existing route structure, server validation, lazy WebGL activation, rendered fallbacks, keyboard rotation/Escape, device screens, private publication model, revision history and security protections are useful foundations. A new visual system should make these capabilities more visible and easier to use.

## 3. Crystal Powers 2.0 art direction

**Selected direction: Liquid Light.** [Design concepts and motion brief](DESIGN_DIRECTIONS_2_0.md) retain the displayed alternatives and editable choices. Use warm ivory, charcoal type and deliberate flowing light across the public site; preserve useful device/workflow behaviour and original assets.

Make the new experience visibly different through composition, not just new colours:

- Warm ivory, charcoal typography and coral light; coherent dark/warm/fresh alternatives through existing appearance preferences.
- Large, confident display type paired with readable body text; small technical labels used sparingly. Existing Manrope can remain for body copy while display typography is explored. Font selection/licensing must be settled before delivery.
- Flowing light, deliberate typography and generous reading areas, with restrained transitions and legible controls.
- Asymmetric project compositions, full-width visual chapters and alternating dense/quiet sections. Avoid repeating one hero-plus-card-grid layout everywhere.
- Genuine depth from light, materials and alignment; flat controls remain legible and operable over the scene.
- One memorable interaction per key page: crystal opening, work exploration, service configuration, studio process or brief completion. Motion has a hierarchy rather than equal intensity everywhere.

### Shared design-system tasks

- [x] **DS-01 / P1 / M:** Create a 2.0 token set: colour, type scale, space, radius/cut geometry, elevation, border, focus and motion. Give tokens semantic names and map all five existing appearances. **Accepted locally 16 October:** Selected Liquid Light semantic roles mapped across all five appearances; current token/contrast/reference evidence is recorded in [design specification](reviews/DESIGN_SYSTEM_2_0.md). Current design reference:334 checks; full automation:95 H2 tests, zero failures/errors/skips. Whole-page/release acceptance remains separate.
- [x] **DS-02 / P1 / M:** Design shared buttons, links, field states, selection tiles, disclosures, badges, tabs, loading panels, errors and success panels. Specify default/hover/focus/selected/disabled states. **Accepted locally 16 October:** Shared state reference verified with native keyboard controls, disabled invariance, error focus and explicit local-only success; real server-flow and whole-site contrast gates remain separate. Current design reference:334 checks; full automation:95 H2 tests, zero failures/errors/skips. Whole-page/release acceptance remains separate.
- [x] **DS-03 / P1 / M:** Build responsive composition rules for 320, 390, 768, 1024, 1440 and 1920 px. Use fluid spacing without letting long pages become empty stages. **Accepted locally 16 October:** Four current compositions pass all six specified widths, including 200% text reflow at 320 px; physical browser zoom/device evidence remains separate. Current design reference:334 checks; full automation:95 H2 tests, zero failures/errors/skips. Whole-page/release acceptance remains separate.
- [x] **DS-04 / P1 / M:** Produce a representative homepage, Services builder and case-study visual draft before implementing every page. Confirm that the same system works for content-heavy screens. **Accepted locally 16 October:** Current Home, actual Services builder, approved Clare case composition and control states reviewed before accepting remaining page work; no claim that these preceded already implemented pages. Clare production publication stays open. Current design reference:334 checks; full automation:95 H2 tests, zero failures/errors/skips. Whole-page/release acceptance remains separate.
- [x] **DS-05 / P1 / S:** Add a presentation-level “Reduce effects” preference alongside system reduced motion. It must actually suppress decorative motion and expensive rendering; persist only a harmless preference.
- [x] **DS-06 / P1 / M:** Rebuild the shell: consistent “Work / Services / Studio / Support / Contact” labels, active states, mobile menu, appearance chooser and visible project entry. Local shell regression: 169 checks, six widths and all five appearances; physical/screen-reader acceptance stays separate. **Accepted locally 13 October:** see PC verification evidence in progress; this does not accept the complete release.
- [x] **DS-07 / P1 / S:** Design footer navigation and useful trust information; add links to new informational pages only when their content exists. Public footer includes existing journeys, factual studio identity and the ready accessibility guide; no unready privacy link. **Accepted locally 13 October:** see PC verification evidence in progress; this does not accept the complete release.

**Current task status:** DS-01–04 have current local foundation/reference evidence: semantic tokens, actual native interaction states, six-width composition rules and representative drafts. See [design specification](reviews/DESIGN_SYSTEM_2_0.md). DS-05 is delivered with source and laptop browser evidence; DS-06/07 have current local shell/footer evidence. Whole-site contrast, physical browser zoom and assistive-technology acceptance remain open; these named deliverables do not accept a complete page or phase.

**Completion gate:** a coherent desktop/mobile design sample in every appearance; readable form states; keyboard navigation; motion-free equivalents. No page is dependent on 3D for essential information.

## 4. Page-by-page public audit and checklist

Unless a dated status note says otherwise, the tasks below are still open. The laptop diff did not replace About, Services, Portfolio, PortfolioProject, Support, Contact, NotFound or owner-route implementations. Their existing features remain functional foundations, not completed 2.0 redesigns. Each composition below is the intended next deliverable rather than a screenshot of an implemented page.

### 4.1 Homepage — `/`

**Job:** explain what James builds, show credible work, invite exploration and lead to a project conversation.

**Current:** Liquid Light hero source with reversible veil, featured-work fallback, founder introduction, three service rows, collaboration chapters and final CTA. The selected hero and shared palette are implemented; remaining composition and final acceptance stay open.

**New composition:** immediate studio promise and project CTA within Liquid Light; optional light opening; truthful selected projects; optional responsive device exploration; three service pathways; compact collaboration timeline; final brief entry.

- [x] **HOME-01 / P1 / L:** Recompose the hero with the 2.0 crystal/frame asset and a clear offer visible before any click. Include “Open the experience”, “View work” and “Start a project” without presenting three equally dominant buttons. **Accepted locally 13 October:** see PC verification evidence in progress; this does not accept the complete release.
- [x] **HOME-02 / P1 / L:** Integrate the opening storyboard in section 7. Preserve direct browsing, skip, replay, keyboard and static fallback. **Accepted locally 13 October:** see PC verification evidence in progress; this does not accept the complete release.
- [x] **HOME-03 / P0 / M:** Populate featured work from cleared published projects; give an intentional compact no-work/error fallback rather than silently losing the proof section. Clare’s approved revision2 is published and featured live on28 October2026; Home/portfolio/case-study, real desktop/mobile images and18 public HTTP assertions pass. Existing compact fallback behaviour retains its earlier scoped evidence.
- [x] **HOME-04 / P1 / M:** Connect device selection to an actual featured project. Display suitable desktop/mobile screenshots; label concept/demo artwork honestly if used.
- [x] **HOME-05 / P1 / M:** Turn service rows into distinct Website / App / Bespoke system pathways that carry intent into Services or Contact.
- [x] **HOME-06 / P1 / M:** Rebuild the delivery sequence as selectable chapters with visible content and clear deliverables. Keep natural scrolling.
- [x] **HOME-07 / P1 / S:** Tighten copy around the customer’s outcome and the advantage of working directly with James.
- [x] **HOME-08 / P1 / M:** Rework mobile hero height and control positioning; show the offer and meaningful CTA in the first screen, followed by optional art. **Accepted locally 13 October:** see PC verification evidence in progress; this does not accept the complete release.

**Files:** `routes/Home.tsx`, `features/experience/`, `features/portfolio/FeaturedProjects.tsx`, active studio styles; original/exported assets. **Gate:** first-time and returning visitor paths work; slow/no-3D device still gets complete offer and proof; opening does not block navigation.

**Current task status:** HOME-01/02/04/05/06/07/08 have local implementation and browser evidence. The offer precedes optional art, opened Liquid Light reveals the selected project preview, and featured work uses its owned desktop/mobile screen images. HOME-03 keeps its delivered compact loading/empty/error/retry state; actual approved production content remains to be published. Physical-device, final visual and whole-page acceptance remain open.

### 4.2 Studio / About — `/about`

**Job:** make James credible and explain the working relationship.

**Current:** strong independent-studio positioning, founder text, another crystal, principles and CTA. The founder image slot is occupied by brand art, and the page shares much of the homepage’s visual rhythm. It says how the studio works without showing many concrete examples.

**New composition:** personal introduction with a real founder portrait if James supplies one; studio tools/work artefacts; process chapters; practical collaboration expectations; relevant project link and conversation CTA. Portrait is a content dependency, not a generated likeness.

- [x] **ABOUT-01 / P1 / M:** Design a distinct founder-led composition with an optional approved portrait and smaller crystal signature.
- [x] **ABOUT-02 / P1 / M:** Show selected design/build artefacts and explain decisions in plain language.
- [x] **ABOUT-03 / P1 / M:** Make process chapters interactive: what James needs, what the client sees, feedback points and handover.
- [x] **ABOUT-04 / P1 / S:** Explain communication, ownership/handover and aftercare accurately; avoid invented availability, qualifications or clients.
- [x] **ABOUT-05 / P2 / M:** Add a restrained layered workspace illustration; use DOM/SVG for diagrams and reserve WebGL for useful object exploration. Original layered brief/interface/build view, normal-flow explanatory caption and six-width/five-appearance checks; no extra canvas or essential motion.

**Files:** `routes/About.tsx`, shared process components, active studio styles, approved media. **Gate:** visitor can understand who they will work with, how feedback happens and where to go next without exploring the visual.

### 4.3 Services and quote builder — `/services`

**Job:** help visitors choose a suitable service, understand cost boundaries and send a coherent brief.

**Current:** website packages dominate even though the hero also promises apps and systems. Six long single-choice tiles, eleven additions and three mandatory maintenance options lead to a form. Package labels such as “Experienced” and “Multi Grade” describe tiers unclearly. Selections update the summary, but there is no continuous summary during most of the journey. Total length is especially high on mobile.

**New composition:** service-type selector → useful example and scope → website package comparison or bespoke route → relevant optional additions → aftercare discussion → brief review and contact details. The builder is a focused workspace, with prices and assumptions visible and choices easy to edit.

- [x] **SERV-01 / P1 / L:** Add Website / App / Bespoke system routing within the page; retain a direct browse-all packages view.
- [x] **SERV-02 / P1 / M:** Redesign package comparison around suitability, included work and limits. Preserve existing prices and wire values until a separate commercial decision changes them.
- [x] **SERV-03 / P1 / M:** Build a progressive builder with step labels, Back/Continue, edit-from-summary and state retained within the visit. Each step must be linkable or recoverable through defined navigation.
- [x] **SERV-04 / P1 / M:** Group additions by purpose; surface applicable ones first without silently discarding prior choices. Use consistent multi-select semantics and an explicit selected count.
- [x] **SERV-05 / P1 / M:** Show one-time and recurring charges separately. Custom items stay “To be scoped”; never treat them as £0 or present a binding final quote.
- [x] **SERV-06 / P1 / M:** Provide a compact desktop summary and mobile summary disclosure that never covers fields or submit controls.
- [x] **SERV-07 / P1 / L:** Resolve maintenance-before-enquiry friction with the backend contract work in section 8. A “Discuss aftercare” choice needs intentional server validation and email presentation.
- [x] **SERV-08 / P1 / M:** Upgrade attachments with filenames, individual remove actions and local count/size guidance while keeping server checks authoritative. Match accepted types and limits exactly.
- [x] **SERV-09 / P1 / M:** Add a review step, explicit sending state, useful completion panel and field-linked error summary. Keep the brief intact on failure.
- [x] **SERV-10 / P2 / M:** Use a small responsive interface preview to explain service differences. No heavy 3D inside form controls. Original Website/App/System studies follow the real service selection, preserve brief state and limit example/package claims; native selection and responsive/contrast checks pass.

**Files:** `routes/Services.tsx`, `features/services/services.ts`, shared brief/contact feature, active interior styles; backend DTO/controller/email/tests for changed intent or requirements. **Gate:** website and bespoke visitors complete a brief on mobile; choices survive Back/edit; keyboard selection works; amount labels remain accurate; validation/429/503/upload failures preserve inputs.

### 4.4 Portfolio / Work — `/portfolio`

**Job:** prove design and delivery capability and help a visitor identify relevant work.

**Current:** large editorial heading, category filters and vertical entries sourced from the publishing API. The live public API is also empty as of this re-audit. Do not fill it with invented projects or publish private drafts just to complete the audit. A credible showcase is now a confirmed production content dependency.

**New composition:** featured project stage, editorial work grid with real screenshots, useful category filters, compact project outcomes and a relevant enquiry entry. Visually distinct projects should have space to show their identities.

- [x] **WORK-01 / P0 / M:** Select projects that can be shared and prepare real cover/screenshots/story content. Obtain any client/content permission needed before publication.
- [x] **WORK-02 / P1 / L:** Build a showcase with varied but predictable project layouts; imagery leads and category/summary stay readable.
- [x] **WORK-03 / P1 / M:** Preserve filter state when returning from a project; add result counts and a useful zero-results reset.
- [x] **WORK-04 / P1 / M:** Add stable loading placeholders and intentional API-error/empty states, with retry and contact routes.
- [x] **WORK-05 / P1 / M:** Give hover and keyboard focus an equivalent project preview. Touch opens the project normally; no hover-only descriptions.
- [x] **WORK-06 / P2 / M:** Evaluate search only when the real portfolio volume justifies it; avoid empty controls over a small collection.

**Files:** `routes/Portfolio.tsx`, portfolio feature components/API hook, active studio styles. **Gate:** real published entries, all categories, empty results, API failure and return navigation verified; no private media leaks; responsive imagery and layout stability checked.

### 4.5 Project case study — `/portfolio/:slug`

**Job:** explain a real challenge, show how it was solved, demonstrate the finished work and lead to a relevant brief.

**Current source:** project headline/summary, live link, cover, 3D display, idea/approach/outcome text, gallery and CTA. The same cover is used as the device texture even if its aspect ratio does not fit. The inactive device poster is generic. There is no next-project journey or section navigation. A separate development draft exists, but the actual populated route remains unverified because the live public list is empty.

**New composition:** dramatic real project cover with succinct facts; challenge and scope; selected design decisions; interactive responsive device showcase; captioned gallery; evidenced outcome; next project and “Build something like this”.

- [x] **CASE-01 / P1 / L:** Rebuild case-study composition using existing overview/approach/outcome fields first; add structured fields only where they provide real editorial value.
- [x] **CASE-02 / P1 / M:** Provide an accurate project-specific inactive device preview, then optional live 3D with matched camera and materials.
- [x] **CASE-03 / P1 / L:** Support separate desktop/mobile screen images, so switching devices shows the appropriate design rather than squeezing a single cover into every screen.
- [x] **CASE-04 / P1 / M:** Add captioned gallery exploration with optional accessible lightbox: named controls, keyboard previous/next, Escape and focus return.
- [x] **CASE-05 / P1 / M:** Add section jump navigation, next/previous work and preserved portfolio filter context.
- [x] **CASE-06 / P1 / M:** Carry project interest into Contact without copying private data or claiming a fixed quote.
- [x] **CASE-07 / P1 / M:** Resolve metadata ownership and project share imagery; verify a direct HTML request and an internal link to the same case study.
- [x] **CASE-08 / P0 / M:** Verify published/missing/unpublished project paths and private preview boundaries using authorised test content.

**Files:** `routes/PortfolioProject.tsx`, `ProjectPresentation.tsx`, `ModelStage.tsx`, portfolio contract/editor/backend/schema if new screen fields are introduced. **Gate:** a real or clearly labelled local test project exercises the entire page; gallery and device assets are accurate; draft never appears publicly; outcome claims have evidence.

### 4.6 Support — `/support`

**Job:** reassure existing clients, explain aftercare and collect actionable support information.

**Current:** service-like heading, three support descriptions, generic monitor and contact links. The maintenance link leads to the top of Services. Support contact does not carry support intent and reaches the build form.

**New composition:** “What do you need?” issue/update/improvement selection; concise aftercare options; useful troubleshooting guidance; support-specific brief and expectations. A diagram or interface example is more useful here than another decorative device stage.

- [x] **SUP-01 / P1 / M:** Recompose as a service desk with issue, content update and improvement paths.
- [x] **SUP-02 / P1 / L:** Route a support intent into the enquiry workflow; ask for website address, what happened, expected result and reproduction steps. Attachments require explicit backend support.
- [x] **SUP-03 / P1 / S:** Deep-link maintenance information to its actual section or dedicated comparison, rather than the Services hero.
- [x] **SUP-04 / P1 / M:** Add concise scope/exclusions and useful FAQs. Use agreed response expectations; no invented SLA, monitoring claim or guaranteed uptime.
- [x] **SUP-05 / P2 / M:** Replace the generic monitor with an explanatory layered DOM/SVG diagram or a small supported interface example. Original connected Describe/Review/Agree flow, horizontal desktop/vertical mobile, HTML list/caption and existing support CTA; no invented live ticket or guaranteed timing.

**Files:** `routes/Support.tsx`, shared enquiry feature, service data and related backend contracts where required. **Gate:** existing client can submit an issue without pretending to commission a new website; response/cost expectations are clear.

### 4.7 Contact / Start a project — `/contact`

**Job:** make it easy to contact James at different stages of a project.

**Current:** model-led hero followed by two-column form/summary. On mobile, empty summaries precede the form. Message and extra-information fields overlap in purpose. Both package and maintenance must be chosen. Optional phone can remain blank even when WhatsApp is selected; clarify and validate the selected communication route intentionally.

**New composition:** short introduction → enquiry purpose → minimal relevant questions → optional brief detail → review/send → clear next step. Keep project configuration available to visitors who already know their scope, rather than asking everyone to repeat it.

- [x] **CONTACT-01 / P1 / L:** Create Project / General question / Existing-client support modes; initial view depends on incoming intent but can be changed visibly.
- [x] **CONTACT-02 / P1 / M:** Put the first meaningful field near the introduction; move summary below fields on mobile or show it only when useful.
- [x] **CONTACT-03 / P1 / M:** Share non-sensitive selections with Services and retain inputs during internal edits. Do not persist names, emails, phone numbers or messages to browser storage by default.
- [x] **CONTACT-04 / P1 / M:** Unify addition selection with Services; keep clear optional “Not sure yet” scope choices once the server supports them.
- [x] **CONTACT-05 / P1 / M:** Clarify labels, required/optional status and contact preference; reveal phone guidance for WhatsApp and keep client/server rules aligned.
- [x] **CONTACT-06 / P1 / M:** Add field-linked error summary and intentional completion screen. Keep sending/failure/retry states understandable; never claim delivery solely because the button was pressed.
- [x] **CONTACT-07 / P1 / S:** Replace the plain internal Services anchor with router navigation so internal journeys keep their intended state.
- [ ] **CONTACT-08 / P1 / M:** Add an approved privacy explanation and links to the relevant informational page. Explain next steps without invented turnaround promises.
- [x] **CONTACT-09 / P2 / S:** Use a subtle framing/light response to step completion rather than a large interactive phone above the form.

**Files:** `routes/Contact.tsx`, `features/contact/`, shared brief state, active interior styles, backend contracts/tests for new modes. **Gate:** short enquiry and full brief both work; mobile form order is useful; appropriate required fields; no data loss on failure; mail delivery tested only through the approved environment.

### 4.8 Missing page / missing project — 404

**Current:** readable recovery message with home/work links and shared shell. It is useful but visually repeats the page-heading template. The server’s generic SPA fallback still returns 200.

**Current task status:** ERR-02 already has the core source distinction: API 404/no project uses NotFound, other request failures retain a retry panel. Preserve this while redesigning, then verify loaded missing/temporary-error fixtures. ERR-01/03 and final state acceptance remain open.

- [x] **ERR-01 / P1 / S:** Create a branded “lost signal” illustration with one clear recovery action and links to Work/Contact. Static/SVG art is sufficient.
- [x] **ERR-02 / P1 / S:** Distinguish missing project from temporary project API failure; retain retry on service failures.
- [x] **ERR-03 / P2 / M:** Review HTTP 404 semantics and noindex behaviour with server metadata and SPA routes.

**Files:** `routes/NotFound.tsx`, `PortfolioProject.tsx`, active styles; `SpaController`/metadata/tests if HTTP behaviour changes. **Gate:** unmatched and missing project navigation returns to a valid page; error handling does not mistake network failure for nonexistent content.

### 4.9 Special birthday route — `/birthday/mission-vi`

This is a separate personal experience outside `Layout`, not an ordinary Crystal Powers service page. At audit time the route displayed `PostBirthdayMission`: its own chapter navigation, imagery, night-drive control and countdown. The older birthday reveal remains selected only before the configured cutover date. This plan includes the route so it cannot be accidentally broken or omitted.

- [x] **SPECIAL-01 / P1 / S:** Preserve the existing route, date branch, story and separate styling during the public 2.0 build; check for global CSS/font/motion leakage. Both branches and the date cutover are locally verified; public appearance/metadata restore on return.
- [x] **SPECIAL-02 / P2 / M:** Review its mobile, keyboard, reduced-motion and countdown-expiry states in a separate pass before redesigning this personal experience. 36 browser checks cover both branches, six widths, keyboard, reduced motion and synthetic expiry. Countdown announcements, duplicate robots metadata and action focus are fixed.
- [x] **SPECIAL-03 / P2 / S:** Verify time-sensitive public statements against their official source if content is updated. Rockstar's scheduled 19 November 2026 date is verified; expiry now asks visitors to check the official launch status. This does not certify availability, an exact unlock time or a purchase.

**Files:** `BirthdayMission.tsx`, `PostBirthdayMission.tsx`, birthday styles. **Gate:** special route still works independently and is excluded from the public sitemap/indexing. A separate requested redesign would preserve the personal message.

## 5. Owner studio — every screen and workflow

The initial re-audit was inspection-only. Continuation now uses an isolated synthetic local owner for MFA, owned media, saved preview, featured selection and publication acceptance. No live owner credentials or live publication were changed. The dedicated owner redesign and full account/recovery/revision/session acceptance remain open.

### 5.1 Sign-in — `/admin`

Current login is inside the marketing shell. Security flow includes password, MFA, optional first-owner setup and recovery. A futuristic treatment should give this a quiet, dedicated workspace identity.

- [x] **AUTH-01 / P1 / M:** Build a focused owner layout with a discreet public-site link, clear sign-in fields and restrained brand art.
- [x] **AUTH-02 / P1 / S:** Add accessible password visibility and clear busy/error states without logging credential values.
- [x] **AUTH-03 / P1 / M:** Keep email/password/MFA validation and session protections unchanged through the visual refresh; verify server-rejection states.

**Owner:** `Admin.tsx`, `OwnerSignIn.tsx`, `admin.css`, app layout integration. **Gate:** sign-in remains usable by keyboard/password manager and provides a clear next step on failure.

### 5.2 First-owner setup, MFA enrolment, verification and recovery codes

Current enrolment displays a manual authenticator secret and codes once, with a stored-codes checkbox and download action. Keep that deliberate security journey.

- [x] **AUTH-04 / P1 / M:** Design explicit Setup → Authenticator → Recovery codes → Studio steps with progress and accurate instructions.
- [x] **AUTH-05 / P2 / M:** Evaluate a locally generated authenticator QR and copy control, with the manual key preserved. Never send secrets to an external QR service.
- [x] **AUTH-06 / P1 / S:** Improve six-digit and recovery-code entry without forcing recovery codes into a numeric-only field.
- [x] **AUTH-07 / P1 / M:** Verify one-time code display/download, completion acknowledgement and return-to-sign-in; keep secrets out of screenshots and QA records.

**Owner:** `OwnerSignIn.tsx`, existing security APIs and tests if logic changes. **Gate:** no bypass of MFA and no secret exposure from the new UI.

### 5.3 Password recovery — `/admin/reset`

Current recovery supports request/reset modes; reset token is held in memory and removed from the address bar. Preserve this behaviour.

- [x] **REC-01 / P1 / M:** Design request-sent, reset, expired/invalid link, verification failure and completion states distinctly.
- [x] **REC-02 / P1 / S:** Preserve generic account-existence messaging, token handling, authenticator/recovery requirement and safe return to sign-in.
- [x] **REC-03 / P1 / M:** Verify the full recovery flow with a synthetic local owner and disabled/test mail; actual credential entry remains a user action where required.

**Owner:** `OwnerRecovery.tsx`, security contracts. **Gate:** understandable recovery without weakening protection or capturing tokens in analytics.

### 5.4 Dashboard, new project and archived projects

Current dashboard exposes title/status/address, featured checkbox, numeric order and editor entry; creation needs title and slug. There is no thumbnail-driven overview or search/status grouping.

- [x] **ADMIN-01 / P1 / L:** Build a dedicated workspace with thumbnail rows/cards, saved/published revision status, last update, featured status and sensible sorting.
- [x] **ADMIN-02 / P1 / M:** Add draft/published/archived filters and empty/loading/error states. Add search only when collection size supports it.
- [x] **ADMIN-03 / P1 / M:** Improve new-draft creation with a suggested slug and an explicit editable preview; keep existing project addresses stable.
- [x] **ADMIN-04 / P1 / M:** Improve featured ordering with accessible move-up/down controls. Drag ordering is optional and needs the same keyboard equivalent and conflict handling.
- [x] **ADMIN-05 / P1 / M:** Make archive/restore status visible and explain impact on public visibility before the action.

**Owner:** `Admin.tsx`, portfolio API/types, `admin.css`. **Gate:** James can identify, create, open and order projects efficiently without confusing draft/published/archive status.

### 5.5 Project editor — Details, Images, Story, History, Preview

Current editor already separates draft save from publishing, has revision restore, private uploads/preview, conflicts and unsaved-change warnings. Keep this strength; improve discoverability and media editing.

- [x] **EDIT-01 / P1 / L:** Design a readable editor with persistent project identity, save status, section navigation and a clear Save draft / Preview / Publish hierarchy.
- [x] **EDIT-02 / P1 / M:** Make publishing readiness link directly to the missing field; distinguish missing content from unsaved work.
- [x] **EDIT-03 / P1 / L:** Add media thumbnails, descriptive labels, cover choice, gallery ordering and separate responsive device screenshots if CASE-03 is adopted.
- [x] **EDIT-04 / P1 / M:** Give Story fields purpose and examples that encourage truthful case studies; avoid invented metrics.
- [x] **EDIT-05 / P1 / M:** Improve History with timestamps, draft/published markers and clear restore-as-new-draft explanation. A diff view is P2.
- [x] **EDIT-06 / P1 / L:** Offer desktop/tablet/mobile private preview using the same public presentation components; preserve private-media authentication. Actual 1440/768/390 px frame viewports use the shared public presentation, private owned image URLs and optional live 3D; unsaved edits stay in memory and no sharable preview route or draft source payload is created. Local viewport/palette/focus/gallery/error checks and actual server ownership/publication checks pass.
- [x] **EDIT-07 / P1 / M:** Add an explicit publish review explaining exactly which saved revision goes live. Verify unpublish/archive/restore from this screen.
- [x] **EDIT-08 / P1 / M:** Keep stale-version conflict handling and inputs intact; make reload/discard consequences clear.
- [x] **EDIT-09 / P2 / L:** Evaluate autosave only after defining concurrency, debounce, network failure and revision-history behaviour. Explicit save remains the initial 2.0 default. [Owner workspace decisions](reviews/OWNER_WORKSPACE_DECISIONS.md) define all four concerns, expiry/privacy/upload/publication/exit requirements and the reasons for retaining explicit saving. No autosave feature is enabled or falsely claimed; typing, preview changes and reauthentication are verified not to create revisions automatically.

**Owner:** `ProjectEditor.tsx`, `ProjectPresentation.tsx`, portfolio contracts, backend DTO/service/repository/migrations for new fields. **Gate:** upload → draft → preview → publish → public view → revision restore works with test content; no draft leaks and no lost edits after failure/conflict.

### 5.6 Account security

Current settings include password changes, authenticator replacement and recovery-code replacement, with password/code verification.

- [x] **SEC-01 / P1 / M:** Design separate labelled sections with clear consequences and completion states; keep secrets and codes deliberately contained.
- [x] **SEC-02 / P1 / M:** Preserve verification requirements and session invalidation behaviour. Verify replacement-code acknowledgement and the route back to the dashboard.

**Owner:** `OwnerSettings.tsx`, existing security APIs. **Gate:** security workflows stay deliberate and comprehensible; visual refresh does not broaden access.

### 5.7 Session expiry and reauthentication

The redesigned modal keeps the editor mounted, reads the current password/MFA state and allows returning to the draft or deliberately leaving. Successful sign-in clears the stale expiry error and asks the owner to review and retry. No action is replayed automatically.

- [x] **SESSION-01 / P1 / M:** Explain that edits remain in the current tab; preserve content through successful reauthentication and failed attempts. Local UI and real password/MFA invalidation checks preserve the unsaved summary and saved/public revision distinction.
- [x] **SESSION-02 / P1 / M:** Define an explicit discard-and-leave action with confirmation, focus management and a warning before closing the tab. Explicit return and Escape release the modal; pending sign-in locks exits; cancelled/confirmed discard and native beforeunload are checked.
- [x] **SESSION-03 / P1 / M:** Test expiry during edit, save, upload and publication; actions must not be shown as completed without server confirmation. Actual isolated server logout invalidates the active browser session before save/upload/reviewed publication; rejected actions keep content/library/public revision and are never replayed after reauthentication. An explicit save retry creates one revision; publishing requires fresh permission/review.

Evidence: `verify-session-browser.cjs` uses labelled API fixtures for unavailable checks, partial MFA, pending forms, failures and safe exits; `session-server-journey.cjs`, called by packaged portfolio QA, uses actual server sessions and private/public APIs. Reports are ignored under `.codex-runtime/qa/session-pc/` and `portfolio-pc/`. Credentials remain only in test memory. The configured 30-minute idle timeout is preserved; natural idle waiting, hosted sessions and physical/screen-reader acceptance are not claimed.

**Owner:** `Admin.tsx`, `ProjectEditor.tsx`, API helper and security tests. **Gate:** expired sessions do not silently lose content, publish twice or leave an unusable focus state.

## 6. New informational pages and optional features

Build only pages with a real user job. The list below is a proposal, not a claim that these routes or services exist.

| Proposal | Value | Recommendation / dependency |
| --- | --- | --- |
| Privacy information — proposed `/privacy` | Explain enquiry handling, media, providers, retention and contact | P1 content dependency: describe actual operations; review with James before publication |
| Accessibility information — implemented `/accessibility` | Supported keyboard, appearance/motion and optional 3D alternatives; barrier feedback | Local: guide/footer/metadata/sitemap in 169 shell checks; no conformance claim; physical/assistive acceptance open |
| Delivery/process guide | Explain feedback, handover and support | P1 as an About section first; separate route only if content warrants it |
| Service-detail pages | Give websites/apps/systems specific examples and scope | P2 after Services journeys work; add routing, metadata and sitemap together |
| Public lab / experiments | Showcase clearly labelled prototypes and interaction craft | P2: only with real experiments, accessible fallbacks and honest demo labels |
| Client portal / progress tracking | Could improve an ongoing client relationship | Later release: requires its own roles, data model and workflows; owner authentication is not a client portal |
| Booking calendar | Could reduce scheduling effort | P2: requires James’s real availability, chosen integration and data handling |
| AI assistant / chatbot | Could answer repeated enquiries | Deferred until a specific useful job, reliable content, privacy and cost are defined |

- [ ] **NEW-01 / P1 / M:** Prepare privacy/accessibility content from real operations; create routes only when ready; add footer, metadata and sitemap entries.
- [x] **NEW-02 / P2 / S:** Revisit optional additions after core public and owner journeys pass. Record value and operating cost before committing to them. OPTIONAL_FEATURE_DECISIONS_2_0.md evaluates process/service/lab routes, portal, calendar, assistant, QR and autosave after named local journeys. Existing useful inline experiences remain; no additional provider/dependency or subscription committed. Whole-page/physical/hosted acceptance remains separate.

## 7. Animation and 3D production plan

### 7.1 Signature opening storyboard

Liquid Light replaces the Aurora opening on Home. The original Blender recipes/models remain for devices and provenance. The unused old CrystalOpening React component has been removed.

1. Rest: readable offer, native actions and original light artwork.
2. Explore: the light veil moves aside over 750ms by default; actual selected work stays linked.
3. Reverse/replay: one owned Web Animations timeline starts from the interrupted frame.
4. Still/failure: reduced effects, hidden/offscreen state and unavailable animation/image handling preserve meaningful content and navigation.
5. Adjust: development controls expose colour, intensity, scale and duration; stored appearance preferences remain.

Local opening/keyboard/fallback checks now pass; physical-device and complete release acceptance remain separate. See [implementation](LIQUID_LIGHT_IMPLEMENTATION.md). Original model contracts still protect retained device stages; the public hero does not require a new Blender model.

- [x] **3D-01 / P1 / L:** Create the selected original signature visual and deliberate reversible opening. Use the appropriate DOM, light/shader or authored-model technique for James’s chosen concept; do not force the rejected Aurora sculpture as the main visual. Preserve original Blender assets and existing device animations. Selected Liquid Light implementation and local browser acceptance pass; physical-device and release acceptance remain separate. **Accepted locally 13 October:** see PC verification evidence in progress; this does not accept the complete release.
- [x] **3D-02 / P1 / M:** Update animation contracts and action selection to explicit clip names; retain laptop opening and legacy single-clip compatibility where needed. Fresh PC contract check passed; live homepage reached ready/open with one canvas. Physical-device/failure acceptance remains separate.
- [x] **3D-03 / P1 / L:** Match poster/live framing, exposure, lighting and material treatment; avoid the observed dark live-view mismatch. **Accepted locally16 October against selected Liquid Light:** unchanged live renderer/model/screen hashes validated;110 source-browser checks and36 independent actual-pixel pairs cover all retained models, light/dark poses and three frame ratios (colour error≤5.76/255, bounds≤1px, full one-pixel coverage; original photographic negative controls rejected). Current packaged delivery244 checks cover selected DOM artwork and30 labelled approved-Clare device fixture views in five appearances. Screenshot-first project artwork intentionally becomes an optional device view; real publication, physical devices and whole-page/release acceptance remain separate. See [current poster review](reviews/POSTER_LIVE_REVIEW_2_0.md).
- [x] **3D-04 / P1 / M:** Coordinate opening state and DOM masks using existing animation tools with one owner per property. Clean up all timelines and route transitions. **Accepted locally 13 October:** see PC verification evidence in progress; this does not accept the complete release.
- [x] **3D-05 / P1 / M:** Implement skip/replay/close/loading/error states, focus return and a short warm-up timeout that falls back cleanly. **Accepted locally 13 October:** see PC verification evidence in progress; this does not accept the complete release.


Previous Aurora page acceptance is historical. Liquid Light opening/state/fallback and the current optional collection’s local poster/live material acceptance now have fresh evidence. Physical-device and complete page/release gates remain open.

### 7.2 Asset inventory and delivery

| Asset | Current verified file size / contract | 2.0 production need |
| --- | --- | --- |
| Aurora / Observatory hero | 423,864 bytes; 52 meshes / 75 nodes; `CrystalOpen` and `CrystalClose`, 2.417 s each | Retained original opening/closing asset with current matched posters; selected main hero uses Liquid Light; physical-device performance remains separate |
| Crystal | 227,840 bytes; manifest: 5 meshes, `CrystalTurn` | Retained optional sculpture with matched live-renderer light/dark posters; selected Liquid Light does not require new opening geometry |
| Laptop | 1,063,912 bytes / 7 meshes; unchanged `LaptopOpen` / screen / authored surfaces | Lossless consolidation locally verified; physical rendering tiers and final screen/material framing remain separate |
| Monitor | 62,828 bytes; no authored animation | Improve bezel/stand/material polish; project-specific display |
| Phone | 91,180 bytes; no authored animation | Improve screen/bezels, accurate mobile textures and crop |
| Crystal film | Dark 1,068,145 bytes; light 791,323 bytes | Optional new opening film only if it improves fallback; do not fetch it by default |
| Page diagrams | No new asset created in this audit | DOM/SVG service/process illustrations before additional WebGL scenes |

Aurora uses an original deterministic packed mineral texture. Four closed/open light/dark poses have 800/1600 px WebP outputs (small variants approximately 15–24 kB; larger approximately 37–57 kB) plus PNG fallback. Other device assets remain the earlier originals. Import a new model only when it improves a defined page job, with licence/source/scale/pivots/materials/size and fallback recorded; no purchase or installation is implied by this plan.

Paths: editable scenes/recipes in `assets/blender/`; GLBs in `frontend/public/models/`; web stills/films in `frontend/public/renders/`. Keep original scenes and exports separately reviewable.

- [x] **ASSET-01 / P1 / M:** Record ownership/licence/provenance for any imported model or texture. Prefer original studio assets; buying/licensing assets needs a separate decision. Current original recipes/scenes/model/texture/still/film/default-screen provenance and hashes are documented in ASSET_REVIEW_2_0.md; no imported model/texture found. Future imports and client permissions remain explicit boundaries.
- [x] **ASSET-02 / P1 / M:** Validate GLB transforms, normals, scale, pivots, named clips and self-contained buffers; preserve `Screen` / `role=project-screen` / physical aspect metadata. Read-only decoded geometry verification passes all five GLBs, actual screen rectangles/UVs, finite/unit values, index/view bounds, transforms and animation targets/times/quaternions. Optical/physical acceptance remains separate.
- [x] **ASSET-03 / P1 / M:** Consolidate laptop geometry/materials; create desktop/mobile quality variants where measurements justify them. Delivered 104→7 mesh consolidation, 19.5% smaller, all 30,902 surfaces/normals/materials/hinge keys preserved and actual rotation submissions 143→46. Same improved export works at 390/1440; no speculative geometry LOD added without physical benchmark justification.
- [x] **ASSET-04 / P1 / M:** Export mobile/desktop WebP posters, reserve dimensions and generate matching fallback views. Avoid requiring large PNGs for routine page paint.
- [x] **ASSET-05 / P1 / M:** Extend asset manifest/validation for opening clip names, screen aspect ratios, model sizes and fallback availability. Verified 9 October against all five exported models and all closed/open responsive posters; live-opening acceptance remains under 3D-02/03/04/05.

**Current task status:** ASSET-01/02/03 retain original provenance, decoded geometry/animation/screen and lossless laptop evidence. ASSET-04/3D-03 have fresh16October local delivery/optical acceptance:12 transparent captures/24 WebPs,36 source pixel pairs and244 current packaged delivery checks, with30 labelled approved-Clare optional device fixture views. Liquid Light Home/Studio use DOM art; historical20-pair native Aurora evidence is not current-page acceptance. See [poster review](reviews/POSTER_LIVE_REVIEW_2_0.md). Physical/hosted/whole-page acceptance remains separate.

### 7.3 Motion specification

Proposed timings below are design starting points, not measured production claims. Use CSS for small state transitions, an existing timeline library for authored sequences, and R3F for scene motion. Avoid overlapping ownership of the same transform.

| Interaction | Trigger / duration / easing | Mobile / reduced motion / failure | Cleanup |
| --- | --- | --- | --- |
| Crystal opening | Explicit opening toggle; current authored clips about 2.417 s, staggered minimum-jerk movement with reversible runtime progression | Fixed camera/touch drag / open still / rendered fallback | Stop action; dispose offscreen/hidden/route resources; latest failure regression still open |
| Route transition | Internal navigation; 180–300 ms; ease-out | Short opacity / immediate content / navigation still works | Cancel obsolete timeline; retain route-focus and history behaviour |
| Section introduction | First viewport entry; 300–500 ms; small translate and opacity | Smaller/no translate / immediate visibility / content visible if observer fails | Disconnect once revealed; clean on unmount |
| Work preview | Hover and focus; 150–250 ms; ease-out | Tap goes to project / no transform / static cover | Remove listeners and reset transform |
| Builder step | Continue/Back; 180–240 ms; ease-out | Same content order / instant / plain step change | Cancel outgoing animation; focus step heading or first error |
| Device change | Explicit selection; 250–450 ms; ease-in-out | Matched still until ready / instant switch / keep current poster | Dispose stage resources and restore focus appropriately |
| Menu/appearance | User toggle; 160–220 ms; ease-out | Accessible disclosure / instant / normal links remain | Escape and route close; focus return |
| Completion | Confirmed server success; 250–400 ms; short settling effect | Static confirmation / same message / textual status | No permanent loops; cancel on navigation |

- [x] **MOTION-01 / P1 / M:** Implement a shared motion policy for system preference, Reduce effects, quality tier and page visibility.
- [x] **MOTION-02 / P1 / M:** Add route/section transitions without delayed reading, scroll-jacking or hidden essential content.
- [ ] **MOTION-03 / P1 / M:** Verify cancellation during rapid navigation, repeated activation, tab hiding and stage switches; no duplicate listeners or accumulated canvases.

### 7.4 Proposed performance budgets

Targets for 2.0 verification, not current certification: retain lazy scene chunks and one active canvas; DPR clamped to measured device tiers; demand rendering while idle; no continuous offscreen effect. Home now warms a visible live crystal before explicit opening, so measure its network/LCP/GPU cost against a poster-first alternative before accepting the performance policy. Other optional stages remain activation-driven. Aim for LCP ≤2.5 s, CLS ≤0.1 and INP ≤200 ms under recorded representative conditions. Field performance requires later real-user evidence.

Aim for smooth desktop rendering near 60 fps and a stable mobile experience around 30 fps on agreed representative physical devices. If these cannot be sustained, degrade effects or use the still. Keep the current asset validator’s 5 MiB ceiling as a hard guard, but use a much tighter working target near 1 MiB for the new hero model and justify exceptions by measurement. Compression decoders may add dependencies and must be planned explicitly.

- [x] **PERF-01 / P1 / M:** Record initial requests, compressed bundles, image/model sizes and rendering cost before/after each major visual feature.
  - Local measurement24October: requests, compressed assets, image/model inventory, cold-route stability and retained-baseline/current GPU profiles are recorded in the bulk review. Baseline absence of Prism and compact fallback rows are explicitly non-comparable. Concurrent Companion acceptance is excluded at James's request; physical/native/hosted gates remain separate.
- [x] **PERF-02 / P1 / M:** Define low/standard/high rendering tiers controlling DPR, transmission resolution/samples, lighting and geometry; benchmark before adding bloom/refraction stacks. **PC evidence:** shared native quality preferences, actual 1/1.5/2 DPR caps, 128/256/512 environment faces, environment geometry/lightformers and native transmission activation/.5/1 resolution; unchanged authored geometry and no custom sample stack. Final packaged98 checks measure real buffers/GL target allocations and hinge work; source86 passes before additional panel/storage cases. Build, 43 H2 tests, 28 initial-route profiles and shell/Home/birthday/HTTP refresh pass. [Implementation and limits](reviews/RENDERING_QUALITY_2_0.md). This is local rendering policy/benchmark evidence, not physical-mobile or complete motion/visual acceptance.
- [ ] **PERF-03 / P1 / M:** Run physical-device checks separately from responsive browser checks; record device, viewport, quality, frame time and thermal behaviour.

**Current task status:** MOTION-01/02 have current shared-policy, readable transition and cancellation evidence in [motion review](reviews/MOTION_REVIEW_2_0.md). MOTION-03 is partial: repeated route/device ownership, bounded listeners, missing-observer fallback and deterministic hidden-state/no-draw/resume checks pass; actual native background-tab acceptance remains unproven in this automated Edge environment. PERF-01 retains route/assets/rendering measurements but not complete representative interaction/field proof. PERF-02 is accepted locally with measured quality bounds; physical PERF-03 remains open. Earlier laptop Iris Xe observations do not certify the PC GPU or a physical phone.

## 8. Workflow and contract changes

The visual rebuild can preserve the existing React/Spring architecture. Several usability improvements do require deliberate data/API changes; they cannot be implemented only by hiding required fields.

| Change | Frontend impact | Backend / API / data impact | Verification and rollback |
| --- | --- | --- | --- |
| Shared build selections | Contact/Services use one visit-level brief state | None if payload remains current `ContactForm` | Back/edit/internal navigation; reset; do not persist personal fields. Roll back to route-local state if necessary |
| General/support enquiry intent | Different fields/labels/required states | Backward-compatible intent default; conditional DTO validation; email rendering; possibly a dedicated support endpoint | Existing legacy payload remains valid; new intent tests and mail-disabled integration checks; feature flag until both sides ready |
| Aftercare “discuss later” | Genuine undecided choice | Allowed value and validation/email update; preserve existing plan values | Both endpoints and failure messages; no fabricated plan selection |
| Responsive case-study screen media | New editor fields and display selection | Project DTO/types, storage references, schema/migration, revision and publication support | Old projects still render; private/public media checks; roll back UI without deleting retained data |
| Structured case-study fields | Optional timeline/scope/role/outcome modules | Only if adopted: additive nullable fields with old-content compatibility | Preview/public render parity and revision restore |
| Informational pages | Routes/footer/content/metadata | SPA/server metadata/sitemap entries | Direct load and internal links; remove unfinished links together |
| Owner layout | Workspace shell around existing states | Usually no API changes | Authentication and all editor journeys; restore old layout independently |

No destructive schema change, draft publication, price change, dependency installation, email transmission or deployment is part of this audit. Preserve enquiry rate limits, upload checks, private storage, CSRF/MFA/session boundaries, legacy redirects and share metadata.

- [x] **FLOW-01 / P1 / M:** Define the enquiry-intent contract and required field matrix before changing the form UI.
- [x] **FLOW-02 / P1 / M:** Trace Website/App/System/Support CTAs end to end and record incoming intent, fields, payload, response and next step.
- [x] **FLOW-03 / P1 / M:** Define brief reset and unsaved-input behaviour for internal navigation, browser Back and refresh; keep private details out of URLs.
- [x] **FLOW-04 / P1 / L:** Implement contract updates with server/client tests together and backwards compatibility for current enquiries.

## 9. Content and commercial decisions

- [x] **CONTENT-01 / P0 / M:** Prepare real publishable projects and evidence-backed outcomes; clearly label demonstrations. Only Clare’s Life Celebrations is approved: factual fields, source-confirmed technologies and actual desktop/mobile captures are prepared in CLARE_PORTFOLIO_CONTENT.md. Illustrative interfaces remain labelled. Production publication is still HOME-03, not this preparation task.
- [x] **CONTENT-02 / P1 / S:** Decide whether to keep existing package display names or use clearer customer-facing names while retaining wire values. Retain the current descriptive titles from shared services.ts; rationale and exact mapping are in DESIGN_SYSTEM_2_0.md. Prices and wire identifiers unchanged.
- [ ] **CONTENT-03 / P1 / S:** Confirm service inclusions, exclusions, aftercare expectations and handover wording. Existing prices remain unchanged pending a commercial decision.
- [x] **CONTENT-04 / P1 / M:** Supply approved founder portrait/work artefacts if desired; design a complete alternative if no portrait is available. Actual Studio has James's identity/process and the original Aurora artefact; the complete portrait-free alternative is documented and covered by 43 Studio checks. No invented or stock founder portrait.
- [ ] **CONTENT-05 / P1 / M:** Prepare accurate privacy/accessibility information and support expectations from real operating arrangements.
- [x] **CONTENT-06 / P1 / S:** Review all public copy in British English under Crystal Powers branding, with the legal operator name only where needed. PUBLIC_CONTENT_REVIEW_2_0.md records the route-by-route review, corrected claims/prompts, matching initial/browser metadata and local proof. Legal/privacy operating facts remain CONTENT-05/CONTACT-08; no unverified legal operator inserted.

## 10. Required user journeys

| Journey | 2.0 successful path |
| --- | --- |
| New visitor exploring | Offer visible → optional crystal opening → real work → relevant case study → contact |
| Visitor wants a website | Services → useful package comparison → optional additions → aftercare choice/discussion → brief review → confirmed enquiry response |
| App/system prospect | Service intent → relevant examples → bespoke questions → contact; no forced website package |
| Existing client needs help | Support → issue/update/improvement → relevant details → support enquiry; no new-build selections |
| Visitor undecided | Contact → general question → short form → clear next step |
| Visitor on weak/no-WebGL device | Complete static site → same content and links; art remains optional |
| Keyboard/reduced-motion visitor | All controls usable, motion-free equivalents, predictable focus and Escape behaviour |
| James updates work | Sign-in/MFA → dashboard → private draft → media/story → responsive private preview → save → publish → verify public view |
| James encounters a conflict/session expiry | Edits retained → clear reauthentication or conflict action → safe continuation or explicit discard |
| Broken link | Branded recovery → real route; temporary service error offers retry |

## 11. Implementation order and dependencies

Each phase should finish with a reviewable local result and an evidence entry. A/B are partially implemented and overlap the current homepage. Continue from their delivered work; review the drafts and finish contracts before implementing the connected enquiry pages. No full phase is accepted yet.

| Phase | Scope | Depends on | Exit condition |
| --- | --- | --- | --- |
| A | Content inventory, architecture reconciliation, design tokens and representative drafts | Current audit | Chosen 2.0 visual direction and contracts; asset/content gaps recorded |
| B | Shared shell/themes, motion policy, original crystal asset prototype | A | Responsive shell plus accessible, cancellable opening prototype with fallback |
| C | Homepage | B and cleared project content | Offer/proof/3D/project entry verified together |
| D | Services builder, Contact, Support | A, shared components, agreed intent contract | All enquiry purposes pass validation and navigation; no data loss |
| E | Portfolio index and case studies | B, project content/media contract | Real showcase and preview parity; loading/error/empty paths work |
| F | Studio page, informational pages and 404 | B, approved content | Public page set coherent; direct URLs and recovery checked |
| G | Owner authentication/dashboard/editor/security | B, E’s content contract | Synthetic-owner publishing and recovery/conflict flows verified |
| H | Cross-site optimisation, special-route regression, release preparation | C–G | Section 12 acceptance passes; release notes and rollback prepared |

### Practical continuation from this baseline

1. **Review direction and define contracts:** DS-01–04, FLOW-01/03, CONTENT-01/03. Review existing Home/Services/case-study drafts; settle component/material treatment and conditional fields for website/app/system/general/support. Record unresolved content decisions rather than inventing them.
2. **Finish the shared shell and homepage:** DS-06/07, HOME-01–08, 3D-03–05. Carry Aurora's geometry into actual layouts, minimise control clutter on mobile, show real work early and finish poster/live/static/failure acceptance. Keep proof/content work running alongside the enquiry implementation.
3. **Deliver Services, Contact and Support together:** SERV-01–10, CONTACT-01–09, SUP-01–05 and FLOW-02/04. Implement shared non-sensitive selections, editable step/review flow and genuine undecided/general/support contracts; retain prices and security/upload limits. Validate backward compatibility and existing enquiry email output.
4. **Deliver Work and populated case studies:** WORK/CASE tasks and editor media contract where adopted. Prepare approved projects; implement real screen art and gallery/story navigation, then verify private preview/public parity.
5. **Finish Studio, informational pages, recovery and special-route regression:** ABOUT/NEW/ERR/SPECIAL tasks. Build from real founder/provider content; no fake client evidence or unsupported accessibility claims.
6. **Deliver the dedicated owner workspace:** AUTH/REC/ADMIN/EDIT/SEC/SESSION tasks using synthetic local data before live acceptance. Preserve MFA, revision/conflict/session and private-media safeguards.
7. **Accept and release 2.0:** full page gates, measured performance/physical devices, security/provider/operational checks, version alignment and release notes. The already authorised 9 October deployment is a completed foundation release, not PHASE-H acceptance.

Rollback stays incremental: retain the previous deployable revision; keep draft designs separate until reviewed; make contract/schema additions backward compatible; revert visual layers without deleting project data or published revisions. Final completion requires every applicable page gate and section 12 evidence, not just a successful build or homepage animation.

- [ ] **PHASE-A:** Foundation and representative designs reviewed.
- [ ] **PHASE-B:** Shared experience and opening prototype reviewed.
- [ ] **PHASE-C:** Homepage accepted.
- [ ] **PHASE-D:** Services/Contact/Support accepted.
- [ ] **PHASE-E:** Portfolio and case studies accepted.
- [ ] **PHASE-F:** Remaining public/informational pages accepted.
- [ ] **PHASE-G:** Owner studio accepted.
- [ ] **PHASE-H:** Release candidate accepted.
- [x] **RELEASE-01:** Align agreed frontend/backend release versions, document migration/configuration requirements and retain the previous deployable revision. RELEASE_CANDIDATE_2_0.md records aligned 2.0.0, unchanged V1–V3, current configuration and the retained 83872dd source/jar with an offline 27-test rebuild, fresh boot and matching live frontend bytes. Actual deployment/backend revision, production-data restore and full acceptance remain RELEASE-02/PHASE-H.
- [ ] **RELEASE-02:** Confirm the final 2.0 candidate falls within James's authorised deployment scope; use existing authority where it applies, then verify its deployed revision, real routes and approved integrations. The authorised foundation deployment/provider delivery is already recorded; full 2.0 candidate acceptance remains open.

## 12. Acceptance checklist — apply to every page

Do not tick these globally because one desktop screenshot looks correct. For each page, record which checks apply and the evidence; mark unsupported/skipped cases explicitly.

- [ ] Offer/purpose and next action are clear; approved content has no placeholders or invented claims.
- [ ] Desktop and mobile layouts reviewed visually; tablet and intermediate breakpoints checked; no clipping or horizontal overflow, including at 200% zoom.
- [ ] Keyboard flow, visible focus, skip link, disclosures/dialogs and Escape/focus return work.
- [ ] Reduced motion and Reduce effects preserve content and function; no forced intro, scroll-jacking or hover-only action.
- [ ] All five appearances checked for readable text, controls, selections, errors and model/poster matching.
- [ ] Direct URL, internal navigation, Back/Forward and incoming enquiry context work.
- [ ] Loading, empty, failure, retry and completion states are truthful and usable.
- [ ] Form labels, conditional requirements, error associations, error summary and input retention checked where applicable.
- [ ] Upload count/type/size limits match the server; private/public media boundaries verified where applicable.
- [ ] Scene loading failure/context loss, slow network, offscreen/hidden tab and repeated stage activation tested where applicable.
- [ ] Meaningful images have useful alt text; decorative layers stay out of assistive output; contrast is measured.
- [ ] Route focus, heading hierarchy and screen-reader status announcements reviewed.
- [ ] Main bundle/requests/media/frame time measured; physical mobile test recorded separately.
- [ ] Server HTML metadata, client metadata, share image, canonical, robots and sitemap align for applicable routes.
- [ ] Relevant frontend build and backend contract/security tests pass; warnings and skipped tests recorded.
- [ ] No unrelated changes; documentation/ownership updated; rollback and migration compatibility clear.

### Cross-site release checks

- [ ] Existing public URLs and `.html` redirects preserved.
- [ ] Special birthday route independently regression-tested.
- [ ] Owner auth, MFA, recovery, security settings, drafts, revision restore and session expiry verified with synthetic data.
- [ ] Published changes appear publicly; unpublished/private content remains inaccessible.
- [ ] Enquiry and attachment delivery verified in the approved provider environment; local disabled-mail success is not live delivery evidence.
- [ ] No new dependencies added without explicit authority; any dependency changes receive an appropriate advisory check.
- [ ] Final browser console/network review contains no unexplained errors; residual warnings assessed.

## Expanded business hub and company email — 12 October 2026

Each item includes implementation and evidenced local workflow acceptance. Source-only progress does not earn a completed checkbox. Actual provider, native/physical and deployed release acceptance remains explicitly separate; a checked local workflow never closes those gates. Preserve the owner/portfolio/enquiry contracts throughout.

- [x] **HUB-01** Team login and invitation activation: admin-issued accounts, private single-use hashed links, recipient passwords, expired/replayed/wrong-recipient handling and private route metadata.
  - Local workflow accepted24October: actual UI-issued admin/support/member invitations, activation and MFA plus moderator/owner sessions pass31+38 real-browser checks. Team-auth79 covers fragment/noindex, role-free recipient password, expiry/replacement, cancellation and history states; current H2/PostgreSQL tests cover single-use, recipient and credential boundaries. Delivery belongs to MAIL-04/06.
  - [x] Team activation/sign-in browser subset —16October:79 packaged checks cover private fragment/noindex handling, recipient-owned confirmed password/no role selector, expired/replaced-link response, successful continuation, scrubbed-token Back/Forward, unsaved-field guard, frozen single-submit controls, MFA setup/error handling, failure-aware cancellation/clean restart, five appearances/six widths and no credential persistence. Fixed activation success looping on sign-in and route-owned request/field cleanup. Real provider and complete identity/security/member/recovery acceptance remain separate.
  **Later 16 October database evidence:** invitation cancellation and activation are exercised in both commit orders, with the second transaction observed waiting on the first connection's lock. Cancellation prevents subsequent activation; activation rejects stale cancellation and token replay. This strengthens the existing identity subset without accepting every recovery/reissue/member/provider case.
- [x] **HUB-02** Admin member screen: provision roles, edit/suspend/restore, cancel/replace invitations, remove access and recover accounts without exposing credentials or changing the protected owner.
  - Local workflow accepted24October: member-management43 and security137 UI checks, actual31-check provisioning/suspension flow and current database authority/recovery/concurrency tests cover the listed operations and protected owner. Production delivery/deployed acceptance remains separate.
  - [x] Local staff-management logic subset — 19 October: 43 final packaged browser checks cover bounded provisioning, recipient conflicts, invitation replacement/cancellation, explicitly confirmed suspension/restoration/recovery, fresh-revision role assignment, protected self-management, unavailable/refused management cleanup, actor draft reset and no stored invitation data. Existing real service/authority/session cases pass in both 190-test database suites; synthetic browser mail fixtures do not prove delivery. Parent visual/device/complete-role acceptance remains open.
- [x] **HUB-03** Role permissions: authoritative server checks for every resource/action; fixed admin/moderator/support/member roles plus bounded custom roles and escalation prevention.
  - Local authority gate accepted24October: current dual-database permission/profile/revocation/foreign-resource/concurrency regressions, actual base-role password/MFA/direct-denial journeys and fresh47 role-editor/43 member-management UI checks pass. Live credential/workspace resolution, lock rechecks and bounded profile management were traced in source. This is recorded local contract coverage, not a formal security certification; deployed/physical/provider acceptance remains HUB-18/release.
  - [x] Custom profiles stay within their base role and required permission dependencies; invalid combinations save nothing. Real H2/PostgreSQL integration evidence, 16 October.
  - [x] Assignment, profile changes and restoring base permissions revoke previous credential revisions; current grants govern subsequent team requests. Current-revision authentication fixtures are scoped grant checks, not extra MFA browser sign-ins.
  - [x] Bounded managers cannot edit their own profile, remove a peer's restriction to gain broader base grants, or create grants beyond their own authority.
  - [x] Archived higher profiles deny sign-in and retain management protections; lower managers cannot recover, reassign or weaken those accounts.
  - [x] Older upload-only profiles can be archived immediately; activation/restoration requires correcting the upload/message dependency. Owner and team identities remain separate.
  - [x] Role-editor fixture workflow passes47 packaged checks: protected controls, dependency guidance, preserved create/update conflicts and original version, dirty/discard safeguards, six widths/five appearances and keyboard return to member management.
  - **Historical16October limits:** these six subchecks alone did not complete HUB-03. The24October local authority gate above adds current database, actual-session and refreshed UI evidence; wider deployed/physical release acceptance remains separate.
- [x] **HUB-04** Team MFA/security: encrypted setup, replay-resistant codes, recovery/account settings, session expiry/revocation, CSRF/rate limits, security events and no client persistence of secrets.
  - Local security gate accepted24October: fresh137 staff-security UI checks plus current encryption, replay, expiry, CSRF, rate-limit, credential-revision and blocked-transaction tests pass. Actual owner/moderator/admin/support/member MFA/session revocation and restored one-use owner recovery codes pass. Real recovery-email delivery and complete deployed/physical acceptance remain separate.
  - [x] Staff self-service password change, sign out everywhere and staged authenticator replacement/cancellation are implemented. Current-password/fresh-MFA proof, encrypted pending setup, replay/deadline/version/actor checks, protected-owner separation, CSRF/rate limits, credential revocation and security events pass integration checks. The packaged UI passes137 synthetic browser checks across five appearances/six widths, including correction, single-flight, uncertainty, private-field clearing and visible mobile controls. See the16October staff-security checkpoint in progress for exact package/database evidence.
  **Historical16October remaining list:** recovery, cross-role/session lifecycle and suspension/reissue/custom-role cases gained later local evidence above. Physical/assistive and current deployed-candidate acceptance remains open. Existing admin-issued private recovery remains the lost-password/authenticator path; no staff recovery-code feature is claimed. The later16October concurrency checkpoint separately verifies blocked transactions for password/revocation, competing setup, recovery/confirmation and invitation cancellation/activation; it does not close the wider lifecycle gate.
  **Additional session proof 16 October:** old MFA/enrolment results are rejected after logout or a replacement login, without allocating an authenticated replacement session or returning the old setup key. Actual local HTTP verifies two-stage cookie rotation, private no-store/noindex access, logout, idle expiry and revoked-pending recovery. The MFA screen now offers failure-aware cancellation and clean restart; cancellation clears private proof only after confirmation. See the session-lifecycle progress checkpoint for precise test/package evidence and limits.
  **Owner/client continuation16October:** all authentication controllers now share the live-session/publication guard; owner challenge deadlines are rechecked after row locks before TOTP/key/recovery-code use. Controlled stale-result failures and real database/HTTP regressions pass without weakening owner/client role separation. Broader mixed-workflow/role/invitation/release acceptance remains separate.
- [x] **HUB-05** Workspace navigation: responsive channel/category/group/member/support/moderation navigation, role-specific destinations, keyboard focus and no inaccessible dead controls.
  - Local acceptance24October: protected UI/visual batches and actual owner/admin/moderator/support/member sessions verify role-specific destinations and responsive navigation; five populated surfaces fit390/768/1440px. Native/physical/deployed gates remain separate.
- [x] **HUB-06** Channel management: create/edit/archive, category and audience settings, customisation, version conflicts and permission changes applied to active readers.
  - Local workflow accepted24October: channel editor/workspace UI, actual ordinary/private-group channel creation and current database tests cover settings, archive/version conflicts and revocation. Native hidden-tab polling remains HUB-10.
  - [x] Existing private-group channel edits preserve their restriction for a delegated channel manager who belongs to that group; foreign private channels stay hidden, restriction removal requires group management and stale versions conflict (H2/PostgreSQL regression).
- [x] **HUB-07** Groups and membership: persistent groups, member management, private visibility, group/channel boundaries and isolation across workspaces.
  - Local workflow accepted24October: group-editor55 UI checks, actual membership creation and group-restricted channel save, and current H2/PostgreSQL archive/restore/stale/suspended/foreign-workspace tests pass. These are local identity/resource boundaries, not deployed multi-workspace acceptance.
  - [x] H2/PostgreSQL lifecycle checks prove archive/restore preserves membership and independent channel archives; stale writes cannot replace members; retained suspended members stay denied until reactivated with current credentials; removed moderators lose file metadata/removal and stale queue cursors. Forged workspace principals and unknown group/member bindings fail without changing membership.
  - [x] Packaged group-editor fixture workflow passes55 checks: create/archive/restore payloads and original conflict versions, retained inactive membership, discard/archive cancellation, private metadata clearing after denied/missing responses, error focus, labelled full-size controls, five-theme primary-action contrast and six-width layouts.
- [x] **HUB-08** Conversation and composer: real persisted text, bounded history with older-page UI, drafts, send/error/retry states and duplicate-send protection.
  - Local workflow accepted24October: real moderator/staff/client messages persist; workspace/support UI checks cover composer drafts, bounded history and error/retry. Current database tests bind retry keys to actor/channel/body/reply and prevent removed-message resurrection and foreign cursors.
  - [x] Conversation floor/before cursors and legacy message-history anchors are bound to their channel; the legacy endpoint also rejects zero/negative/nonexistent anchors. Validation precedes the unchanged-version shortcut, and valid soft-deleted message anchors remain usable (H2/PostgreSQL regressions).
- [x] **HUB-09** Message interactions: own-message edit/remove, moderation, replies/mentions/pins, permission checks and visible optimistic-conflict recovery.
  - Local workflow accepted24October: existing conversation UI checks and current database author/moderator/stale-version, reply/history/channel/pin/read-boundary tests pass. Broader simultaneous custom-role resource changes remain HUB-03/HUB-18.
- [ ] **HUB-10** Conversation updates: bounded foreground updates, unread/read positions, reconnects and revoked access; no hidden-tab polling or forbidden history replay.
- [ ] **HUB-11** Private attachments: trusted validation/storage/download authorisation, size/type limits, safe filenames, quarantine and no automatic public publishing.
  - [x] Archived-group retention cleanup is available only with current group-management, review and removal authority; ordinary conversations/downloads remain blocked, non-manager moderators cannot see retained files, and removal clears stored bytes without restoring the group. The explicit inactive queue identifies archived groups and passes41 packaged UI fixture checks over six widths/five appearances.
  - **16 October upload continuation:** new real-service tests cover malformed/path filenames, message ownership, five-file limits/retry, credentials revoked during byte reading, scan-plus-human-review release, private download headers, client note redaction and removal. Full H2/PostgreSQL suites now69/0/0/0. Scan-state transitions are explicit fixtures, not real scanner acceptance; full attachment/group/quota/concurrency/provider coverage remains open.
- [x] **HUB-12** Moderator upload queue/detail: review/approve/reject, metadata edits, restricted downloads and auditable removal without deleting unrelated public/client material.
  - Local workflow accepted24October: upload-review44 UI checks plus current database scan-lease/approval/revocation/group-metadata/cleanup regressions pass. Real scanner/provider acceptance remains HUB-11 and release work; no actual scanner is claimed.
  - **16 October upload continuation:** fixed support review during active scans and expired scan-result acceptance, with failing-then-passing regressions and stale/reclaimed/revoked/removal cases. UI disables review while scanning but keeps authorised withdrawal; explicit control labels and44 packaged browser fixture checks cover six widths/five appearances, retained conflict edits/version and private skip-link focus. Whole moderator/group/queue/scanner/browser acceptance remains open.
- [x] **HUB-13** Support inbox/detail: persisted enquiries, assignment, internal notes and customer-visible replies separated; restricted staff/customer data access.
  - Local workflow accepted24October: support UI48, real saved-unshared/explicitly-shared/client-response browser journey and current assignment/internal-note/client-isolation tests pass. Saved versus shared versus accepted email states are distinct; actual mailbox delivery remains MAIL-04/06.
  - [x] Public enquiry notification results are bound to current unexpired attempt tokens. Ordered callback regressions reject stale success/failure and expired completion; identical retries retain one receipt and quarantined files while changed source/body/files conflict. Actual disabled-mail HTTP checks retain the reference across retry and restore.
  - [x] Reply retry keys bind actor/request/kind/text; internal notes, private portal sharing and email acceptance stay distinct. Portal-only preferences block email, and expired/reclaimed delivery tokens reject late success/failure. Accepted receipts survive in-flight revocation while their responses require current access (real service/repository tests with mocked mail).
  - [x] Support UI fixture workflow passes48 packaged checks: saved/shared/accepted/unconfirmed states, explicit uncertain retries, portal-only controls, retained409 drafts/version, denied request/inbox redaction and draft removal, explicit labels, blocked edits during delayed reload, six widths/five appearances and no unexpected API/page errors.
- [x] **HUB-14** Support tracking: status/history, progress updates, customer references, permitted transitions and clear saved-versus-delivered states.
  - Local acceptance24October: current-version tracking, assignment, saved client progress/next step/scope, public history and explicit saved/shared/provider states pass database, actual-browser and restored-current/previous-candidate checks. Real email delivery remains MAIL-04/06.
  - [x] Tracking tests enforce eligible active support assignees, completion at100%, trimmed client next steps, bounded API input, stale-version rejection and no extra events or changes after failed writes. Staff mutations recheck current grants after workspace locking.
- [x] **HUB-15** Admin business content: add/edit/remove/archive and explicitly permitted publication through team endpoints; preserve real attribution and root owner protection.
  - Local workflow accepted24October: actual delegated admin image upload, draft, explicit-consent publication/unpublish, archive/restore and owner-private image/revision journeys pass31+38 browser checks. Current authorisation tests preserve owner separation and publication permission. Synthetic local publication is not approval to publish another client.
- [x] **HUB-16** Workspace/account customisation: safe branding, channel/group preferences, notification choices and profile settings; accessible responsive controls.
  - Local acceptance24October: workspace identity, actor-scoped profiles, notification/channel preferences, independent saves and denied/stale writes pass backend and protected UI suites. Real owner branding and moderator profile saves pass actual-session browser checks. Company mailbox setup remains separate.
  - [x] Settings recovery subset —16 October: personal/workspace revision and actor boundaries, protected owner naming, current private-group channel access and global/channel mention choice composition verified by integration tests;51 packaged browser checks cover five appearances/six widths, separate-form draft preservation, conflict/outage/reload cancellation, repeated save and staff UI. Fixed stale saved notice after reload failure and stuck loading on channel-panel close/reopen. Wider account/session/customisation/concurrency and complete HUB-16 acceptance remain open.
- [x] **HUB-17** Hub persistence/release: H2 and PostgreSQL migrations, concurrency/transaction failures, audit history, backup/restore and compatible rollback.
  - **23–24 October acceptance:** the specified local persistence/rollback gate is complete:256 H2 +256 actual PostgreSQL tests and53 populated real-HTTP recovery checks, including the current/retained candidate pair, encrypted identities, business records, media, audit/sequence/schema comparison and resumed authorised writes. Deployed/provider/device acceptance is tracked separately under RELEASE-02, PAY-08, MAIL and PERF-03.
  - [x] Populated local recovery subset, 19 October:45 tables/130 total rows/four schema checks/two populated sequences/one sanitised private JPEG match before resumed writes.41 subsequent checks cover owner/team encrypted TOTP and passwords, client identity, private image/DB attachment bytes, shared versus internal messages, financial/import/refund state, versioned edits, new messages/replies, logout and one-use recovery codes. A prior local frontend with the explicit backend transaction hotfix backported passes the same runtime checks. Original older JAR and production/older-schema rollback are not accepted by this local proof.
  - [x] V62 synthetic backup/restore matches 45 tables/116 rows, columns/indexes/constraints/RLS, two sequences and JPEG bytes, including pending/completed mail tokens and inline uploads. Fixed restore-default-grant leakage; both browser roles are denied private reads on the permissive-default target. Non-empty/tampered restores reject; matched backend boots and reclaims a legacy interrupted receipt without duplication. Older-writer/rollback and whole release acceptance remain open.
  - **16 October partial evidence:** full 63-test H2/PostgreSQL runs pass with actual database selection asserted; all 60 migrations apply. Hosted-role isolation checks cover 45 tables/two sequences and denied private reads. A stopped-writer synthetic backup restores with 45-table/104-row/schema/index/constraint/RLS/sequence/media equality; matched current jar boots and restored owner password/MFA/private media/logout work. Broader concurrency/failure/financial-state coverage and previous-version compatibility remain open.
- [ ] **HUB-18** Hub final QA: all roles and private routes, direct/negative API access, metadata, keyboard, mobile/tablet/desktop, uploads, support and session/recovery failures; zero applicable test failures.
  - [x] Owner read-transaction subset, 19 October:22 endpoint cases outside any enclosing test transaction pass on both databases for financial/history/event/invoice reads, groups, mentions, settings, delegated projects/revisions and upload queues. Actual restored owner HTTP reproduced the PostgreSQL SELECT FOR UPDATE/read-only defect;20 transaction boundaries now permit the existing authority lock. Permissions and lock order are preserved. Full design/device/provider/deployed QA remains separate.
- [ ] **MAIL-01** Real company domain/mailbox/provider and responsible administrators agreed; secure staff mailbox/alias setup completed.
  - **25 October partial evidence:** Lark domain enabled and founder mailbox send/receive tested. Hello inactive; support and eight further independent staff sign-ins remain unfinished. Hosted aliases do not prove independent team access. See [company email setup](COMPANY_EMAIL_SETUP_2_0.md).
- [ ] **MAIL-02** Sender verification and SPF/DKIM/DMARC configured through authorised provider/DNS access; real settings documented without secrets.
  - **25 October partial evidence:** authorised Lark ownership/SPF/MX/2048-bit DKIM and monitoring DMARC were configured; founder-to-Gmail headers passed, but first mail landed in Spam. Keep the existing separate Resend sender and its delivery acceptance distinct from mailbox-host DNS/access.
- [ ] **MAIL-03** Application sender/recipient/reply-to and trusted public URL configured; preserve existing enquiry transports and meaningful failure handling.
  - **25 October partial evidence:** production founder destination/reply address changed through the existing Render deployment; a real enquiry was saved and Resend accepted it, but final Lark receipt remained unconfirmed. Department destinations/overrides are local source only and must not be activated before their inbox/access checks.
- [ ] **MAIL-04** Private staff invitation delivery and support replies: templates, expiry, token safety, delivery status, safe retries and bounce/outage recovery.
- [ ] **MAIL-05** Real legal operator/contact/access/retention/deletion/support scope supplied and applied consistently across privacy, contact, support and hub information.
- [ ] **MAIL-06** Final authorised staging mailbox and delivery/reply/failure verification; production provider and privacy gates resolved before release.

## Client service and payments — 12 October 2026

James confirmed the hub is where staff handle requests, update progress and contact clients about their websites. It must support easy site payments and agreed ongoing payments. See [client operations brief](CLIENT_OPERATIONS_2_0.md). James approved Stripe, GBP, optional deposit/balance and explicitly agreed monthly support. Admin drafts, issued client requests, stored checkout attempts, client Checkout/portal/invoice controls and signed-event reconciliation are now connected in source. Refund/dispute/withdrawal/financial-history and provider/recovery/acceptance gates remain open; billing is disabled by default and no actual recurring charge was created. Historical12October counts are superseded by the current checkpoint. Current local workflow ticks carry their evidence; provider, scanner, operating-fact and broader release gates remain open.

- [x] **CLIENT-01** Separate client identity/invitation/login/recovery and private noindex client workspace; no staff-role selection or access to other clients.
  - Local identity gate accepted24October: refreshed79 client-entry/history checks include same-document replacement, stale responses, scrubbed-token Back/Forward and zero unowned-history blocker warnings. Current database identity/recovery/suspension/negative-access tests and actual client activation/login/restored-session journeys pass. Recipient roles remain server-owned; actual invitation delivery belongs to MAIL gates.
  **Current identity evidence:** late client logins cannot restore logout or replace a newer session; actual HTTP proves rotation and client-only API access, with owner/team access denied. Existing recovery/suspension/isolation service tests and51 client-recovery UI checks pass in the139-test candidate. **Superseded24October:** the fresh79-check client-entry batch verifies the replacement-fragment/history and route-owned request/input cleanup gate; the local parent is now checked. Provider/deployed acceptance remains separate.
- [x] **CLIENT-02** Client project/request detail: current progress, next step, agreed scope and readable history; internal notes/events remain private.
  - Local acceptance24October: V63 confirmed scope, progress/next step and public history pass both databases,38 actual-session browser checks and57 populated recovery/rollback checks. Private enquiry/internal notes stay excluded. Physical/provider/release gates remain separate.
- [ ] **CLIENT-03** Client-team conversation and notifications: portal replies, stored recipients, clear delivery/error/retry states, thread permissions and preferred-contact handling.
- [ ] **CLIENT-04** Full staff/client acceptance: assignment, enquiries/uploads, correspondence, session revocation, concurrency/idempotency, mobile/keyboard and recovery/provider failures; verified backup/restore.
  - [x] Client recovery subset —16October:51 packaged browser checks cover five appearances/six widths, clearing refused project detail/files/composer, preserving drafts for stale feed cursors while rechecking project access, billing/conversation expiry, cancelling late overviews, same-account submission-key recovery and different-account draft isolation. Corrected contact radio alignment/label targets. Server access/provider/concurrency/full client acceptance remain separate; parent CLIENT-04 remains open.
- [ ] **PAY-01** Confirm payment provider, currency/schedule and actual company/payment-account setup; use test/sandbox settings during development.
- [x] **PAY-02** Admin-reviewed quotes/invoices/payment requests and optional deposit/balance; server-owned money/currency/client IDs, permissions, immutable issued totals and audit history.
  - Local application contract accepted24October: billing UI31/client25, current money/authority/issued-total/idempotency/history integration tests and actual local request issuance in recovery fixtures pass. These are local payment-request operations, not Stripe settlement; PAY-01/PAY-08 remain open.
- [ ] **PAY-03** Client checkout for an agreed one-off payment; safe retry/idempotency, cancellation/required action/pending/error states and no raw-card storage.
  - [x] Local client billing UI subset (PAY-03–05), 19 October:25 final packaged checks cover independent one-off/monthly consent, locally intercepted secure handoffs, return without assumed settlement, disabled new checkout with retained management, trusted invoice/receipt links, server pending/paid state, wrong-bill response cleanup, expiry and four widths. No provider/card/payment request leaves the intercepted test boundary; actual sandbox/provider acceptance remains open.
- [ ] **PAY-04** Explicitly accepted recurring payments: clear price/interval/start/cancellation terms; activation/renewal/failure/cancellation state tracked separately from project progress.
- [ ] **PAY-05** Authenticated customer billing management: payment-method updates, subscriptions/cancellation and receipts, scoped to the verified client/provider customer.
- [x] **PAY-06** Signed webhook settlement: raw-body validation, replay bounds, duplicate/out-of-order handling and reconciliation. A checkout return URL never alone marks a bill paid.
  - Local application contract accepted24October: current signed-webhook raw-body/replay/duplicate/order/reconciliation regressions pass in both database configurations. These use controlled signed events; actual Stripe sandbox delivery remains PAY-08. Return URLs do not settle bills.
  - [x] Local signed-ingress subset — 19 October:17 real signature/filter/controller/database cases pass on both databases. Exact UTF-8 bytes, rotated signatures, duplicate receipt, old/future/duplicate timestamps, wrong secret/mode/API version, changed bytes, trailing JSON, ID/type/time bounds and body limit are exercised without provider network IO. Existing event/settlement tests cover immutable references, retry limits and late unpaid observations. Actual Stripe sandbox delivery and full billing acceptance remain open.
- [ ] **PAY-07** Billing operations: admin-only changes/refunds/financial settings, authorised support visibility, provider outage/retry handling, financial records and backup/migration/privacy facts.
  - [x] Local committed financial-recovery subset — 19 October:19 real database cases pass on H2/PostgreSQL, with explicit mocked Stripe IO. Confirmation commits before submission; timeouts retain operations; provider success survives ledger failure; malformed/mismatched candidate results cannot replace bindings; customer-less legacy refunds require a fresh invoice proof; invalid allocation pages roll back all rows/cursors; competing shared-charge confirmations yield one winner. The31-check staff billing UI journey separately verifies retries, acknowledgements, recovery and activity release. Populated backup/rollback, client checkout UI and external provider/policy acceptance remain open.
- [ ] **PAY-08** Full authorised sandbox billing acceptance: successful/failed/pending/duplicated one-off payments, renewal/action/failure/cancellation, permissions, receipts/webhooks and mobile checkout. No real customer charge as a test.

Client source continuation, 12 October: separate private client activation/login/project/conversation/password routes, request bindings, admin recovery/suspension, explicit staff sharing and own client replies are implemented in source (V11/V12). No CLIENT item is accepted yet; invitations require private admin delivery, recovery is admin-assisted, older-history/notification UX and all negative/runtime/database/browser checks remain open. Billing drafts remain private/unissued and no checkout/subscription is connected. See CLIENT_OPERATIONS_2_0.md. No tests ran, following implementation-first order.

Billing source continuation: unpaid-request withdrawal now reserves the request before expiring checkout, retains pending/withdrawn state and verifies provider outcomes. Pending signed events have a private admin queue/retry and optional bounded background recovery, disabled by default. Refund/dispute handling, historical financial operations, queue pagination/notifications and complete database/provider/browser/security acceptance remain open. This advances PAY-07 source coverage; it does not accept that item or change the 169/102/67 named-checklist counts.

Queue paging source continuation: the admin event queue now supports 50-row cursor pages across all pending records, ready/waiting/review filters and full current-mode counts. Completed rows remain valid page anchors; frontend reads are abortable and navigation history is bounded. V16/index and API/UI changes are coordinated. Final TSX syntax inspection and whitespace check passed; no Java/TypeScript build, migration, test, provider/job action or release acceptance occurred. Financial history/notifications and the remaining team/design/client/provider gates stay open.

Private-group source continuation: admin group/member/archive/restore management and optional channel group restrictions now exist in source. Group membership adds to role eligibility, including archived/history/message action boundaries; omitted group fields preserve restrictions and failed async group loading blocks visibility saves. V17/V18 and backup scope are coordinated. HUB-07 source coverage advances, but final cross-workspace/role/concurrency/revocation/archive/legacy/browser/database acceptance is still missing, so it remains open. Custom roles, messaging/unread/preferences, financial operations and selected-design/release gates remain outstanding.

Conversation source continuation: stable-key message retries, immutable intent fingerprints, same-channel replies and bounded live quote previews are connected to structured per-channel drafts and navigation/sign-out safeguards. Existing role/group checks remain authoritative. V19 extends the protected message table; no migration/test/build/runtime/provider action occurred. Older-history delta refresh, reauth retention, unread/pins/mentions, custom roles/preferences and full acceptance remain open, so HUB-08/09 stay unticked.

Pinned-message source continuation: a dedicated moderation permission, version/audit-checked pin toggles and a scoped live-pin panel are implemented, with open/visible-only refresh and deleted-message exclusion. V20 extends the existing protected message table. No build/test/migration/runtime/provider action occurred. HUB-09 still needs unread/mentions and all applicable role/concurrency/database/accessibility acceptance; source coverage is not a checkbox pass.

Unread source continuation: private persistent owner/team read positions, scoped counts and explicit channel acknowledgement are now connected to sidebar badges/visible-only refresh. V21/V22 and backup scope are coordinated. No build/test/migration/runtime/provider action occurred. HUB-10 still requires actual negative/multi-device/arrival/visibility/DB/browser acceptance; delta/history/mentions/reauth/custom-role/preferences and full release work remain open.

Conversation refresh source continuation: current access checks precede unchanged-version responses, and changed snapshots refresh the loaded<=500 range including older edits/deletions/reply previews. V23 and UI mutation/expansion race guards are connected. No build/test/migration/runtime/provider action occurred. Full history paging/profile invalidation/mentions/reauth/customisation and security/concurrency/browser/DB/performance gates remain open; HUB-08/09/10 stay unticked.

Long-history source continuation: earlier/newer/latest50-row paging now reaches history beyond the previous500-row UI bound, with same-channel retained cursors, draft preservation and fixed historical windows. No additional migration beyond V23 or build/test/runtime/provider action occurred. Actual long-history/security/concurrency/accessibility/DB/performance acceptance remains missing, so conversation gates are still open.

Reauthentication source continuation: unsent team composer text/reply IDs/retry keys now survive expiry in account-scoped tab memory, restored only after current workspace identity and channel access are verified. Old history/credentials/reply excerpts are not restored; different accounts, forbidden channels and deliberate sign-out discard retained content. Existing owner MFA flow is reused without elevating team roles. No build/test/login/provider action occurred, so reauth/security/accessibility acceptance remains open.

Mention source continuation: explicit eligible-person selection, atomic notifications, recipient-bound stable retries and a role/group/recipient-scoped paged inbox are now connected. V24/V25 and backup scope are coordinated. No build/test/migration/runtime/provider action occurred. Effective custom roles/preferences, all notification/access/concurrency/legacy/browser/database acceptance and broader finance/design/release work remain open; HUB-09/10 stay unticked.

### Bounded custom roles - source only

Added V26/V27 role profiles and account assignments, MANAGE_ROLES, retained/versioned workspace profiles, private admin create/edit/archive/restore/assignment controls and backup inventory. Profiles are subsets of an immutable trusted base role, require channel reading and validate related support/upload/publication/member permissions. Explicit assignment works on invited accounts before activation. A changed base role clears an incompatible profile; suspension/recovery preserves the existing restriction. Archived/invalid profiles fail closed, and profile changes/assignments increment affected credential versions. The protected owner remains independent; administrators cannot edit their own profile/assignment or grant capabilities beyond their current effective permissions.

Effective permissions now drive live team access, password/MFA/session validation, session responses, mention recipients and support-assignee eligibility. Admin writes recheck live access after workspace locking. UI includes unsaved-change/busy guards, role-matched assignment choices, archived-state warnings and retained form input on errors. No dependency, real account, database migration, login, provider or email operation ran.

Only TSX syntax inspection and whitespace review were performed; Java/TypeScript compilation, H2/PostgreSQL migration/RLS/restore, negative escalation/role/group/audience/session tests, concurrency and browser/mobile/keyboard acceptance remain deferred until implementation finishes. No checklist acceptance changed: 169 named items,102 checked,67 open. Workspace/profile customisation, notification preferences, attachment hardening, remaining client/financial/email/design implementation and full release verification remain open.

### Workspace and account preferences - source only

V28/V29 add versioned workspace names/descriptions and actor-scoped personal preferences with owner/member foreign keys, PostgreSQL RLS/browser-role revocations and backup inclusion. Workspace branding requires current MANAGE_SETTINGS; individual preferences are bound to the authenticated account. Writes lock the workspace and recheck current access; optimistic versions reject concurrent/lost-response overwrites. Custom roles and protected owner boundaries remain unchanged.

The integrated settings screen saves display name, compact message spacing, unread-count visibility and future in-app mention alerts. Name changes refresh conversation versions so cached author/reply labels can update. Hiding counts does not advance read positions. Opting out suppresses new mention rows but retains existing inbox items; re-enabling does not recreate suppressed alerts. Selected-recipient text explains this behaviour. No email, sound, push permission or external delivery is triggered. Branding is plain private-team text and does not change public Crystal Powers content. Settings have dirty/busy guards, retained input, separate form saves, explicit reload, focus entry/return and responsive controls; opening settings suspends conversation polling.

Three changed TSX files parsed with zero syntax diagnostics and git diff --check passed. These are source checks only: no Java/TypeScript build, H2/PostgreSQL migration, database/account/login/provider/notification operation or runtime test ran. Final cross-account/role/workspace/privacy, simultaneous preferences/mentions/retries, author invalidation, keyboard/mobile/theme/browser and backup/RLS checks remain outstanding. Channel-specific preferences and further customisation, attachments, client history, financial operations, email and Liquid Light whole-site acceptance also remain open. No HUB-16 or release checkbox changed;169 named/102 checked/67 open.

### Channel preferences and upload headers - source only

V30/V31 add actor-scoped/versioned channel favourites, unread-count visibility and future in-app mention preferences, with current workspace/role/audience/group/archived-channel checks on reads and writes. Settings responses omit preferences for inaccessible channels. Global opt-outs take precedence, existing alerts/read positions remain unchanged, and favourites sort within categories. The channel editor loads only when opened, has abort/stale-read guards, retained input, conflict/reload states and dirty/busy navigation protection. Backup inventory and PostgreSQL browser-role revocations include the table.

Reference uploads now allow JPEG/PNG/GIF/WebP and MP4/WebM/ftyp-based MOV only; supplied MIME, filename extension and bounded format headers must agree. Names reject paths/control characters/colons and over255 code points. Reads are bounded to256KiB; image metadata/canvas dimensions are limited to12000 pixels per side and80 megapixels without decoding pixel buffers. Total15MiB/five-file limits remain, with overflow-safe size accumulation. The enquiry file chooser, local type validation and guidance match this allowlist. SVG/HTML, unknown/empty MIME and legacy/non-ftyp MOV need export to a supported format. Existing private storage, moderation and attachment download boundaries remain.

These checks are neither antivirus scanning nor complete image/video decoding; accepted headers do not prove an entire file is safe or playable. Scanner/quarantine release handling, retention/removal/storage scaling and malicious/polyglot/animation/parser cases remain open. Existing upload fixtures may need genuine valid media during final meaningful tests; do not weaken the checks to retain fake headers. No Java/TypeScript build, test, migration, file upload, account/provider/email or runtime mutation ran. Four TSX files parsed with zero diagnostics and whitespace review passed. Negative/tenant/role/prefs/concurrency/idempotency, SQL/RLS/restore and browser/mobile/keyboard/full media acceptance remain deferred. No audit item is accepted from these source changes.

References checked for format/security rules: [WebP container specification](https://developers.google.com/speed/webp/docs/riff_container), [PNG specification](https://www.w3.org/TR/png/), [WebM container guidelines](https://www.webmproject.org/docs/container/) and [OWASP file uploads](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html). Apple QuickTime documentation redirected to a JavaScript page without accessible format detail; MOV branding/compatibility still needs explicit fixture/spec acceptance.

### Malware scan and quarantine - source only

V32 adds UNSCANNED/SCANNING/CLEAN/INFECTED/ERROR, scan timestamps and a private lease token. Every existing attachment starts UNSCANNED, including historically approved files; no historical approval is treated as a malware scan. New uploads remain quarantined. All staff download paths now require CLEAN, support/client downloads additionally require APPROVED, and client lists hide files without both states. Moderator approval cannot override quarantine. The moderator UI shows scan state/time, private review downloads only after CLEAN, manual scan/retry and infected/error/interruption handling.

Manual scans require current REVIEW_UPLOADS, expected attachment versions, current workspace isolation and bounded actor rate limits. A committed five-minute lease reserves quarantine before the scanner call; completion requires matching lease/token/version and current permissions. CLEAN still needs human approval; INFECTED is rejected, unknown/unavailable/malformed/timeout outcomes are ERROR and cannot release files. Concurrent review invalidates a stale completion; interrupted jobs remain quarantined and can be retried after lease expiry. Legacy filename/type/size/header/dimension checks are re-applied before scanning. No scan result can be supplied by the browser.

UploadScanner uses official clamd zINSTREAM chunks and exact bounded replies, with at most two concurrent connections,3-second connect/15-second read/20-second overall socket-close deadlines,15MiB content and4KiB reply caps. Only literal loopback/private/IPv6-ULA endpoints are accepted; TCP is unencrypted and must remain inside a trusted private boundary. Settings default disabled/blank and no scanner was installed, provisioned or contacted. UPLOAD_SCAN_ENABLED/HOST/PORT are documented as blank examples. A real maintained daemon/signature-update arrangement and private network endpoint must be configured and accepted; configuration is not scanner health or current signatures.

Enquiry notification emails now omit upload bytes, including on retries, so quarantine cannot be bypassed through email attachments. Files remain available through the private request/moderation workflow after release checks. The original low-level email transport retains its existing trusted attachments contract; current public intake always sends a text/HTML enquiry summary without files. Public receipt wording says files are saved for review.

Two changed TSX files parsed with zero syntax diagnostics and whitespace checks passed. No Java/TypeScript build, test, migration, upload/download, scanner/provider/account/email/runtime operation ran. Required final checks include true clean/infected/EICAR fixtures, malformed/truncated/overflow/slow/non-reading scanner replies, disabled/outdated daemon, legacy invalid media, disconnected/restart/lease/concurrent-review/role-revocation paths, all staff/client/direct endpoints, H2/PostgreSQL/RLS/restore and browser/mobile/accessibility. Scanner deployment, signature freshness, false-positive/removal/retention policy, moderation paging and full acceptance remain open. No checklist item was accepted.

Protocol reference: [official ClamD protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html). The earlier obsolete ClamAV guide URL failed; the official current manual was found and used. [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) supports layered checks and antivirus/sandbox handling; a CLEAN response is not an absolute file-safety guarantee.

### Upload queue paging and stored-content removal - source only

The moderator UI now uses an additive /api/team/uploads/queue endpoint with50-file keyset pages, retained same-workspace UUID anchors, first/previous/next controls, bounded100-cursor navigation memory and full workspace state totals. Approved/rejected/removed anchors remain valid after state changes so paging can continue. The legacy list contract is retained. Requests are abortable and generation-guarded; state/page/reload changes ask before discarding review/removal drafts. Successful mutations refresh the queue and counts, and counts are explicitly labelled as the last refresh snapshot. Loading/failure/empty pages and focus are handled without claiming a live-count guarantee.

V33 adds removed_at and a queue index. A versioned removal action requires both REVIEW_UPLOADS and EDIT_UPLOADS, an explicit internal reason and UI confirmation. It clears the live attachment byte column, rejects further reviews/downloads/scans, invalidates scanner leases, preserves filename/type/original-size/scan/request metadata and records a private audit event. An in-flight scanner completion cannot restore a removed file. Removed records have a dedicated queue view and cannot be restored into content; the original enquiry and other public/client media are untouched. Existing downloads, database history and backups are not erased by this live-row action. No automatic retention schedule or legally complete deletion claim is introduced.

Support metadata shows removed state, private download links are suppressed and client file views exclude removed content. Repository byte retrieval, scan reservation/completion and review compare-and-set all reject removed rows; these are server-side checks independent of UI visibility. Schema extension needs no new backup table; the existing support_attachment dump includes the new columns/index automatically.

Three changed TSX files parsed with zero syntax diagnostics; whitespace review passed. No Java/TypeScript build, migration, test, real removal, upload/download, scanner/provider/account/runtime mutation ran. Final gates include >100-file queues, state/anchor/timestamp/UUID boundaries, cross-workspace/role/custom profiles, cursor tampering and restart, lost-response/stale-version/concurrent scan/review/removal, actual byte clearing and audit rollback, backups/RLS and keyboard/mobile/browser/error recovery. Retention/legal/scanner/provider configuration and overall release acceptance remain outstanding. HUB-11/12/17/18 and release checks remain unticked.

### Client conversation and history paging - source only

Client conversation/history now use independent50-row keyset pages with canonical request-scoped cursors, newest/older/newer navigation, bounded100-cursor memory, refresh/retry/empty/error states, abort and generation guards, and focus after navigation. Conversation ordering includes direction as a tie-breaker across staff and client tables; row keys also include direction. Only explicitly shared CLIENT staff messages and request replies enter the union. History only contains customer_visible events. Cursor anchors must currently belong to the authorised request and visible collection; private/internal/other-request cursors are rejected after the same live account/request check as detail access.

The client app uses an additive overview endpoint containing project progress and approved, clean, unremoved file metadata; it no longer downloads both legacy100-row collections on every progress refresh. The old detail contract remains for compatibility. History loads only when expanded; conversation/history navigation leaves the unsent composer intact and does not automatically poll hidden views. A successful send requests the latest conversation, whereas ordinary refresh preserves the selected historical page. Expired-feed responses clear that feed and keep the workspace's unsent input/explicit return-to-sign-in flow.

V34 adds conversation/reply/customer-history indexes. No migration/build/test/database/account/message/provider operation ran. Two TSX syntax inspections and whitespace checks passed. Full large-history/timestamp/UUID/direction ties, malformed/hidden/cross-request/client/workspace cursors, suspension/recovery/concurrency, sharing/retries/new arrivals, database/RLS/restore and browser/keyboard/mobile/network acceptance remain deferred. Staff conversation/history and the client project's100-item list still need full paging; client draft recovery/contact preferences, financial operations, real email/scanner configuration and selected-design/release acceptance remain open. No CLIENT or release checkbox was accepted.

### Client message recovery after expiry - source only

ClientEntry now owns tab-memory drafts scoped to the client/workspace identity, preserving body text and stable uncertain-send submission keys across explicit return to sign-in. ClientWorkspace confirms a fresh session before using memory and checks each recovered project through the current overview endpoint; that endpoint now returns actual client/workspace IDs for a second identity check. A different confirmed account clears old memory. A forbidden/missing project drops that project's retained draft when checked; other stored project IDs are not treated as authorised merely because they remain in memory. The currently selected project is checked on recovery even if it is outside the legacy100-item sidebar list.

Project switching now preserves separate unsent messages instead of forcing discard. Input updates memory synchronously, sends persist the retry key before the request, and confirmed success clears only matching intent. The server's existing request/account-bound idempotency path can recognise a retry after reauthentication; no new server draft table or browser storage was introduced. Up to50 nonblank drafts are retained; a51st is rejected with a clear message rather than silently deleting an existing draft. Per-project discard, explicit all-draft discard at sign-in and sign-out/password-change cleanup are available. Passwords, old message/history bodies, uploads, payment acceptance and credentials are not copied into draft memory.

Parent navigation protection covers the sign-in/identity-loading gap. Identity bootstrap is abort/generation guarded, child workspaces are keyed to identity and late login reads cannot overwrite a newer session. Failed identity checks have an explicit retry; expired/changed identities disable sending until confirmed again. Project response failures preserve other drafts and stable retries; input is not automatically sent after recovery. Leaving/refreshing destroys tab-memory messages after the existing navigation warning. Account recovery does not recall data previously downloaded by an authorised browser.

Three changed TS/TSX files parsed with zero syntax diagnostics and whitespace checks passed. No build, test, Java compilation, real login/password/account/message/migration/provider action occurred. Final gates remain same/different client/workspace, project revocation and renewed access, >100 projects/sidebar paging, missing projects,50-draft limit, uncertain/duplicate/successful sends, late/stale/StrictMode/abort callbacks, sign-out/password/discard/refresh/back, keyboard/mobile and backend concurrency/idempotency. Staff/client list/history paging, contact preferences, financial operations, provider/policy configuration, Liquid Light and full release acceptance remain open. No CLIENT/release checkbox changed.

### Client project-list paging - source only

The client sidebar now uses an additive /api/client/projects/page endpoint with50-project keyset pages, account/workspace-bound canonical cursor lookup, identity metadata, current linked-project totals and bounded100-cursor older/newer/newest navigation. Creation time and UUID determine order so sending messages or changing progress does not move an existing row across pages. Newly linked historical projects may require returning to newer pages; this is not a frozen historical membership snapshot. The legacy100-row list remains for contract compatibility, while the app can reach beyond it.

Sidebar paging has separate loading state, abort/generation guards and guarded identity checks before committing results. It does not change the open project or unsent drafts; a clear note identifies an open project outside the current sidebar page. Recovery checks that project directly even when outside the list. Switching/opening and sending still require current identity proof. Totals are explicitly last-refresh values, not a promise of live counts. A late bootstrap state update was moved behind its lifecycle/generation guard.

Source inspection found the existing V7 support_request_workspace_time index already covers workspace/creation-time/UUID. The duplicate newly proposed V35 migration was removed before any migration execution; no new schema change is needed for this continuation. ClientWorkspace syntax inspection and whitespace checks pass. No build, tests, migration, real project/client/account/message/provider/runtime operation ran. Final >100-project/tied-time/UUID/new-binding/cursor/tenant/suspension/recovery/navigation/draft/network/focus/browser/mobile/database/query-plan acceptance remains unproven. Staff request conversation/history/replies paging, contact preferences, financial/provider/email/design work and overall release acceptance remain open. No checklist item was checked.

### Staff request and update paging - source only

Staff conversations/internal notes, client replies and progress/audit history now use separate50-entry keyset collections. Each update endpoint checks current READ_SUPPORT and the same workspace/request before accepting a collection-scoped cursor. Message, reply and event anchors cannot be borrowed from another request or collection. The new staff overview excludes all three legacy100-entry payloads; old detail/list contracts remain unchanged. Existing V7 message/event indexes and V34 client-reply indexing cover these query shapes, so no duplicate migration was introduced.

SupportUpdateFeed provides independent newer/older/latest/refresh, bounded100-cursor navigation memory, abort/stale-read guards, focus after page movement, and clear loading/empty/failure states. Progress history loads only when expanded. Page refreshes after request mutations preserve the selected historical page. Staff message rendering retains original email delivery status, deliberate portal sharing and separate email actions on the original message IDs; paging does not send/share anything or alter permission checks. Failed feeds clear cached rows while leaving request forms mounted; reauthentication requires an explicit action with an unsaved-input warning.

The previously500-limited request sidebar is also replaced by50-request pages with an additive requests/page endpoint, proper51-row lookahead, same-workspace anchors and creation-time ordering. Newer/older/newest/refresh controls preserve the open RequestDetail and unsaved input, with an outside-page note. Requests no longer accumulate indefinitely in React state. State-filter changes still use existing discard guards. Read/save failure handlers leave request input for copying before explicit sign-in; complete staff-form recovery across global session expiry remains separate outstanding work.

Two TSX files parsed with zero syntax diagnostics and whitespace checks passed. No Java/TypeScript build, tests, migration, real request/message/email/share/provider/account operation ran. Final >100-updates/>500-requests, tied timestamps/UUIDs, mixed note/client/event/reply cursors, filters and changing states, custom roles/workspace/revocation, stale/aborted/network/mutation results, unsaved-input/reauth/share/mail failures, database/RLS/restore/query plans and keyboard/mobile/browser acceptance remain unproven. Full staff draft recovery, client contact preferences, financial/provider/email/design work and overall release verification remain open. No audit checkbox changed.

### Staff reply and progress recovery - source only

The existing owner/team tab-memory container now includes selected request IDs, unsent CLIENT/INTERNAL reply text and retry keys, plus edited progress/next-step/assignee values and their original expected version. It retains at most50 request drafts without silently dropping another draft. It does not store retrieved briefs/history/client email addresses, account credentials, upload bytes, billing acceptance or client-access form input. No browser storage or server draft table is introduced.

Global identity proof clears request memory on another actor and drops message/progress fields when their corresponding capabilities are absent. Each request recovery also requires a current overview whose returned actor scope matches the proven workspace identity, current same-workspace request access and current REPLY_SUPPORT/UPDATE_TRACKING grants. Missing/forbidden requests discard their retained draft. Staff request switching and workspace-panel navigation preserve eligible messages/progress; nonrecoverable billing/access fields keep their discard guards. Parent draft presence/navigation protection and explicit sign-out cleanup cover request drafts as well as channel composers, including the sign-in gap.

Message changes update memory synchronously and bind the stable key to kind/trimmed body. The key is stored before a save and retained for uncertain outcomes; confirmed saves clear it. Recovered messages are not automatically saved, emailed or shared. Progress recovery keeps the original version, warns when newer progress exists and never silently rebases a stale update. Explicit reload/discard refreshes progress while preserving an unrelated message draft. Per-message/progress discard controls and retained-draft sidebar badges are added. Identity failure disables writes; a later actor change in workspace responses forces reauthentication instead of repurposing old memory.

Five TS/TSX source files parsed with zero diagnostics and whitespace review passed. No Java/TypeScript build, tests, migration, real auth/request/message/progress/share/mail/payment/account operation ran. Final owner/team/same/different actor, role/profile/workspace/resource revocation, concurrent/stale/lost-response progress, duplicate reply retries,50-draft cap, StrictMode/late/abort/global-expiry/save callbacks, sign-out/discard/back/refresh, SQL and browser/mobile/keyboard acceptance remains open. Nonrecoverable billing/access/settings inputs still need final UX assessment; financial operations, company email/scanner/policy configuration, selected Liquid Light whole-site work and release verification remain outstanding. No checklist acceptance changed.

### Billing observation history - source only

V35/V36 add private append-only billing_observation rows, minimal category/provider-reference/status/associated-GBP-amount/detail fields, identity ordering, RLS/browser-role revocations and sequence protection. Backup inventory now includes the table and discovers both team-message and billing-observation sequences. Current-issued request, explicit client acceptance, verified checkout state, subscription status/period/cancellation flags, verified invoices and unpaid withdrawal append observations inside the existing locked billing transactions. Consecutive identical observations for the same bill/category/reference are skipped; a status that returns after an intervening change is retained. Recorded order uses identity values rather than assuming transaction timestamps are monotonic.

Specific subscription invoice events now retrieve and validate their own invoice ID/customer/subscription/currency/integer amounts in addition to refreshing the current subscription. Latest-invoice refresh also records that invoice. This preserves earlier renewal invoices instead of only overwriting latest_invoice. Current GBP invoice totals/amount_paid are described as provider invoice facts; paid status may involve credits/outside payments and is not asserted to be a separate Stripe cash transaction. A historical invoice observation does not alter the current subscription's latest-invoice pointer or authorise a plan/price change. Provider ID mismatch and unreadable integer amounts fail closed.

Issued bills have an expandable50-observation staff history with mode separation, current READ_SUPPORT/workspace/request/bill checks and bill/mode-bound exact numeric cursors. UI navigation is bounded, open-only, abort/generation guarded and has loading/empty/error/focus controls. Earlier activity is not fabricated or backfilled on a read. The UI explicitly forbids summing observations as revenue; full cash/refund/dispute/accounting-ledger/export and client receipt-history operations remain separate open work.

Two TSX files parsed with zero diagnostics and whitespace review passed. No Java/TypeScript build, test, migration/sequence/backup, provider request, invoice/payment/subscription/account operation ran. Final concurrency/dedup/A-B-A/lost/out-of-order observations, early invoice/session races, wrong ID/customer/subscription/currency/mode/amount/cursor/role/workspace, snapshot atomicity, sequence/RLS/restore and browser/mobile/keyboard/performance acceptance remain outstanding. The real Stripe sandbox, billing/tax/legal policy and provider configuration are still needed. No PAY/release checkbox changed.

Primary references refreshed: [Stripe invoice fields](https://docs.stripe.com/api/invoices/object) and [Stripe webhook handling](https://docs.stripe.com/webhooks). No raw provider payload, card or customer-address data is stored in these history rows.

### Provider payment/refund/dispute records - source only

V37/V38 add minimal provider payment records (requested/received/captured/refunded pence, current charge/status/dispute flag), separate bill allocation links and refund/dispute records, with PostgreSQL RLS/browser-role revocations and backup inclusion. A PaymentIntent is stored once even when future invoice allocations link it more than once. Provider references/status/money fields are selected individually; client_secret, raw card data and raw provider payloads are not retained.

Verified one-off checkout reconciliation now follows its actual PaymentIntent and latest Charge, checks mode/customer/currency/IDs/agreed amount and integral nonnegative money, and persists a checkout allocation. Signed refund/dispute events retrieve current provider resources and prove their Charge/PaymentIntent/customer relationship before saving adjustments and refreshing the payment snapshot. Refund objects have no livemode field; the verified Charge/key/environment supplies that boundary. Unknown payments for a managed customer remain pending financial review/retry rather than being acknowledged as unrelated. Truly unmanaged resources are ignored. This does not create refunds or submit dispute evidence.

Issued bills have independent50-record payments/adjustments views, bill/request/workspace/current READ_SUPPORT/mode-bound cursors, bounded navigation, open-only reads and abort/stale/focus/error controls. Gross payment facts, refund states, dispute flags and observation history stay distinct. The model includes allocation references, but monthly invoice-payment import, shared-allocation/multiple-charge handling, pending-import continuation, refund creation/reconciliation controls, client receipt/export and fee/payout/bookkeeping reconciliation remain unfinished. No complete ledger or revenue-total claim is made from this stage.

A source inspection found the previous HttpRequest timeout did not by itself cover consuming an InputStream body after headers. StripeGateway now adds a shared daemon deadline that closes active response bodies within the remaining20-second request window, retains the1MiB cap, removes cancelled timers and closes active bodies on shutdown. Timeout outcomes remain unconfirmed and retain existing idempotency/reconciliation rules. Actual stall/slow-header/slow-body/shutdown/resource tests are deferred.

Two TSX syntax inspections and whitespace checks pass. No build/test/migration/provider/payment/refund/dispute/account/runtime operation ran. Final wrong-ID/customer/currency/mode/amount/state/cursor/role, early/missing/shared payment links, repeated/out-of-order adjustments, concurrency/global payment locking, allocation import, backup/RLS/restore, HTTP deadlines and browser/mobile/keyboard acceptance remain open. No PAY/release checkbox changed.

Primary references: [Stripe PaymentIntent](https://docs.stripe.com/api/payment_intents/object), [Charge](https://docs.stripe.com/api/charges/object), [Refund](https://docs.stripe.com/api/refunds/object), [Dispute](https://docs.stripe.com/api/disputes/object), [InvoicePayment](https://docs.stripe.com/api/invoice-payment/object) and [JDK InputStream response handling](https://docs.oracle.com/en/java/javase/17/docs/api/java.net.http/java/net/http/HttpResponse.BodyHandlers.html). Real Stripe sandbox/provider/business-policy acceptance remains required.

### Monthly invoice allocation reconciliation - source only

V39/V40 add durable invoice reconciliation jobs, per-invoice allocation facts and global PaymentIntent mutex rows, with RLS/browser-role revocations and backup inventory. A verified monthly invoice observation enqueues/resets a job only when relevant invoice state/amount facts change. Jobs retain a provider cursor, nonce lease, version and PENDING/RUNNING/DONE/ERROR state. A batch reads at most two provider allocations; cursor/state commit with the allocation/payment writes. Interrupted leases can resume after five minutes, and explicit admin restart begins a fresh scan. No partial page is marked complete, and the app does not infer full financial completeness from invoice paid status.

The orchestrator commits the lease before provider reads, verifies invoice ID/customer/subscription/currency, then validates current request/workspace/mode/MANAGE_BILLING and lease/version before and after importing. Allocation IDs, invoice/mode/currency/status, nonnegative integer/null paid amounts and payment references are checked. PaymentIntent allocations use verified global cash records; payment_record allocations remain distinct recorded-payment facts. The official Stripe SDK also documents direct-charge allocations; those are preserved after charge ownership/capture checks instead of being mislabelled as PaymentIntents. Legacy charge adjustment/refund association and customerless legacy charge cases still require further completion/review.

Global payment writes now lock a mutex before retrieving current PaymentIntent/Charge values, serialising shared-payment observations across bills. First-row insert races may fail one transaction and require retry rather than silently overwrite another result. Allocation records retain amounts applied to each invoice; gross shared payment captures must not be added repeatedly as per-invoice revenue. Allocation/job read cursors are bill-bound, and lease tokens/cursors are excluded from the public job view.

Issued monthly requests have a paged import-status/allocation panel, bounded navigation, open-only abort/stale reads, incomplete/error/lease notices and explicit admin continue/restart controls. These are read/reconciliation actions and do not create a charge, refund or dispute response. Custom role validation now requires READ_SUPPORT alongside billing/client management, avoiding grants whose required screens/actions would be unreachable.

Two changed TSX files parsed with zero syntax diagnostics and whitespace checks passed. No Java/TypeScript build, tests, migration/provider/job/account/payment operation ran. Final multi-page/new/changed/canceled/null/external/direct-charge/shared allocations, stale/reset/expired leases, actor revocation, initial mutex races/global locking/deadlocks, partial rollback, currency/ownership/cursor boundaries, SQL/RLS/restore and UI/focus/network/browser/device acceptance remain open. Automatic invoice-job processing/recovery, allocation mutation/legacy charge coverage, admin refund controls, client receipts/exports and real financial-policy/provider/whole-site/release acceptance remain unfinished. No PAY/release item is accepted.

Primary specification: [Stripe InvoicePayment API](https://docs.stripe.com/api/invoice-payment/object) and [Stripe's generated InvoicePayments schema](https://raw.githubusercontent.com/stripe/stripe-node/master/src/resources/InvoicePayments.ts). An expanded documentation URL failed; the official generated schema confirmed charge/payment_intent/payment_record types. Recorded-payment IDs are treated as bounded opaque references rather than an invented prefix.

### Automatic invoice recovery - source only

V41 adds per-job failure counts, next retry time, last-failure timestamp and a due-work index. An optional BILLING_INVOICE_RECOVERY_ENABLED worker defaults false and processes at most two current-mode jobs per pass, with a60-second fixed delay after completion. Each job still imports at most two allocation records per batch. Transient errors receive60-second to1-hour backoff; ten consecutive failures pause automatic retries for review. Successful batches clear consecutive failures. Explicit authenticated admin continuation/restart remain separate controls, and restart or a genuinely changed invoice snapshot resets the failure gate.

Internal system begin/finish methods do not mint owner/team identities and are not exposed by HTTP routes. They require connected Stripe settings, a current-mode issued/accepted monthly bill with its stored subscription/customer, matching request/client workspace and the same lease/version/invoice-resource proofs as manual import. Read-only reconciliation can continue for an existing subscription while new checkout is paused or a client account is suspended; it cannot create payments/refunds or edit agreed prices. Manual operations still require current user roles before and after import.

The orchestrator commits leases before provider reads, commits each page's ledger/allocation/cursor updates atomically and rechecks ownership before completion. A failed start is also version-guarded and backed off, so invalid rows do not continuously monopolise the first due slots. Concurrent manual/automatic runs and expired/reset leases fail closed; a stale failure cannot overwrite a newer job. Allocation upserts now require unchanged invoice/kind/reference bindings, preventing a reused allocation ID from silently rebinding old cash links.

The invoice panel exposes failure counts, next retry time and automatic-review pauses without exposing lease tokens or implying a configured worker is running. InvoiceAllocations TSX syntax and whitespace review pass. No Java/TypeScript build, tests, migration, worker/provider/job/account/payment/refund operation ran. Final lease/start-failure/due-order/backoff/cap/reset/overlap/restart, paused checkout/suspended client, mode/workspace/currency/ownership, shared-payment locking/rollback, malformed or changed allocation bindings, SQL/backup/restore and UI/browser/device acceptance remain open. Long-batch/provider latency and shared scheduling with event recovery need performance verification. Legacy charge/refund association, admin refund execution/recovery, client financial receipts/exports, policy/provider/email/design and final release gates remain unfinished. No PAY/release acceptance item changed.


Legacy charge checkpoint: V42 and shared-lock adjustment re-fetch are implemented in source only. See the legacy charge association checkpoint in CRYSTAL_POWERS_2_0_PROGRESS.md for exact scope and deferred verification. Full tests remain deferred; refund controls, client receipts/exports and release gates remain open.

## Group/channel/history acceptance continuation — 16 October 2026

Fetched origin and confirmed HEAD and the laptop completion branch both remain `0bba0da` (0 ahead/0 behind). Existing PC changes were preserved. Three failing regressions exposed delegated private-channel editing, unbound conversation-floor cursors and archived-group byte cleanup. All three are fixed and pass in the complete78-test H2 and actual PostgreSQL suites, with zero failures/errors/skips. Three narrowly scoped subchecks above are accepted; broader HUB-06/07/08/11/12 and release gates remain open.

The retained-file UI now labels archived groups, uses the cleanup endpoint and omits download/scan/review/rename/upload actions. Queue filters have separated labels, spacing and full-size touch targets. Packaged Edge fixture checks pass41, including six widths/five appearances, removal/version and keyboard return. UI fixtures do not prove server authority; integration tests do. Actual scanner/provider/concurrency/whole-flow and deployed/device acceptance remain separate. Current totals:169 named/110 checked/59 open; including nine verified subchecks and23 shared gates201 total/119 checked/82 open.

## Group lifecycle, private editor and primary-action continuation — 16 October 2026

The legacy messages endpoint now validates channel-bound positive history anchors, after a failing400-versus200 regression. Group-list/editor reads use cancellation and generation guards; denied/missing responses clear private list/editor metadata and drafts, disable creation until a successful refresh and preserve the established focused error alert. Ordinary409 conflicts still preserve the draft and original revision. Group controls now have explicit labels, readable responsive fields and spaced actions. The previously undefined shared admin-primary class now provides consistent48px primary actions and disabled states across owner/team/client consumers, with theme tokens and focus handling preserved.

Complete H2 and fresh actual PostgreSQL suites pass83/0/0/0; TeamWorkspaceTests32. Packaged Edge fixture checks pass55 group,47 role,44 upload and41 retained-cleanup checks after shared-style changes. New group checks include five-theme enabled-button contrast and six-width layouts. These are labelled fixtures, separate from real server authority proofs. Browser-role isolation still passes45 tables/two sequences. Two completed HUB-07 subchecks are added; broader concurrency/whole-resource/provider/device/deployed release acceptance stays open. Totals remain169 named/110 checked/59 open; with11 verified subchecks and23 shared gates203 boxes/121 checked/82 open. See progress for intermediate failures and architecture/fixture limits.

## Support request and email-attempt continuation — 16 October 2026

Two failing regressions exposed late email success/failure overwriting a newer attempt. Additive V61 gives each attempt a private token; only the current unexpired attempt can finish, and the token is not included in staff API message metadata. Saved messages, portal sharing, provider acceptance and actual delivery/reading remain distinct. Unknown outcomes are labelled honestly; manual retries require checking delivery first. A receipt for an already dispatched operation can be recorded after staff revocation, but its response still needs current access.

Full H2 and actual PostgreSQL suites pass90/0/0/0, with39 TeamWorkspaceTests. A fresh V61 PostgreSQL target passes45-table/two-sequence browser-role isolation. Packaged startup upgrades an existing synthetic V60 database to61 while preserving31 original records across44 application tables; the new UUID column is nullable and starts empty. This does not replace V61 backup/restore or old-writer/rollback acceptance.

Support forms now clear private detail/drafts after denied actions, revalidate the inbox, retain409 edits, use explicit labels and prevent edits during delayed overview/assignee reloads. Saved-client copy explains private portal sharing and separately available email. The new browser fixture harness passes48 checks, including six widths/five appearances and explicit uncertain-retry controls. Three scoped HUB-13/14 subchecks are accepted; parent/private/mail/concurrency/provider and release gates stay open. Counts:169 named/110 checked/59 open; with14 verified subchecks and23 shared gates206 boxes/124 checked/82 open.

## Notification and recovery continuation — 16 October 2026

Three failing regressions exposed stale/expired public enquiry notification completion. Additive V62 now binds completion to a fresh private UUID token, current SENDING state and a 15-minute lease. Saved receipts survive unconfirmed email; the reference and provider retry identity remain stable. New full H2/PostgreSQL suites pass 95/0/0/0 with 44 TeamWorkspaceTests. No real mail or provider ran.

A preserved V60 recovery fixture was cloned and upgraded to V62; all 44 original application records remained unchanged. A stopped-writer V62 backup with representative mail/upload states restored with exact 45-table/116-row/schema/sequence/media equality. Testing permissive target defaults exposed browser-role table grants despite --no-acl. The restore helper now revokes PUBLIC/anon/authenticated privileges on restored tables and sequences before reporting success. Fresh and restored role isolation pass, including actual denied reads. Non-empty targets and a tampered dump reject safely.

The matching package boots after restore; anonymous private routes/media remain protected, and a legacy null-token interrupted notification is reclaimed with its original reference and no duplicate enquiry. That runtime test deliberately changes the restored receipt after the equality comparison. Earlier owner sign-in proof retains its earlier package scope; real mail, mixed/old writers, compatible rollback, broader financial/provider/device and complete release acceptance remain open. Two scoped subchecks above are accepted. Counts: 169 named/110 checked/59 open; with 16 verified subchecks and 23 shared gates, 208 total/126 checked/82 open.


### Next accumulated logic batch — 19 October: member management and financial verification

Implementation is ready for its grouped checkpoint: member-management read failures now clear stale private rows; checkout reconciliation checks actual resource identity/type, exact integral amounts, supported payment outcome and the payment reference required for a paid one-off checkout. Subscription reconciliation checks resource identity/type, boolean cancellation, exact integral quantity/price/interval count and bounded period timestamps. Malformed provider data must leave saved state unchanged.

Deferred cases prepared before execution: 18 new BillingWorkflowTests invocations cover immutable event references, unrelated idempotent events, mode rejection, failure backoff/review cap, malformed checkout/subscription snapshots, repeated settlement/late unpaid observations, cancellation/renewal snapshots and explicit partial-refund proposal/confirmation. New `verify-team-members-browser.cjs` covers role-limited provisioning, conflicts, invitation replacement/cancellation, uncertain mail status, suspension/restoration/recovery, access outages/refusal, actor changes and private-storage/viewport checks. Provider transport is synthetic; no actual Stripe/mail/account action is authorised by these fixtures. Run the accumulated checks together, record defects and corrections, then rerun affected scope. These prepared cases are not passing evidence until executed.


First financial/member checkpoint results: build/assets/package passed; corrected H2 suite passed 188 tests. Initial malformed-provider cases wrongly expected 409 instead of the existing 503 reconciliation contract; expectations were fixed while retaining no-mutation assertions. All 19 packaged browser suites passed 1,188 checks, including 41 new member-management checks. Harness setup corrections used the actual 8084 target and the role combobox's accessible name; no UI failure was suppressed.

Actual PostgreSQL then reproduced a product defect in settlement/refund preparation: nullable invoice matching used an untyped `? IS NULL` parameter (server SQLSTATE 42P18). Four matching financial repository queries now use standard `IS NOT DISTINCT FROM ?`, preserving binding checks for null customer/charge/invoice/payment references without duplicated parameters. Added explicit nullable-binding replay and invoice-worker overlap/backoff/stale-completion/final-page cases. These two additions bring the prepared full suite to 190 tests; corrected database execution and final package verification are pending. The first PostgreSQL process is allowed to finish before its correction run; its failures remain evidence, not a reason to restart a live process.


Final financial/member correction checkpoint: grouped `SKIP_FRONTEND_BUILD=1 gradlew.bat test postgresTest bootJar --no-daemon` passes. XML inventories confirm 190 tests on each database, zero failures/errors/skips. All 19 browser suites / 1,190 checks pass against the corrected jar `3ba847d9a14c2f6a961aa12745d73352da871af7d78d82c38ded206c7398eb21`. One verified HUB-02 logic subcheck is added: 169 named / 115 checked / 54 open; including 21 verified nested checks and 23 shared gates, **213 total / 136 checked / 77 open**. No parent or design/release item is accepted by this batch. See current progress for actual versus mocked scope and remaining local/external gates.


Current-candidate recovery checkpoint, 19 October: with tests finished and zero other source-database connections, the guarded backup/restore tools copied `crystal_rebuild_test_20261019_financial_members` to new empty `crystal_restore_20261019_financial_members`. Comparison passes 45 tables /63 metadata rows /four schema checks /two sequences /zero media. The transactional test fixtures leave zero owner/project/client/billing records; this is schema/metadata restoration, not populated business recovery or encrypted account/media proof. Corrected jar boots against the restored PostgreSQL schema V62 without migration; actual anonymous HTTP returns200 for `/`, `/team`, `/client` and401 for `/api/team/workspace`, `/api/admin/projects`, `/api/client/projects`. Logs use `logic-financial-members-2026-10-19-{backup,restore,restore-comparison,restored-app}.log`. Populated restore and compatible rollback remain open.


### Signed ingress, allocations and refund recovery batch — 19 October (verification deferred)

Finished source changes before the grouped checkpoint: webhook authentication rejects trailing JSON/oversized IDs and ingress rejects non-text references or negative/fractional/overflowing event times. Invoice page persistence validates the bounded list/boolean shape and identifier lengths before writing. Refund recovery preserves a recorded candidate provider ID; a matching-looking different refund cannot replace it. Legacy customer-less charge refunds use a fresh verified invoice/customer/subscription binding and retain the actual null customer in the ledger; no customer is invented.

Prepared `SignedWebhookTests` with the real signature implementation, controller/filter chain and database inbox, using explicitly synthetic signing material and unsupported-resource events that require no network. Prepared `FinancialRecoveryTests` with committed disposable business fixtures, real service/store/ledger transactions and mocked Stripe transport. Cases cover provider submission after committed confirmation, timeout/read-only recovery, retained provider success after ledger failure, malformed result redaction, candidate binding, legacy invoice ownership, atomic two-row allocation rollback, malformed pages and competing shared-charge confirmations. These cases are not claimed passed until the batch executes. No dependency, migration or design change.


Signed/recovery verification checkpoint: frontend build and grouped production package pass. First H2 run exercised225 tests: all17 real signed-ingress cases passed; one throwing-mock replacement and one intermittent initial invoice claim failed in the new committed fixture class. Corrected mock reset, retained diagnostic assertions, aligned invoice worker eligibility with the database clock used by the due queue, and added25 immediate claims plus a future-job rejection in one extra case. The targeted35-case correction run passed; the subsequent full **226 H2 tests /14 suites /zero failures/errors/skips** pass.

Initial PostgreSQL226 run found six fixture-isolation failures: global ledger-row counts included standalone payment/adjustment rows from earlier committed cases, which are intentionally not owned by the admin-account foreign-key cascade. The guarded disposable fixture cleanup now explicitly truncates those payment tables, retaining the original zero-write/rollback assertions. Production source/package is unchanged by that cleanup; the corrected full PostgreSQL run is pending.

Financial UI review additionally corrected BillingDrafts busy reporting to aggregate current parent/child activity with stable callbacks, and InvoiceAllocations now releases parent activity on unmount. New `verify-billing-workflow-browser.cjs` passes31 checks for exact-pence/key-preserving draft/proposal retries, issue confirmation, busy/navigation recovery, independent shared/fraud refund acknowledgements, blocked duplicate submit after uncertainty, candidate/read-only ledger recovery, invoice conflict/restart/version checks, legacy-charge labelling, four widths and no private browser storage. Initial browser harness needed the actual two-pane request selector and the existing event-queue read fixture. No product error was hidden. All20 packaged Edge browser suites /1,221 checks pass against jar `a86b477b15d67a777e52505bbdf4f653eb86f21bb46db3fd22d12c98d348982e`; inventory `.codex-runtime/qa/logic-signed-recovery-2026-10-19-browser-inventory.json`. Provider/mail/payment transports in those browser journeys are synthetic.


Final signed/recovery correction result: corrected full PostgreSQL226 passes after fixture isolation repair; full H2226 already passed with the same production source (the subsequent cleanup edit only changes the PostgreSQL fixture branch). Both inventories have14 suites and zero failures/errors/skips. The20 packaged browser suites/1,221 checks pass against the same production jar. No design/dependency/schema/provider operation occurred. Added two scoped PAY-06/07 checks:169 named /115 checked /54 open; including23 verified nested checks and23 shared gates, **215 total /138 checked /77 open**. Commands, intermediate failures and evidence are in the latest progress checkpoint. Next: client positive billing UI and populated recovery/compatible rollback before complete local logic acceptance and design.


### Client billing and populated recovery batch — 19 October (checks deferred)

Source changes are ready for the accumulated checkpoint: one shared trusted Stripe URL helper now covers checkout, management, main invoice and invoice/receipt-history links. Wrong-bill refresh responses clear billing state and require a fresh list before actions resume. The positive client billing browser harness intercepts all provider destinations before network; it covers consent, blocked/valid handoffs, disabled new billing with retained management, return/status/receipts, wrong-ID cleanup and expiry.

New `verify-populated-recovery.py` creates fresh guarded loopback PostgreSQL databases only. It seeds real owner/team MFA and client password/session flows, private uploaded/sanitised media, channel messages, support/client correspondence, private attachment bytes and explicitly labelled synthetic financial/import/refund snapshots. It stops its own source process before backup, compares rows/schema/sequences/media before resuming writes, then checks restored authentication, permissions, reads/writes and a previous local candidate on V62. No real provider credentials are loaded; config import and provider secrets are explicitly disabled. Passwords/enrolment secrets stay in process memory, not reports. These prepared scripts are not passing evidence until executed. Current external legal/provider/device/deployed gates remain unchanged.


Populated recovery first pass: actual comparison passes45 tables/130 rows/four schema checks/two sequences/one private JPEG. Restored owner/team TOTP, client password, private image/attachment and shared/internal correspondence checks pass. Actual owner HTTP invoice reads then fail503: PostgreSQL rejects SELECT FOR UPDATE inside a read-only transaction. Live TeamAccessService resolves the owner workspace through a bootstrap lock, so20 wrapping read methods across10 team/financial services must permit that lock. Their transaction annotations are corrected without weakening authority checks. Added22 committed owner endpoint cases (no surrounding test transaction) to prevent existing outer-transaction tests masking this error.

The previous local candidate has the same bug. A separate reproducible hotfix-backport helper preserves its older frontend and replaces only allowlisted transaction-fix classes from the corrected candidate; it verifies unchanged dependency/migration inventories and leaves both original JARs intact. This is a local hotfixed fallback compatibility check, not a claim that the original older JAR or production rollback passes. The corrected batch and fresh populated recovery run are pending.


## Local logic gate acceptance — 19 October 2026

The final accumulated code batch and corrections pass248 tests on each database,21 packaged browser suites/1,246 checks, and41 populated recovery checks. Current jar `6ec0dbed08f7b1ccbd59db504c7d2336e1d1734111b09aba478cc70a3b13afcf`; exact evidence is in progress. Backend/frontend business logic may proceed into the coordinated design phase. This does not tick whole-page/final visual/provider/device/deployed acceptance or invent operating facts. Three scoped subchecks were added:169 named/115 checked/54 open; with26 verified nested checks and23 shared gates, **218 total/141 checked/77 open**. Keep implementing substantial design batches and record deferred checks/corrections at their checkpoints; do not resume whole-build testing after every individual edit.
