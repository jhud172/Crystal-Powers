# 10 - Spring Boot Architecture

## Purpose

Use for backend work under `src/main/java/com/crystalpower/website/`.

## Rules

- Controllers handle HTTP concerns.
- Services handle business logic.
- DTOs define request/response contracts.
- Validation annotations stay on DTOs.
- Repositories handle persistence if persistence is introduced.
- Avoid business logic in controllers.
- Avoid direct repository calls from controllers unless intentionally established.
- Use constructor injection.
- Handle errors explicitly.
- Preserve SPA fallback and legacy redirects.
- Preserve production frontend serving.
- Do not add frameworks or rename packages without explicit request.

## Validation

Run relevant backend tests. For public route or API changes, test controllers, validation, redirects, and SPA fallback.

