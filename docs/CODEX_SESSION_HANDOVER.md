# Codex session handover — immersive rebuild

Date: 13 September 2026. Branch: `James/immersive-rebuild`, based on upstream `6bfba8d`. Main and the existing live service are unchanged. All implementation changes remain reviewable in the working tree. Preserve pre-existing untracked `bin/` and `codex-bootrun-8080*.log` files.

The authorised goal is the complete immersive portfolio with original Blender assets and secure online owner publishing. Required dependency installation was explicitly authorised. Read `IMMERSIVE_REBUILD.md`, `REBUILD_QA.md`, `OWNER_STUDIO.md` and `DEPLOYMENT.md` before continuing.

## Ownership

React app/routes: `frontend/src/app/` and `routes/`. Active 3D: `features/experience/`. Owner editor: `features/admin/`. Public project contract: `features/portfolio/projectApi.ts`. Original assets: `assets/blender/`, with web outputs in `frontend/public/models/` and `renders/`.

Backend controllers, services, repository and security have separate packages. Flyway SQL lives in resources and the hosted-database protection migration in `src/main/java/db/migration/`. Local profile uses private `.codex-runtime` data and disabled mail; production requires PostgreSQL, private storage and real environment configuration.

## Verification and private state

Local QA evidence, synthetic owner, isolated PostgreSQL cluster and backup rehearsals are under ignored `.codex-runtime/`. Never publish them or print authentication material. The isolated test cluster uses port 55432; the user's PostgreSQL on 5432 is unrelated. PostgreSQL tests intentionally clear only their guarded `crystal_rebuild_test*` database.

## External gate

James selected Render **My Workspace** for read-only inspection. Existing Crystal Powers service `srv-d7giag77f7vs73bd36sg` uses paid Starter and auto-deploys main. No approval to alter that service, push/deploy, create accounts, transmit real email or change DNS has been inferred. Finish independent work, then request the precise account action required. Never claim local evidence proves public deployment or physical-handset performance.
