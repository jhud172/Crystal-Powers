# Deployment and recovery

Current release readiness and rollback limits: [RELEASE_CANDIDATE_2_0.md](RELEASE_CANDIDATE_2_0.md). Both application versions are 2.0.0; this candidate remains uncommitted/undeployed and full acceptance is open. Historical retained 83872dd rebuild/boot evidence predates V4-V60; it does not prove compatibility with current schema or identify the live backend revision.

## Current boundary

The repository contains a runnable application and a free-plan Render blueprint. On 9 October 2026, James authorised deployment to his existing Render Starter service and provider configuration in his signed-in accounts. The tested application is live at `https://crystal-powers.com`, using the free Ireland Supabase project and a verified Resend domain. Existing hosting plans were preserved. Never add production secrets to Git or frontend environment variables. See `RELEASE_VERIFICATION_2026_10_09.md` for verified behaviour and remaining owner/content acceptance.

## Initial Supabase migration boundary

This new project's `public` schema had zero relations but contained Supabase's `rls_auto_enable` function. Flyway correctly refused to infer an initial schema version. After a read-only inspection established that no application tables or history existed, deployment temporarily used `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true` and `SPRING_FLYWAY_BASELINE_VERSION=0`. Version zero lets migrations V1, V2 and V3 all run; the default baseline version one would skip the initial application schema. All three migrations applied, then both temporary variables were removed from Render with **Save only**. Future deployments use the existing history and normal migration validation.

Do not enable automatic baselining as a permanent default, reuse this step against an existing application database, delete Supabase objects or baseline at version one. Inspect schema objects and existing data/history before any first-deployment baseline.

## Required configuration

Use `.env.example` as a variable reference. Spring Boot reads process/deployment environment variables; it does not automatically load the repository's `.env` file.

| Variable | Meaning |
| --- | --- |
| `PUBLIC_URL` | Exact public HTTPS origin, without a trailing slash. Used for canonical URLs, sitemap and password-reset links. |
| `DATABASE_URL` | PostgreSQL JDBC connection URL, including TLS, for example `jdbc:postgresql://HOST:5432/postgres?sslmode=require`. |
| `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Server-only database connection credentials. |
| `APP_ENCRYPTION_KEY` | Base64 encoding of exactly 32 cryptographically random bytes. Retain separately from database backups. |
| `OWNER_SETUP_TOKEN` | Private random value of at least 32 characters, used only for first-owner setup. Remove after enrolment. |
| `MEDIA_PROVIDER` | `supabase` in production. |
| `SUPABASE_URL` | Project origin in the form `https://PROJECT.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service-role key. Never expose it through Vite, a public response or browser storage. |
| `SUPABASE_MEDIA_BUCKET` | `project-media`, configured as private. |
| `MAIL_PROVIDER` | `resend`; `smtp` is retained for existing installations that support SMTP. |
| `RESEND_API_KEY` | Server-only sending credential. |
| `APP_MAIL_FROM` | Verified sender email address. |
| `APP_MAIL_TO` | James's enquiry inbox. Set explicitly. |
| `PORT` | Supplied by Render. |

Use your password manager to generate and retain the encryption key and setup token. The encryption key must be base64 of 32 random bytes, not an arbitrary 32-character password.

## Supabase

1. Create or select a dedicated free project. Do not enable paid add-ons or automatic upgrades.
2. Obtain the PostgreSQL connection details. Use the direct connection when reachable, or the session pooler when IPv4 is required. Do not use transaction pooling for migrations. The database user running migrations must own the application tables; that owner connects through the backend and bypasses table RLS intentionally.
3. Create **private** bucket `project-media`, allow `image/jpeg` and set a 5 MB object limit. Do not create anonymous or authenticated-user object policies for this bucket. Only the backend service-role credential accesses it.
4. Configure the server variables above. Flyway creates the schema and imports older examples as private drafts.
5. Migration V3 enables row-level security on all seven application tables and revokes public/`anon`/`authenticated` table access. The application performs its own owner and publication checks. Confirm these protections in the database after first startup.

The browser never connects directly to Supabase. Public screenshots are served through `/api/media/{id}` only when a currently published project references them; owner previews use authenticated routes. Unpublishing causes subsequent media requests to fail. Already downloaded copies cannot be revoked.

