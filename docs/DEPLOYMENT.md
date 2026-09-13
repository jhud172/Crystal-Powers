# Deployment and recovery

## Current boundary

The repository contains a runnable application and a free-plan Render blueprint. No accounts, paid resources, DNS records or public deployment are created by this implementation. Real credentials, verified email sending and deployment must be completed in James's accounts. Never add production secrets to Git or frontend environment variables.

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

Read-only inspection on 13 September 2026 found the existing **Crystal Powers** service in **My Workspace** (`srv-d7giag77f7vs73bd36sg`), serving `https://crystal-production.onrender.com` from `jhud172/Crystal-Powers`, branch `main`. It currently uses the paid **Starter** plan and automatically deploys commits to `main`. No service settings were changed. The new free-plan blueprint does not automatically alter that existing service. Before pushing or deploying, James must approve whether to reconfigure that service or create a separate free service, and supply the database, storage and email configuration. Never merge into `main` assuming deployment is disabled.

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
