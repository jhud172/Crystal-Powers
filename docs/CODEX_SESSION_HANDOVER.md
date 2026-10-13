# Crystal Powers 2.0 current handover

Source reconciliation: 12 October 2026. Branch `James/crystal-powers-2-completion`; base HEAD `83872dd0ca56217adb0f62b8976a1296f796c926`. The accumulated 2.0 changes are included in the 13 October laptop handover commit; verify the branch tip with Git. The final verification cycle has started; the automated build gate passes, but the complete release is unverified. No running server/browser/process handle is established by this document. Inspect live state before using or waiting on an old handle.

## User decisions and working order

- Complete the entire page-by-page 2.0 audit, fix findings and preserve the app's public studio and private business workflows.
- Liquid Light is selected: original light art, reversible optional opening, warm editorial composition. Existing five appearances and separate original Blender/device stages remain.
- Dependency updates/Tailwind migration were authorised. Tailwind 4/PostCSS is installed; unused GSAP/Motion consumers were removed.
- Only Clare's Life Celebrations is approved public client work. Do not publish synthetic projects or invented results.
- Team accounts are admin-issued with server-enforced roles/bounded custom grants, private activation/MFA and protected root owner separation. The hub handles channels/groups, requests, client contact and business content.
- Billing uses Stripe, GBP, optional deposit/balance and explicitly agreed monthly support. A return URL is never payment proof.
- Finish implementation before full builds/tests/browser suites. The earlier explicitly requested cleanup check is dated evidence only. Then run applicable checks, fix failures/additions and repeat until zero applicable failures. Skips remain open.
- Never inspect/print real `.env`, keys or passwords; never perform real customer charges, refunds, emails, publication or provider changes as tests.

## Actual source ownership and connected workflows

| Area | Current source | Evidence limit |
| --- | --- | --- |
| Public routes | Home, About, Services, Portfolio/case, Contact, Support, Accessibility, birthday route, redirects and 404 | Liquid Light changes and image/form/focus fixes need final page/theme/device acceptance |
| Owner | Separate owner sign-in/MFA/recovery/settings, project drafts/revisions/media/publication | Earlier tests predate new shared project/media and schema work |
| Team | TeamEntry/TeamWorkspace; channels/categories/groups, messages/replies/mentions/pins/unread; role/account/workspace/channel settings | Source connected; final role/privacy/concurrency/browser checks pending |
| Support/uploads | Persisted enquiries, private files, clean-scan plus review quarantine, moderation/removal, assignment/progress/internal notes/portal sharing/email | No actual scanner/provider/late-schema acceptance established |
| Business projects | TeamProjects and shared owner/team editor, explicit root-granted workspace scope, paging, real attribution, publication guards and draft recovery | All delegated write/media/version/session acceptance pending |
| Client | Separate invitation/account/session, linked projects/progress/conversation/replies/files, password changes, scoped billing and support contact preferences | Current actor/revision checks exist in source; runtime acceptance pending |
| Billing | Issued immutable requests, one-off/recurring checkout and explicit consent, signed events/recovery, portal/invoices/receipts, observations/provider records/allocations, refund proposals/confirmation/reconciliation | No new live/sandbox/provider/migration proof; refunds disabled |
| Channel attachments | MessageAttachments/ChannelUploadQueue; private validated uploads, scan/review/download/removal, safe renames, inactive-message cleanup, pre-pagination channel/group scope | Attachments follow an existing text message; full end-to-end acceptance pending |
| Invitation email | InvitationEmail in member/client screens; stored-recipient review, explicit send, claim/status/uncertain outcome handling; body deadline | Default disabled; actual mailbox/DNS/provider/delivery proof outstanding |

Source migrations now cover V1-V60 across SQL and Java locations. Later migrations must not be described as applied or compatible merely because the files exist. Existing applied migrations remain immutable. Backup inventory includes optional new tables and columns; restore/privilege/rollback proof remains required.

Private unsent text/project/refund forms recover only from tab memory after current identity/resource proof, preserving conflicts and original submission keys. Files, passwords, invitation tokens, payment execution consent and private history are not persisted into browser storage or reauthentication draft memory. Review the actual feature memory ownership before extending recovery.

