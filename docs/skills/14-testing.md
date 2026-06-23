# 14 - Testing

## Purpose

Use whenever behaviour changes or a task asks for verification.

## Frontend Areas

- Component behaviour.
- Route rendering.
- Interactions.
- Responsive behaviour.
- Reduced motion.
- Keyboard behaviour.
- Form states.
- API failures.

## Backend Areas

- Controller tests.
- Service tests.
- Validation tests.
- Upload tests.
- Redirect tests.
- SPA fallback tests.

## Rules

- Test changed behaviour.
- Do not invent unrelated tests.
- Distinguish unit, integration, and visual QA.
- Report untested areas.
- Never claim success when tests fail.

## Commands

- Frontend: `cd frontend; npm run build`.
- Backend: `.\gradlew.bat test`.
- Use `SKIP_FRONTEND_BUILD=1` for backend-only verification when dependency installation must be avoided.

