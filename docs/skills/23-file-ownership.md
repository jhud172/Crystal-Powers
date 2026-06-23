# 23 - File Ownership

## Purpose

Use before adding, moving, or editing files.

## Ownership Map

- App shell/routing: `frontend/src/app/`.
- Layout/nav/footer/theme lifecycle: `frontend/src/app/Layout.tsx`.
- Route pages: `frontend/src/routes/`.
- Generic components: `frontend/src/components/`.
- Feature components/data: `frontend/src/features/`.
- Hooks: `frontend/src/hooks/`.
- Pure utilities: `frontend/src/lib/`.
- Shared types: `frontend/src/types/`.
- Shared data: `frontend/src/data/`.
- Styles: `frontend/src/styles/`.
- Three.js hero: `frontend/src/components/hero/CrystalOpenerScene.tsx`.
- Backend controllers: `src/main/java/com/crystalpower/website/api/` and `web/`.
- Backend DTOs: `src/main/java/com/crystalpower/website/dto/`.
- Backend services/validation/email: `src/main/java/com/crystalpower/website/service/`.
- Documentation: `docs/`.

## Decision Tree

1. Is it a public route? Put it in `frontend/src/routes/`.
2. Is it reusable across routes? Put it in `frontend/src/components/`.
3. Is it specific to one feature? Put it in `frontend/src/features/{feature}/`.
4. Is it reusable React state logic? Put it in `frontend/src/hooks/`.
5. Is it pure non-React logic? Put it in `frontend/src/lib/`.
6. Is it shared TypeScript shape? Put it in `frontend/src/types/`.
7. Is it backend HTTP handling? Put it in a controller.
8. Is it backend business logic? Put it in a service.
9. Is it styling? Put it under `frontend/src/styles/`.
10. Is it project guidance? Put it under `docs/`.

## Validation

Check imports, ownership boundaries, and whether a suitable existing file already exists before adding a new one.