## Current acceptance and next work

The audit has 169 named entries: 102 checked, 67 open. Including the 23 shared acceptance/release bullets gives 192 checkboxes: 102 checked, 90 open. Counts are document state, not completion percentages. New source-only work has not accepted HUB/PAY/page/release gates.

1. Review remaining explicit implementation requirements against current source, including contact/privacy/aftercare facts and final selected-design consistency; avoid adding unrelated features just to generate progress.
2. Resolve the operating facts requested from James: legal operator/trading identity, company email/domain, enquiry/upload retention/deletion and agreed support scope. Do not invent them or publish an unready privacy route.
3. Finish applicable implementation, consolidate contract tests for the changed workflows, then run the full release verification/fix loop. Include H2 and disposable PostgreSQL, security/negative/concurrency cases, browser routes/roles/themes/widths/focus/motion, uploads/email/billing sandbox, backup/restore and deployment evidence.
4. Obtain physical-device/assistive and authorised hosted/provider evidence separately. A skipped unavailable gate is not a pass.
5. Review all accumulated changes and secret/dependency checks, commit/push the working branch for handoff, then deploy only a verified candidate through the existing authorised scope.

Latest source closure review fixed stale attachment panels on conversation/queue access failure, forced-unmount busy cleanup, cancellable owned conversation reads, message-send busy guards and the attachment theme border token. TSX parse/whitespace checks passed; current runtime acceptance remains unproven. See the source closure review checkpoint in progress for required delayed/revocation/lifecycle checks.

Latest security source review adds retained target-grant dominance to team recovery/reissue/cancel/state/profile changes and invitation delivery, including archived profiles. Deferred TeamMemberAuthorityTests cover core takeover/boundary cases; none was run. The legacy three-argument channel post service wrapper is restored for existing callers. See progress for final endpoint/concurrency checks.

Member and role-profile screens now consume server-computed management/grant/edit flags, disable unavailable actions and clear stale actor context. Read-side retained-grant resolution is batched; a deferred summary-boundary regression was added. Source syntax/whitespace only; see progress for final contract/UI/concurrency checks.

Private hub layout now has mobile navigation disclosure/skip/destination focus, bounded vertical request/project choices, theme-based channel/composer/client composition and role-profile focus return. Source parse/whitespace only; browser/device/contrast/dirty/busy acceptance remains open. See progress.

Liquid Light delivery now uses a generated pixel-identical 929,946-byte WebP (about 42% smaller than the retained PNG), with shared Home/About PNG retry and timeline cancellation on total art failure. The encoder completed; final release script has validate-only provenance checks. No browser/performance/build acceptance yet.

Opening project screenshots now use the shared non-blocking fallback with standalone opt-in stable retry/status; thumbnail fallbacks remain non-interactive. Source parse/whitespace only; actual slow/failure/focus/gallery/theme acceptance remains open.

Privacy publication backend now requires explicit approval plus complete operator-authored JSON; default-off status/404, owner diagnostics and conditional server metadata/sitemap are implemented in source. No policy is published. Frontend route/conditional links/metadata are connected in source; actual operating facts remain pending. See client operations and progress.

Privacy frontend and deferred publication-contract regressions are now connected, with default-off NotFound/hidden links, public-only status reads, no HTML execution and document-over-status evidence ordering. Actual approved content and final runtime gates remain open.

## Verification and configuration boundaries

The cleanup checkpoint passed a frontend build, 48 H2 tests, relevant asset/import/font checks and an advisory scan. Those passes predate the late workflow/migration additions and cannot certify current source. Earlier checkpoints used source checks only. The current final cycle fixed frontend diagnostics and obsolete/invalid upload fixtures; scripts/verify-release.ps1 passes with 708 frontend modules, 56 tests and zero failures/errors/skips, asset checks and bootJar. npm audit reports zero advisories. Current jar/index/static inventory was inspected. See the final verification checkpoint and ignored final-build-2-0.json. Browser/PostgreSQL/provider/backup/device and expanded workflow coverage are still open.

