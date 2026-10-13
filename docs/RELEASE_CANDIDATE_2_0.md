# Crystal Powers 2.0 release readiness and recovery

Reconciled with source on 12 October 2026. **The current candidate is not accepted, committed or deployed as a complete 2.0 release.** Liquid Light is selected. Branch `James/crystal-powers-2-completion` contains substantial uncommitted changes over `83872dd0ca56217adb0f62b8976a1296f796c926`; source package/application versions are 2.0.0.

Previous jar hashes, offline rebuilds, browser counts, provider/live checks and V1-V3 rollback observations retain only their dated scope in [historical candidate evidence](archive/RELEASE_CANDIDATE_HISTORY_2026_10_12.md). They do not prove current jar contents, database state, live revision or V1-V60 compatibility. Do not use an old process/session identifier without revalidation.

## Implementation and acceptance order

James instructed: finish all applicable implementation before the full verification cycle, then fix failures and necessary additions and repeat until no applicable check fails. Do not weaken tests or call skipped gates passes. The cleanup checkpoint's build/48 H2/advisory/asset checks predate later workflow additions. The final automated build cycle now passes after fixing TypeScript errors and invalid/outdated upload tests: 708 frontend modules, 56 tests with zero failures/errors/skips, asset contracts and bootJar; separate npm audit reports zero advisories. Current package index/static inventory is verified. Browser, expanded workflow/security coverage, PostgreSQL/provider/backup/device and release gates remain open. Detailed failures, fixes and exact jar identity are in current progress and handover.

The canonical [audit](CRYSTAL_POWERS_2_0_AUDIT.md) retains 169 named entries (102 checked, 67 open). Its additional 23 shared page/release bullets make 192 total checkboxes (102 checked, 90 open). These are not percentages of feature implementation. Whole-page/role/provider/phase acceptance is separate from a source patch.

| Gate | Evidence required | Current limit |
| --- | --- | --- |
| Source completeness | Every applicable named requirement matched to current source and remaining dependencies | Final review still open |
| Public design/workflows | Every route, six widths, five appearances, focus/keyboard/zoom/motion/forms/media/error/retry/direct navigation | Current Liquid Light acceptance open |
| Owner/team/client security | Current credentials/capabilities/resource scope, negative access, MFA/recovery/revocation, drafts/version/parallel request handling | Compilation/basic regression gate passes; expanded workflow/role/concurrency runtime coverage remains open |
| Uploads | Real configured scanner, format/size/quarantine/approval/removal/private downloads, repeated/concurrent/uncertain cases | Source compiled; stored-upload quarantine regression passes; real scanner/runtime proof pending |
| Billing | Authorised Stripe sandbox one-off/recurring/portal/invoice/receipt/refund/events/recovery, no real charge as a test | Configuration/account and complete acceptance pending |
| Email | Actual provider/mailbox/DNS and stored-recipient invitations/support delivery, failures/uncertainty/deadlines | Invitation delivery disabled by default; operating facts pending |
| Content/privacy | Approved Clare material/publication, actual legal operator/retention/deletion/aftercare and truthful copy | Facts and final publication still unresolved |
| Persistence/recovery | H2 and disposable PostgreSQL V1-V60, RLS/revokes/index plans/concurrency, private database/media backup/restore | Files and helpers exist; actual proof pending |
| Performance/accessibility | Measured asset/bundle/frame/load costs, assistive output and separate physical phone evidence | Historical measurements do not accept new design |
| Release identity | Reviewed clean commit, passing packaged candidate, matching deployed revision/routes/integrations and rollback rehearsal | No complete current candidate identified |

## Verification commands after implementation

Use already authorised dependency restoration if needed; do not install implicitly. Inspect the current commands before execution:

```powershell
.\scripts\verify-release.ps1
.\gradlew.bat postgresTest --no-daemon --rerun-tasks
```

The script currently performs frontend production compilation, animation/font/model/poster checks and Gradle test/bootJar. It does not prove every role/workflow, browser journey, external provider, physical device, container or backup gate. PostgreSQL checks require an explicitly disposable database at `127.0.0.1:55432/crystal_rebuild_test...` through `PG_TEST_DATABASE_*`; never point tests at the application/production database. Do not print credential values. Record exact source/commit, commands, test coverage/results/skips, startup/package identity and browser/provider evidence separately.

Fix failures from actual logs, update obsolete design assertions to the selected behaviour, add meaningful missing regression/security/concurrency coverage, and repeat only the affected checks until ready for the complete release rerun. Asset/media source checks must not be used as browser performance proof.

## Configuration and migration scope

Source migrations are additive V1-V60, including SQL schema and Java hosted security migrations. Existing history is never rewritten or baseline-reset. The earlier initial Supabase V0/V1-V3 operation is historical and must not be repeated on a populated database.

Production settings remain server-only; keep actual database, media bucket, encryption and provider keys secure and preserve root owner identity. Source adds explicit default-disabled invitation delivery/refund/recovery/scanner/billing settings. Only enable a feature after its required account/configuration/acceptance is ready. Invitation mail requires an operator-configured HTTPS root PUBLIC_URL and actual provider; SMTP/Resend variables do not create mailboxes or establish DNS policies. See [.env example](../.env.example), [email setup](COMPANY_EMAIL_SETUP_2_0.md), [client operations](CLIENT_OPERATIONS_2_0.md) and [deployment](DEPLOYMENT.md).

## Backup and rollback

1. Identify and retain the exact candidate commit/image, database migration history and matched private database/media backup. Secure encryption keys separately. Code archives/jars are not data/credential backups.
2. Rehearse restore in an empty compatible disposable target and verify all current private business/client/billing/upload tables, media, roles, RLS and provider relationships. Do not drop/reset production or overwrite the only backup as a test.
3. Prove application/schema compatibility before selecting a rollback. The retained 83872dd application predates V4-V60; it cannot be assumed to validate or run against a database containing those migrations. Do not remove history rows or rewrite DDL to make it start.
4. If data restoration is needed, prepare and verify a matched compatible target before an explicitly authorised live connection change. Preserve the failed candidate/database for investigation; consider externally completed payments/emails before restoring stale local records.
5. Validate boot/migrations, health, public/legacy routes, private data/media isolation, owner/team/client sign-in and current provider reconciliation before reopening writes. Clear stale browser versions safely. A code rollback does not reverse provider charges, refunds or delivered emails.

The existing Render service/plan authority is recorded in deployment history, but live settings/revision must be checked afresh. Pushing `main` may deploy automatically; sync unfinished work on the working branch. No deployment, provider mutation or rollback is authorised by merely reading this guide. Final review should use the session's existing user authority and its actual scope.
