# Project Instructions

## Project Identity

The public-facing brand name is **Crystal Powers**.

Avoid using these names in public-facing website copy:

- Crystal Production
- Crystal Production LTD
- Crystal Productions
- Crystal Productions LTD
- Crystal Power
- CrystalProduction
- CrystalProductions

Only use company/legal wording if it is needed for a legal, invoice, contract, company-registration, or compliance section.

## Architecture

This project is a React frontend with a Spring Boot backend.

- React/Vite/Tailwind owns the public website UI.
- Spring Boot owns API routes, validation, upload checks, and email delivery.
- Spring Boot serves the built React app in production.

Do not reintroduce Thymeleaf templates or a second frontend pipeline.

## Development Rules

- Put public UI code under `frontend/`.
- Put backend API code under `src/main/java/com/crystalpower/website/`.
- Keep credentials out of source control.
- Keep generated output such as `frontend/dist`, `node_modules`, `build`, and `target` ignored.
- Preserve British English in public-facing website copy.

## Verification

After meaningful changes, run:

```powershell
cd frontend
npm run build
```

```powershell
cd ..
.\gradlew.bat test
.\gradlew.bat bootJar
```
