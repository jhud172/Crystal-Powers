# Temporary local Codex publisher

## Live recheck — 29 October 2026

Later checkpoint: assignment is now persisted via the normal owner UI. Live account/profile join confirms READ_CHANNELS, EDIT_PROJECTS and PUBLISH_PROJECTS only, archived=false, profile19dc1826-0873-4f2d-823c-cf4241459fa2 on accountb43ff2e4-176d-4415-8ec6-7c7f3f413855. The refreshed invitation preserves the profile; no email was sent. Private activation tab is open for user password/authenticator entry. Account remains INVITED/MFA off pending that handoff; no real Codex login/negative-authority checks yet. This supersedes the unassigned state below. Bootstrap cleanup remains completed.

The reported dialog OK did not persist the profile assignment: live role_profile_id remains null, state INVITED and MFA false. The separate role definition is correct (READ_CHANNELS, EDIT_PROJECTS, PUBLISH_PROJECTS only). The owner session has expired; resume normal sign-in and assign/verify before activation. No Codex password or MFA was generated/reset. Bootstrap token is disabled via a one-key Render merge and its obsolete local DPAPI/helper were removed. Cleanup deployment dep-dbhp6ejbc2fs73f29ng0 is live29 October18:42:09UTC;8checks pass,0failures and no new Render error logs. Do not alter the existing local account credentials/guard or infer live login from the saved role definition.

## Live invitation checkpoint — 28 October 2026

User explicitly confirmed live access with READ_CHANNELS, EDIT_PROJECTS and PUBLISH_PROJECTS. The owner UI saved the matching custom profile and created the separate jhud172@gmail.com invitation. It remains INVITED/unactivated with no password/MFA. Profile assignment is NOT complete: the site opened an access-change confirmation and browser control timed out; live role_profile_id is still null. User must confirm the dialog, then verify the profile before any activation. Do not mistake its ADMIN base role for the intended restricted effective permissions or activate it with default grants. No invitation email was sent, no secret is stored in documentation, and the local identity guard is unchanged. Bootstrap-token cleanup and live login acceptance remain pending.

## Authorised live Codex account preparation — 28 October 2026

Setup deployment verification,28 October11:55:25UTC: Render dep-dbgu445g1s2s73caec50 is live on50abb4f. Live health returns200/up, and the anonymous owner session reports setupAvailable=true/authenticated=false. No new Render error logs. The Windows-protected bootstrap token decrypts correctly for this user; the ignored copy helper parses successfully; both files are ignored and git diff --check passes. No new owner/team row or password was created. Browser tab control failed during the final refresh, so the user must refresh /admin, choose first-owner setup, copy/paste the protected token, use james@crystal-powers.com and complete their own password/MFA/recovery-code entry. Then remove OWNER_SETUP_TOKEN and its local protected copy, verify setupAvailable=false, and finish the separately authorised jhud172@gmail.com restricted publisher. Do not consider this the completion of the live Codex account or Clare publication.

James explicitly authorised a separate live Codex publisher using jhud172@gmail.com and approved james@crystal-powers.com for his protected owner. Read-only inspection of the actual Crystal Powers Supabase project huhweqykbumewoewlvxl found0 owner rows,0 workspaces and0 matching staff accounts. The65 migration head and the known25 October live enquiry establish that this is the actual application database. The live session endpoint reports setupAvailable=false. Earlier sign-in failures therefore did not establish a forgotten owner password: no owner had been provisioned. Correct the earlier assumption; no account/password/MFA was reset.

Prepared a cryptographically random bootstrap token, stored only in the server's OWNER_SETUP_TOKEN and Windows-user DPAPI encryption under ignored .codex-runtime/security/live-owner-setup.dpapi. Render's merge operation preserves all other environment variables and automatically triggered deploy dep-dbgu445g1s2s73caec50 from current main50abb4f. No account SQL writes, schema changes, default password, authentication bypass, local-to-production guard removal, provider email or new code deployment. The pending company-email source changes remain uncommitted/undeployed.

Next: confirm the deployment is live, open the existing first-owner form, prefill only the chosen owner email, and hand over password/MFA/recovery-code setup. The user can run the ignored Copy-LiveOwnerSetupToken.ps1 locally to copy the encrypted bootstrap token without printing it, or copy OWNER_SETUP_TOKEN from their Render environment settings. Do not read/store their new owner password, MFA secret or recovery codes. Then remove the server bootstrap token, confirm setup is unavailable, create the restricted Codex publisher through existing team invitation/role services, generate its own password and enrol normal MFA, protect its credentials locally, and publish Clare through existing authorised APIs. Codex access/removal must remain separate from the protected owner. No live Codex account exists yet.

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
