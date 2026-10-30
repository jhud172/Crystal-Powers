# Crystal Powers

The working **2.0.0 candidate** for James’s independent design and development studio: a React/TypeScript portfolio with original Blender artwork, interactive project displays and a secure Spring Boot owner studio.

## Run locally

Requirements: Node.js 22, Java 17 toolchain (the included Gradle wrapper also runs with the installed Java 21), and Python 3 only for asset/backup tooling.

```powershell
cd frontend
npm ci
npm run build
cd ..
$env:SKIP_FRONTEND_BUILD='1'
.\gradlew.bat bootRun --args='--spring.profiles.active=local'
```

Open `http://127.0.0.1:8080`. For Vite hot reload, run `npm run dev` in `frontend` while the backend is running. Use one hostname consistently so session cookies remain on the same origin. Vite proxies `/api` to `http://127.0.0.1:8080`.

For the built design preview, leave that backend running and, in a second terminal, run `npm.cmd --prefix frontend run preview`. Open `http://127.0.0.1:8084`; portfolio, accounts and forms use the same-origin API proxy. The preview now checks backend health and the published-project API before starting. A frontend-only server is not a working full application. Only for intentional UI-only QA, set `$env:CRYSTAL_FRONTEND_ONLY='1'` before running the preview; backend features will remain unavailable. Keep127.0.0.1 consistent across the local URLs so cookies remain usable.

The local profile uses a persistent H2 database and private media under `.codex-runtime/`. It disables real email. Set a private `OWNER_SETUP_TOKEN` of at least 32 characters before first-owner setup at `/admin`. A local encryption key is generated and retained under `.codex-runtime/security/`; do not delete it while keeping the database. Production requires an explicit PostgreSQL connection and encryption key.

The repository’s `.env` is not automatically loaded. Supply process environment variables or your IDE’s run configuration. See `.env.example` for supported settings.

The temporary [local Codex publisher](docs/LOCAL_CODEX_ACCOUNT.md) uses normal password/MFA team authentication, Windows-user-encrypted credentials and a restricted portfolio role. It is blocked outside the loopback local H2 runtime. Suspend it and remove its encrypted credentials with the documented offline tool before release. Clare’s approved project is now published in the saved local database; this does not publish it to production.

## Build and verify

```powershell
cd frontend
npm run build
npm audit
cd ..
$env:SKIP_FRONTEND_BUILD='1'
.\gradlew.bat test bootJar
```

Without `SKIP_FRONTEND_BUILD`, Gradle runs `npm ci` and the frontend build automatically. Stop a running Vite process before that full dependency restoration on Windows. Never use the skip flag to package stale frontend output.

`postgresTest` runs the same integration tests against an explicitly configured disposable database. Its URL guard accepts only `crystal_rebuild_test*` databases on `127.0.0.1:55432`. Set `PG_TEST_DATABASE_URL`, `PG_TEST_DATABASE_USERNAME` and `PG_TEST_DATABASE_PASSWORD` before running it. Tests delete synthetic records; do not point them at real data.

## Application structure

- `frontend/src/app`: shared navigation, themes, routing and metadata.
- `frontend/src/routes`: public pages, birthday experience and owner studio.
- `frontend/src/features/experience`: deferred WebGL, authored animation, film and image fallback.
- `frontend/src/features/portfolio`: published-project API and shared case-study presentation.
- `frontend/src/features/admin`: sign-in/MFA, account recovery, editor and revisions.
- `frontend/src/styles/index.css`: active stylesheet entrypoint. Proven-unused legacy source/styles were removed after reachability and compiled-output checks; original assets and private migration input are retained.
- `frontend/public/models` and `renders`: original GLBs, responsive WebP images, PNG fallbacks and deferred MP4 films.
- `assets/blender`: editable scene sources and reproducible Blender/render/export scripts.
- `assets/fonts`: font provenance/maintenance guidance; unmodified Manrope delivery files and licence live in `frontend/public/fonts/manrope`, with active faces in `styles/base/fonts.css`. `verify-release.ps1` validates these hashes and faces offline.
- `src/main/java/com/crystalpower/website`: API, validation, publishing, private storage, mail, owner authentication and repositories.
- `src/main/resources/db/migration` and `src/main/java/db/migration`: Flyway schema, legacy draft import and hosted-database access restrictions.
- `scripts/portfolio_backup.py`: private database/media backup, integrity verification and isolated restore.

