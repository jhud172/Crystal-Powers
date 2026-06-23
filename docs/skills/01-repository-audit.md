# 01 - Repository Audit

## Purpose

Use when auditing, onboarding, reviewing risk, or preparing significant changes.

## Inspect

- Project structure: `frontend/`, `src/`, `docs/`, Gradle files.
- Dependencies: `frontend/package.json`, lockfile, Gradle dependencies.
- Routes: `frontend/src/app/App.tsx`, `src/main/java/com/crystalpower/website/web/`.
- APIs: `src/main/java/com/crystalpower/website/api/`.
- Shared types/data: `frontend/src/types/`, `frontend/src/data/`, feature data files.
- CSS ownership: `frontend/src/styles/`.
- Component ownership: `frontend/src/components/`, `frontend/src/features/`, `frontend/src/routes/`.
- Build and test scripts: `frontend/package.json`, `build.gradle`, `build.ps1`, `Dockerfile`.
- Documentation mismatches.

## Detect

- Dead code and duplicate code.
- Unused exports and placeholder components.
- Stale assets and generated files in source directories.
- Old branding.
- Circular imports and broken aliases.
- Bundle sizes and warnings.

## Classification

Separate findings into:

- Pre-existing issues.
- Issues introduced by the current task.
- Acceptable warnings.
- Blocking failures.

## Validation

Run relevant scripts only. For frontend audits, use `npm run build` if dependencies already exist. For backend audits, use `.\gradlew.bat test`; set `SKIP_FRONTEND_BUILD=1` when dependency installation must be avoided.

## Reporting

Include evidence, file paths, current warnings, bundle sizes, failures, and recommended next actions. Do not fix audit findings unless the task asks for fixes.

