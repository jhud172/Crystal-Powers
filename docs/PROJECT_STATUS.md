# Project Status

## Overview

Crystal Powers now uses a clean React + Spring Boot architecture.

- React/Vite/Tailwind is the only public frontend.
- Spring Boot provides JSON APIs and serves the production React build.
- Legacy Thymeleaf routing has been replaced by the React SPA. Inactive source templates still exist under `src/main/resources/templates/` and should be treated as deferred cleanup, not active public UI.

## Current Architecture

- Frontend source: `frontend/`
- Backend source: `src/main/java/com/crystalpower/website/`
- API controllers: `src/main/java/com/crystalpower/website/api/`
- Web forwarding/redirects: `src/main/java/com/crystalpower/website/web/`
- Backend services: `src/main/java/com/crystalpower/website/service/`
- Documentation: `docs/`

## Active Public Routes

- `/`
- `/about`
- `/services`
- `/portfolio`
- `/portfolio/:slug`
- `/support`
- `/contact`

## Active API Endpoints

- `POST /api/contact`
- `POST /api/services`

The services endpoint supports image/video uploads with file count, content type, and total size validation.

## Cleanup Status

- Old root npm/Tailwind build removed.
- Old Thymeleaf UI removed from active routing; inactive template files remain in source for audit/deferred cleanup.
- Duplicate Spring static frontend assets removed.
- Project notes moved under `docs/`.
- Gradle remains the production build orchestrator.
