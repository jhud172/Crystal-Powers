# 02 - Frontend Architecture

## Purpose

Use for React, routing, component, hook, data, and styling changes under `frontend/`.

## Ownership

- Generic components: `frontend/src/components/`.
- Feature-specific components: `frontend/src/features/`.
- Route components: `frontend/src/routes/`.
- Reusable hooks: `frontend/src/hooks/`.
- Pure utilities: `frontend/src/lib/`.
- Shared types: `frontend/src/types/`.
- Shared data: `frontend/src/data/` or the relevant feature directory.
- CSS: dedicated files under `frontend/src/styles/`.

## Rules

- Keep feature logic out of `Layout.tsx`.
- Avoid large route files; extract when readability suffers.
- Avoid global state unless the data is stable and shared.
- Preserve lazy-loading boundaries, especially for `CrystalOpenerScene.tsx`.
- Avoid circular imports.
- Do not import Three.js through generic barrel files.
- Do not create one global barrel that exports the entire frontend.

## Extract A Component When

- Markup repeats in more than one location.
- A route file becomes difficult to read.
- The component has independent state, behaviour, styling, or tests.

## Do Not Extract When

- The markup is tiny and one-off.
- The abstraction adds no clarity.
- The component is tightly coupled to one route.
- Extraction creates prop drilling without benefit.

## Validation

Run TypeScript/build checks when frontend source changes. Confirm routes still render and lazy chunks remain isolated.

