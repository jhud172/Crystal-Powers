# Agent reference — Crystal Powers

Updated: 9 October 2026. Read `AGENTS.md`, `docs/skills/README.md` and mandatory/task-specific skills before changes. The working 2.0 checklist is `CRYSTAL_POWERS_2_0_AUDIT.md`; current progress and verification limits are in `CRYSTAL_POWERS_2_0_PROGRESS.md`. June content/memory/audit notes are historical.

## Current application

React/Vite/TypeScript owns public routes and the owner interface. Spring Boot owns inquiry validation/uploads/email, protected owner/project/media APIs, publication, metadata, security, SPA hosting and legacy redirects. Active public styling imports `studio-base.css`, `studio.css`, `admin.css`, `studio-interiors.css` and `studio-tokens.css`. Earlier page CSS and `CrystalOpenerScene.tsx` are not the live experience.

Active WebGL is under `frontend/src/features/experience/`; original models/renders live under `assets/blender/` and `frontend/public/models/` / `renders/`. One stage is active at a time. Scenes load only after activation, pause offscreen/when hidden and retain rendered fallback. The Reduce effects preference removes film/WebGL and decorative motion. The system motion preference remains independent and is always respected.

Shared navigation is Work / Services / Studio / Support / Contact. The brand link returns Home. Existing route URLs, `/home`, special birthday route, `.html` redirects, cookie IDs and all five theme IDs are retained. `Layout.tsx` owns the shared appearance/effects controls, route focus, header and footer. The birthday route bypasses it.

Project data and publication use `features/portfolio/projectApi.ts`, backend DTO/service/repository packages and guarded media routes. Owner components are in `features/admin/`; credentials, CSRF, MFA, revisions and draft/public separation must be preserved. Private media must never be exposed through an anonymous draft preview.

## Change rules

- Use British English and Crystal Powers in public copy. Do not invent project evidence, clients, metrics, portraits or commercial policies.
- Preserve backend contracts/security, upload limits, delivery handling, SPA/legacy routing, theme persistence and generated-asset boundaries. Checklist contract changes require server/client implementation and relevant compatibility/security tests together.
- No new dependency installation without James’s explicit authority. The 9 October request authorises restoring the existing frontend lockfile with `npm ci`; it is not blanket approval for new packages or major upgrades.
- Keep CSS under `frontend/src/styles/`. Use semantic tokens and maintain visible focus/reduced motion. Keep essential content available if effects fail.
- Use strict types. Run the installed TypeScript compiler through `npm run build`; do not dismiss compiler failures as false positives. No frontend lint or test script currently exists.
- Avoid React state for per-frame pointer/animation values. Clean up listeners, timers, observers, films, canvas resources and animation actions.
- Inspect imports before removing legacy files. Do not modify `.github/agents/`.
- Never print/commit secrets or publish synthetic QA owner/project data. Existing live Render deployment tracks `main`; merging/pushing there may deploy. Read `DEPLOYMENT.md` before any provider action.

## Verification

Frontend: `npm --prefix frontend run build` (type check and Vite production build). Backend: set `SKIP_FRONTEND_BUILD=1`, then `.\gradlew.bat test`. Do not run `build.ps1` just for verification: it installs dependencies.

The 9 October frontend build passes; the Three vendor chunk remains oversized. Backend tests currently fail before execution because Java cannot establish a loopback selector connection; treat them as unavailable, not passed. `npm audit` reports eight existing build-tool findings. See progress documentation for exact evidence and skipped checks. Responsive browser checks are not physical-device frame-rate certification; local mocked delivery is not real provider receipt.

## Development-only visual drafts

`frontend/design/observatory.html` previews Homepage, Services builder and Case study using shared tokens and existing pricing data. It is not a public route or a completed production redesign. Restart Vite on port 5175 and open `/design/observatory.html` to review it. Case-study artwork is an original studio demonstration, not published client content.