The public routes remain `/`, `/about`, `/services`, `/portfolio`, `/portfolio/:slug`, `/support`, `/contact` and `/accessibility`. The birthday route and legacy redirects are retained. `/admin` manages projects; `/api/admin/**` requires MFA-authenticated owner access and CSRF for mutations. Only explicitly published revisions appear through `/api/projects` and public image routes.

Saving a draft does not change the published revision. Uploaded screenshots remain private until published, and the chosen cover is displayed on the real 3D device. Older sample projects are seeded as private drafts and need verified content before publication.

## Guides

- [Owner setup, publishing and recovery](docs/OWNER_STUDIO.md)
- [Free-plan deployment, configuration and backup/restore](docs/DEPLOYMENT.md)
- [Rebuild scope and delivery gates](docs/archive/IMMERSIVE_REBUILD.md)
- [Current 2.0 checklist](docs/CRYSTAL_POWERS_2_0_AUDIT.md)
- [2.0 candidate, version and rollback requirements](docs/RELEASE_CANDIDATE_2_0.md)
- [Historical verification record](docs/archive/REBUILD_QA.md)
- [Blender source and export workflow](assets/blender/README.md)

No real provider accounts, domain changes or public deployment are implied by a local build. Review the verification record for the tested boundaries.

## 2.0 work in progress — Liquid Light and team workspace

The selected public direction is Liquid Light. Run `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5175 --strictPort` and open `/design/observatory.html` for its editable development preview. Its Clare screenshot is an approved preview fixture, not a newly published project. The production Home uses the same hero; existing appearances and original model assets remain available.

Tailwind4 uses the official PostCSS adapter with the existing TypeScript configuration referenced from the CSS entry. Dependencies have been migrated; the cleanup build and npm advisory scan pass. Final visual/CSS compatibility acceptance is deferred until implementation is complete.

Private team routes are `/team` and `/team/activate`. Admin provisioning uses `/api/team/members`; activation never accepts a role. Accounts, encrypted MFA, invites, channels and messages use additive Flyway V4–V6 migrations. The cleanup checkpoint passes48 H2 tests with five new team boundary tests. Subsequent channel management and complete PostgreSQL/browser/security/workflow acceptance remain pending. Do not run the new migrations against production merely to preview the design. Company receiving mail now uses Lark; current provisioning and verification are recorded in the company email setup guide. Automatic invitation delivery remains disabled.

See [release audit](docs/CRYSTAL_POWERS_2_0_AUDIT.md), [team scope](docs/TEAM_HUB_2_0.md), [design implementation](docs/LIQUID_LIGHT_IMPLEMENTATION.md) and [company email setup](docs/COMPANY_EMAIL_SETUP_2_0.md). Remaining hub/business features and release gates stay unchecked. The cleanup checkpoint is an authorised exception; final tests/builds remain deferred at James’s request; no release-ready claim follows from source changes or the development server starting.

Department email routing supports `APP_MAIL_SUPPORT_TO`, `APP_MAIL_SALES_TO` and `APP_MAIL_GENERAL_TO`; blank values retain `APP_MAIL_TO`. Optional `APP_MAIL_SUPPORT_REPLY_TO` and `APP_MAIL_ADMIN_REPLY_TO` override the company reply address. Real team mailboxes must be provisioned and verified before enabling these settings. Incoming mailbox messages are not automatically imported into the website's Support Inbox. See the company email setup guide for the proposed address directory and activation checks.

Live email checkpoint,25 October2026: the existing Render build now targets `james@crystal-powers.com` for enquiry notifications and company replies, retaining Resend and the existing studio sender. Lark receiving and sending work for the founder with SPF/DKIM/DMARC passing, and the studio/notifications/postmaster/abuse aliases receive mail. Hello exists but requires first sign-in; the other team-account credentials and provisioning remain incomplete. The website test was saved and accepted by Resend, but its final inbox receipt is not yet confirmed. Department-routing source remains local and is not deployed or activated. See [current email evidence and remaining steps](docs/COMPANY_EMAIL_SETUP_2_0.md).

Documentation is indexed in [docs/README.md](docs/README.md). Historical records are in docs/archive and technical reviews in docs/reviews; see [cleanup record](docs/CLEANUP_2_0.md) for removed files and exact verification limits.

Client operations source now saves enquiries and private reference files before email notification, with request references and retry keys. The team workspace has role-guarded request/progress/reply and upload-review surfaces. `APP_MAIL_REPLY_TO` configures the company reply address. V7/V8 and the expanded backup inventory are pending final migration/security/restore checks; the earlier cleanup results do not accept these additions. Payment-provider/billing choices and the private client/payment integration remain open. See [client operations](docs/CLIENT_OPERATIONS_2_0.md).
