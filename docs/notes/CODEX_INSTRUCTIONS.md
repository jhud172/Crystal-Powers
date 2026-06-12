# Codex Notes

When working in this repository:

- Treat `frontend/` as the only frontend source of truth.
- Treat Spring Boot as the API/backend and production host.
- Do not edit generated build output.
- Do not hardcode secrets.
- Keep changes scoped, readable, and production-oriented.
- Update README or docs when commands, structure, environment variables, or deployment behaviour changes.

Recommended checks:

```powershell
cd frontend
npm run build
```

```powershell
cd ..
.\gradlew.bat test
.\gradlew.bat bootJar
```