`BILLING_ENABLED`, live Stripe mode, refund execution, automatic recovery, scanner and invitation delivery must be understood from actual current configuration, not examples. New invitation delivery remains disabled by default. Never enable a setting or act against an external account merely to obtain green checks. The app's SMTP/provider configuration does not create a company mailbox.

Current local jar SHA256 is 871b0ac5347d3074efafb1d5c38f29c21899c34e0f3657064d89098dd2e7899c at the recorded build checkpoint. No process/session/cloud revision is declared live here. Version `2.0.0` alone is not release evidence. An older application cannot be assumed to validate/run against a V60 database; follow the current release/restore guide.

Use [release gates and rollback](RELEASE_CANDIDATE_2_0.md), [deployment](DEPLOYMENT.md), [source checkpoints](CRYSTAL_POWERS_2_0_PROGRESS.md), [audit](CRYSTAL_POWERS_2_0_AUDIT.md) and [documentation index](README.md). Superseded handovers remain in [history](archive/HANDOVER_HISTORY_2026_10_12.md); historical release artifacts are in [candidate history](archive/RELEASE_CANDIDATE_HISTORY_2026_10_12.md).
# Laptop handover — 13 October 2026

Continue on `James/crystal-powers-2-completion`. This is a work-in-progress 2.0 handover, with release acceptance still open.

Latest frontend TypeScript/Vite build and Gradle `bootJar` both passed after fixing the homepage primary link's CSS specificity so its label uses the intended contrasting colour. The homepage browser harness now checks at least 4.5:1 label contrast in all five appearances; that strengthened browser run is still pending.

Earlier final verification passed 56 backend tests with zero failures/errors/skips, asset contracts, production build and npm audit with zero advisories. Packaged local browser checks passed 169 shell checks and 43 homepage checks before the latest contrast assertion. The isolated local runtime has stopped; start a fresh isolated runtime when resuming browser QA. Generated runtime evidence and build output are ignored and are not part of the laptop transfer.

Next: rerun homepage browser checks for the contrast fix, then complete the remaining page, permission, client/team/billing/upload, PostgreSQL/restore and provider acceptance gates in the canonical audit. Legal operating facts, real company mailbox configuration and approved publication remain pending. Do not mark the whole release complete from the current test results.

On the laptop, fetch origin, switch to this branch (create its tracking branch if absent), then pull with `--ff-only`. Preserve any existing laptop edits before switching.

## Local continuation — 13 October 2026

The local completion worktree now includes uncommitted autonomous light animation, custom appearance controls, tablet-only 3D policy and public navbar work. Fresh frontend build/bootJar and 56 backend tests pass. The packaged preview runs on localhost:8086 with a separate preview H2 database and disabled email/billing. Runtime PID is recorded in ignored .codex-runtime/preview-2026-10-13/process.pid; revalidate before reuse. No deployment or whole-audit acceptance occurred. Read the latest progress checkpoint for browser evidence, legacy native-select harness updates needed, and generated transparent logo concepts awaiting James's choice.

Latest local branding: the selected Blender logo is integrated through BrandIdentity/BrandLogoCanvas, responsive branding delivery and favicon. Header/footer clicks unfold the real3D logo; phones use a2D pulse, reduced motion keeps still branding. Uncompressed GLTF loading explicitly disables unused decoders to preserve the existing CSP. Latest frontend build/package and integration56-test run pass; fresh browser console is clean after the decoder fix. See the interactive-logo checkpoint in progress for exact behaviour, delivery sizes, evidence and untested physical/failure gates. Runtime PID continues to be recorded in the ignored preview directory; no production deployment occurred.

Mobile header follow-up: small-screen crystal/wordmark are enlarged and protected from shrinking, with compact project/Menu actions at 600/480px. Fresh frontend build/package and 12-width browser checks pass. See the mobile logo checkpoint and ignored screenshot in progress. Local preview refreshed; no deployment or whole-release acceptance.

Latest public navbar buttons use regular-weight text, slimmer 44px controls, subtle surfaces and fine-pointer hover accents. Reduced effects suppresses decorative hover movement/transitions. Fresh frontend/package and targeted responsive/theme/keyboard checks pass; see the refined-navbar checkpoint. No deployment.
