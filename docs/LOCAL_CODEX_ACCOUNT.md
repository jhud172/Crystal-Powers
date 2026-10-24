# Temporary local Codex publisher

James authorised this account on 24 October 2026 so Codex can use the normal local team workflow without changing the protected owner.

- Sign-in route: `http://127.0.0.1:8084/team`.
- Identity: `codex@local.crystal.invalid`, displayed as **Codex (local only)**.
- Custom role: **Codex local publisher**, restricted to `READ_CHANNELS`, `EDIT_PROJECTS`, `PUBLISH_PROJECTS`. No owner, member administration, billing, support or upload-review grants.
- Authentication: a randomly generated password and ordinary authenticator MFA, using the existing team endpoints, session rotation, CSRF checks and audit trail. There is no automatic web sign-in or recovery bypass.
- Credentials: `.codex-runtime/security/codex-local.dpapi`, encrypted with Windows DPAPI for the current Windows user. Password, authenticator secret and session cookies must never be printed, committed or copied into documentation. Do not send them in chat.
- Runtime restriction: the reserved `@local.crystal.invalid` identities are denied unless the `local` profile, a file-backed H2 database, an explicit loopback bind and a loopback public origin are all present. Copied identities fail closed in production/PostgreSQL. The protected owner account and its MFA remain unchanged.

## Use

Keep the real local backend on8080 and frontend on8084 running, following README. From the repository root:

```powershell
node scripts/local/codex-session.cjs
```

This decrypts credentials only inside the process, signs in normally, verifies the exact grants and denied owner access, then signs out. It may wait up to31 seconds for a fresh authenticator step. `authenticate()` can be reused by local operator scripts; it returns an in-memory session rather than saving cookies. The account is bound to this workspace and Windows user; it is not a portable laptop login. Use the protected owner/team workflow on another machine.

The authorised Clare import is available as `node scripts/local/publish-clare.cjs --publish-local`. It verifies the approved asset hashes, saves/reviews real owned media and a revision, then publishes/features only that local project. Repeated runs reuse the same project and leave an existing publication untouched. This is an explicit local business write, not a test fixture or production deployment.

## Remove before release

Stop the local backend first so the saved H2 database is not open, then run:

```powershell
./scripts/manage-local-codex.ps1 -Mode remove
```

The offline operator uses the built JAR, backs up the closed database, suspends the account through the existing team service (revoking sessions) and removes the encrypted credential file. Audit history and Clare’s published project remain. Restart the backend afterwards. Removal intentionally does not delete business/audit rows or reset the owner. A suspended identity cannot be silently recreated by provisioning; further access requires explicit operator review.

Provisioning is an explicitly invoked, unbundled local operator tool: `./scripts/manage-local-codex.ps1 -Mode provision`, also with the backend stopped. It refuses to overwrite an existing credential or reset an existing account. No setup endpoint or bootstrap password is shipped. Never deploy local test databases, `.codex-runtime`, operator backups or credential files. Keep the production-denial guard and complete the separate production release checks.

## Verification — 24 October 2026

The normal password/MFA login succeeds with exactly three grants; the owner-project endpoint returns403. Real team UI opens Business projects and the published Clare project. Nine policy tests cover environment/binding/database/origin restrictions, normal-account compatibility and scalar/batch permission resolution. Public portfolio, case study, both real screenshots, device switches, direct reload and Home featuring pass33 real local browser assertions across1440/768/390px, without API mocks or browser runtime errors.

The final full backend batch passes272 tests in16 suites with0 failures/errors/skips. Offline packaging and162-file static inventory checks pass. The separate real local full-stack browser regression passes33 more assertions with1 published project. The removal operator compiles, but removal was intentionally not executed against the working account; it stays active for local development until explicitly removed. No production/provider/PostgreSQL release validation was performed here.
