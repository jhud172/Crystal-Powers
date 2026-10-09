# Crystal Powers project structure

| Area | Active owner |
| --- | --- |
| Routes and application shell | `frontend/src/app/`, `frontend/src/routes/` |
| Navigation, themes and footer | `frontend/src/app/Layout.tsx` |
| Interactive Blender displays and motion | `frontend/src/features/experience/` |
| Owner authentication, editing and security | `frontend/src/features/admin/` |
| Public project data and presentation | `frontend/src/features/portfolio/` |
| Enquiry fields and feedback | `frontend/src/features/contact/` |
| Styling | `frontend/src/styles/base/studio-base.css`, `pages/studio.css`, `studio-interiors.css`, `admin.css` |
| Original editable 3D assets | `assets/blender/` |
| Web models, stills and films | `frontend/public/models/`, `frontend/public/renders/` |
| Backend HTTP contracts | `src/main/java/com/crystalpower/website/api/`, `web/` |
| Business logic, email and private storage | Backend `service/` |
| JDBC data access | Backend `repository/` |
| Owner authentication and session protection | Backend `security/` |
| Schema and initial private drafts | `src/main/resources/db/migration/` |
| Hosted PostgreSQL RLS migration | `src/main/java/db/migration/` |
| Backend security and contract tests | `src/test/` |
| Backup and guarded local restore | `scripts/portfolio_backup.py` |
| Deployment | `Dockerfile`, `render.yaml`, `.env.example` |
| Local private state / QA output | `.codex-runtime/` (ignored) |

Spring serves the compiled React application in production and preserves legacy redirects and extensionless SPA fallback. Vite on port 5173 proxies API requests to Spring on port 8080 during development. Gradle copies `frontend/dist` to generated static resources; do not edit those generated files.

There is no root npm package: use `npm --prefix frontend ...`. The README documents local startup and build commands. Inactive Thymeleaf templates, earlier CSS and `components/hero/CrystalOpenerScene.tsx` remain legacy source, not the active website. Do not edit them expecting public changes.

## 2.0 foundation continuation — 9 October 2026

`frontend/src/styles/base/studio-tokens.css` supplies semantic DOM palettes for all five themes and shared control/focus tokens. `hooks/useEffectsPreference.ts` persists only the Reduce effects boolean; `ExperienceProvider` shares it with the active stages. `frontend/design/observatory.html` is a separate development-only design entry for three representative compositions; it is not imported by the public route table or emitted by the normal production build. See `CRYSTAL_POWERS_2_0_PROGRESS.md` for current QA boundaries and next work.
