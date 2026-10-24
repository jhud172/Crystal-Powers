# 20 - Deployment And Build

## Purpose

Use for Vite build, Gradle packaging, Docker, Render, environment variables, frontend/backend integration, and production hosting.

## Current Flow

- Vite builds `frontend/dist`.
- Gradle copies `frontend/dist` into Spring static resources during `processResources`.
- Spring Boot serves the built React app and APIs from one deployment.
- Vite dev and preview servers proxy `/api` to `http://127.0.0.1:8080`. Built preview8084 requires the running backend; `prepreview` checks real health/projects JSON. Explicit UI-only QA may set `CRYSTAL_FRONTEND_ONLY=1`.
- Docker builds frontend first, then packages Spring Boot with static assets.

## Rules

- Preserve production API paths.
- Preserve SPA fallback.
- Keep development URLs out of production code.
- Keep builds reproducible.
- Use Windows-compatible commands in docs when appropriate.
- Do not commit secrets.
- Do not assume local-only paths or ports.
- Consider static asset caching when touching deployment config.

## Validation

Use `npm run build`, `.\gradlew.bat test`, and `.\gradlew.bat bootJar` when build/deployment files change. Report skipped commands.