Reference: [Supabase private downloads](https://supabase.com/docs/guides/storage/serving/downloads), [bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## Resend

Verify the sending domain in the Resend account and configure its required DNS records after approval. Set a sending key, verified `APP_MAIL_FROM` and `APP_MAIL_TO`. The implementation calls `POST https://api.resend.com/emails` over HTTPS with bounded timeouts; provider errors return a friendly failure to the visitor. It does not silently claim that an email was sent when delivery failed.

Test the enquiry and password-reset journeys with James's approval for the recipient and message. Confirm receipt and spam placement. Local tests use synthetic addresses and mocked transport responses.

Reference: [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email).

## Render

The existing **Crystal Powers** service in **My Workspace** (`srv-d7giag77f7vs73bd36sg`) uses `jhud172/Crystal-Powers`, branch `main`, and the paid **Starter** plan. James authorised its deployment/provider configuration on 9 October; preserve that service/plan and use the existing authority. The older free-plan blueprint is not authority to create a second service or change plans. On Commit deployment was restored in the verified 9 October release; inspect its current setting before pushing a final candidate to main, since that can trigger deployment. Do not publish an incomplete candidate simply to sync a working branch. Current release readiness and retained rollback evidence are in RELEASE_CANDIDATE_2_0.md.

1. Build and test the branch before pushing. `render.yaml` uses the free Docker web-service plan and disables automatic deployment.
2. Review and create the service in the intended account. Set every secret in Render's environment settings.
3. Deploy the reviewed revision. The Docker image compiles the frontend and Spring Boot application and runs as an unprivileged user. Health check: `/api/health`.
4. Keep persistent data in PostgreSQL and private object storage. The container filesystem and sessions are disposable.
5. Verify `/`, all public routes, an unpublished project returning 404, `/admin`, owner MFA, private upload, draft preview, publication from another signed-out browser, unpublish, contact email and recovery email.
6. Configure the custom domain/DNS only after those checks and James's approval. Set `PUBLIC_URL` to that domain and verify TLS and canonical URLs again.

Free-plan availability, quotas, sleeping/cold starts and database inactivity policies are provider-controlled. Confirm the current account limits before launch. Do not promise always-on performance or automatic backups on a free plan. The application has one server instance, a four-connection database pool and no shared session store.

## Back up database and media together

Use Python 3 and matching PostgreSQL command-line tools. `scripts/portfolio_backup.py` reads normal `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`/`.pgpass` configuration; optional `PG_BIN` locates the PostgreSQL executables. Never place passwords in command arguments.

1. Stop the application or otherwise pause every owner write.
2. Create a backup in a new private directory outside the repository. It contains personal/account data and must be stored on encrypted storage with restricted access.
3. Run one of the following, with credentials already in the process environment:

```powershell
python scripts/portfolio_backup.py backup X:\PrivateBackups\crystal-2026-09-13 --writes-paused --media-provider supabase
# Local profile variant:
python scripts/portfolio_backup.py backup .codex-runtime\backup-example --writes-paused --media-provider local --media-directory .codex-runtime\media
python scripts/portfolio_backup.py verify X:\PrivateBackups\crystal-2026-09-13
```

The package includes a scoped PostgreSQL custom dump, all database-referenced image objects and a SHA-256 manifest. A missing or altered image fails verification. Local backups also list unreferenced JPEGs for review; no objects are automatically deleted. An incomplete directory without a verified manifest is not a recovery point. Keep the matching encryption key in a separate password-manager entry; the script does not export it.

## Restore rehearsal and production restoration

The script's automated restore only targets an **empty** `crystal_restore_*` database on `127.0.0.1:55432` and a new media directory:

```powershell
python scripts/portfolio_backup.py restore-local .codex-runtime\backup-example --media-directory .codex-runtime\restored-media
```

It refuses existing tables or media directories. Start a local instance against that restored database and directory with the matching encryption key, then verify sign-in, image contents and publication.

For a real recovery, first verify the backup and retain a backup of the current state. Stop the app. Restore the scoped dump into an empty, compatible PostgreSQL database using `pg_restore --exit-on-error --no-owner --dbname TARGET database.dump` with credentials supplied securely. Restore every `media/*.jpg` into a private bucket with identical keys. Apply the corresponding environment settings and encryption key. Run the same owner, public and private-media checks before reopening traffic. Production restore is a deliberate operator action; the script does not overwrite a live database.

Repeat backup verification regularly and rehearse restoration after schema or storage changes. Database-only backups do not contain the object-storage image bytes.

## Current 2.0 source additions - acceptance pending

Source now contains V1-V62, not just the original three migrations. Team/client accounts, scoped channel conversations and attachments, support/client communication, delegated projects, billing/refund operations and invitation delivery are connected in source. None of this establishes that the current candidate has been compiled, migrated or accepted in production. The chronological source checkpoints formerly below are retained in [candidate/deployment history](archive/RELEASE_CANDIDATE_HISTORY_2026_10_12.md).

| Setting area | Current contract |
| --- | --- |
| Public origin | PUBLIC_URL must be the operator's actual origin; invitation delivery requires HTTPS with no path/query/fragment/userinfo |
| Mail | Existing SMTP/Resend transport; server-only sender/reply-to/key; INVITATION_EMAIL_ENABLED=false by default; provider configuration does not create a company mailbox |
| Upload scanning | UPLOAD_SCAN_ENABLED and trusted private scanner address/port; CLEAN plus human review for ordinary access; unavailable scanner does not release quarantine |
| Channel file allowance | TEAM_UPLOAD_MAX_WORKSPACE_BYTES=536870912 default; five active files/15 MiB total per message; workspace allowance checks serialize with writes |
| Multipart transport | 15 MB file default and 16 MB request default allow envelope overhead; business limits remain separately enforced |
| Billing | Stripe GBP contracts, mode-bound current provider/customer verification and raw signed events; example credentials blank and feature flags disabled |
| Refunds | BILLING_REFUNDS_ENABLED=false; explicit consent/leases/provider result and separate ledger reconciliation; no automatic blind money retry |
| Recovery workers | Optional default-disabled event/invoice recovery; prove bounded scheduling/leases/retries before enabling |
| Account/model storage | Preserve encryption keys/root identity/private media and database; no public role self-selection or automatic private publication |

Use actual [.env.example](../.env.example) and application properties for variable names/defaults; do not expose real values. [Team scope](TEAM_HUB_2_0.md), [client operations](CLIENT_OPERATIONS_2_0.md) and [email setup](COMPANY_EMAIL_SETUP_2_0.md) describe feature contracts and outstanding real facts. [Current release readiness](RELEASE_CANDIDATE_2_0.md) owns the full verification and rollback sequence.

Include all present owner/project/team/client/support/upload/billing/financial/refund tables in a matched private backup. New optional tables/columns are included by the current backup helper; earlier snapshots must not be described as containing later data. Rehearse V1-V62 migration, RLS/revokes, indexes, concurrency and database/media restore on disposable targets. An older V1-V3 application/jar is not a proven rollback against the new schema. Do not reset production history/data to make an old application start.

No actual migration, scan, account/email/payment/refund/publication, DNS/provider or deployment operation occurred during this source-documentation reconciliation. That statement describes the earlier documentation-only checkpoint; current local build/test/recovery evidence is recorded below and in the release candidate document.

## Current local notification/recovery evidence — 16 October 2026

V61/V62 add private per-attempt reply/enquiry email tokens. Stop prior app writers before migrating/enabling these changes: an older writer does not honour the token completion guard. Existing data/history is preserved; an older application against this schema is not an accepted rollback.

Full local H2/PostgreSQL suites95/0/0/0, V60→V62 preserved-data upgrade and matched45-table/116-row/database/media/schema/sequence restoration pass with the recorded jar. Both current and restored private browser-role boundaries pass, including a target deliberately given permissive default grants. Earlier owner-auth/device/provider/live evidence keeps its original package scope. No production deployment or real provider/email/payment action happened in this verification.

The guarded local restore helper uses --no-acl, then explicitly revokes PUBLIC and existing anon/authenticated grants on the restored private tables/sequences. --no-acl alone does not prevent target default grants from exposing restored objects. For an operator-led real restore, verify effective grants and RLS before reopening traffic, preserving the intended backend access. The script still only restores into an empty crystal_restore_* target on127.0.0.1:55432 with a new media directory; it does not restore production automatically. Verify encryption keys separately and account for emails/payments completed outside the database before choosing a recovery point.


## Disposable populated recovery lab

`scripts/verify-populated-recovery.py` requires retained local current and fallback JARs, fresh `crystal_rebuild_test_recovery_*` / `crystal_restore_*` database names, PostgreSQL CLI tools and the owned server on127.0.0.1:55432. It creates new databases only, refuses occupied8084/output directories, stops only its own Java child, disables config imports/provider secrets/workers and keeps synthetic passwords/TOTP secrets in memory. It does not read `.env`. Repeating a run requires fresh names; it never drops/overwrites a database to make a test pass.

Example using the retained19October artifacts (choose unused run/database names):

```powershell
python scripts/verify-populated-recovery.py --candidate .codex-runtime/qa/candidates/6ec0dbed08f7b1ccbd59db504c7d2336e1d1734111b09aba478cc70a3b13afcf.jar --rollback-candidate .codex-runtime/qa/candidates/rollback-hotfix-a86b477b15d6-6ec0dbed08f7.jar --source crystal_rebuild_test_recovery_20261019_03 --target crystal_restore_populated_20261019_03 --run populated-recovery-20261019-03
```

The fallback above is the previous frontend with a reviewed owner-read transaction hotfix backported by `prepare-rollback-candidate.py`. That helper permits only the explicit service-class allowlist, requires identical migrations/dependencies, verifies all other archive entries and preserves originals. It refuses existing output files; reuse the verified artifact/metadata rather than overwriting it. This local V62 compatibility proof is not an old-schema downgrade or approval to deploy the original unpatched prior candidate.

Candidates/backups/evidence are ignored local artifacts and do not travel with a Git push. Reproduction elsewhere requires retained/rebuilt candidates and the local PostgreSQL lab. Do not commit those binaries or fixtures. Actual production recovery still uses its authorised database/media backup and separately retained original encryption key; provider, operating-fact and deployed acceptance remains governed by the release checklist.
