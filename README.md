# Crystal Powers

James’s independent design and development studio: a React/TypeScript portfolio with original Blender artwork, interactive project displays and a secure Spring Boot owner studio.

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

Open `http://localhost:8080`. For Vite hot reload, run `npm run dev` in `frontend` while the backend is running. Use one hostname consistently so session cookies remain on the same origin. Vite proxies `/api` to port 8080.

The local profile uses a persistent H2 database and private media under `.codex-runtime/`. It disables real email. Set a private `OWNER_SETUP_TOKEN` of at least 32 characters before first-owner setup at `/admin`. A local encryption key is generated and retained under `.codex-runtime/security/`; do not delete it while keeping the database. Production requires an explicit PostgreSQL connection and encryption key.

The repository’s `.env` is not automatically loaded. Supply process environment variables or your IDE’s run configuration. See `.env.example` for supported settings.

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
- `frontend/src/styles/index.css`: active stylesheet entrypoint. Older stylesheet files remain archived in place and are not loaded by the new studio shell.
- `frontend/public/models` and `renders`: original GLBs, responsive WebP images, PNG fallbacks and deferred MP4 films.
- `assets/blender`: editable scene sources and reproducible Blender/render/export scripts.
- `src/main/java/com/crystalpower/website`: API, validation, publishing, private storage, mail, owner authentication and repositories.
- `src/main/resources/db/migration` and `src/main/java/db/migration`: Flyway schema, legacy draft import and hosted-database access restrictions.
- `scripts/portfolio_backup.py`: private database/media backup, integrity verification and isolated restore.

The public routes remain `/`, `/about`, `/services`, `/portfolio`, `/portfolio/:slug`, `/support` and `/contact`. The birthday route and legacy redirects are retained. `/admin` manages projects; `/api/admin/**` requires MFA-authenticated owner access and CSRF for mutations. Only explicitly published revisions appear through `/api/projects` and public image routes.

Saving a draft does not change the published revision. Uploaded screenshots remain private until published, and the chosen cover is displayed on the real 3D device. Older sample projects are seeded as private drafts and need verified content before publication.

## Guides

- [Owner setup, publishing and recovery](docs/OWNER_STUDIO.md)
- [Free-plan deployment, configuration and backup/restore](docs/DEPLOYMENT.md)
- [Rebuild scope and delivery gates](docs/IMMERSIVE_REBUILD.md)
- [Verification record](docs/REBUILD_QA.md)
- [Blender source and export workflow](assets/blender/README.md)

No real provider accounts, domain changes or public deployment are implied by a local build. Review the verification record for the tested boundaries.
