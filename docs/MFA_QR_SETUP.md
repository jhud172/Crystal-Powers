# Authenticator QR setup

All existing MFA enrolment screens now show a locally generated QR code alongside the manual setup key: protected-owner first enrolment, owner authenticator replacement, team first enrolment and team authenticator replacement. This includes all staff roles using the shared team authentication flow. It does not introduce MFA into the currently password-only client flow or change which accounts require MFA.

Choose **Scan a QR code** in an authenticator, scan the displayed code, then enter its six-digit code in Crystal Powers. If scanning is unavailable, use **Enter a setup key** and the existing copy button. Confirm the authenticator and save owner recovery codes privately where offered. A normal later MFA sign-in requests a code; it does not expose the setup QR again.

The `otpauth://totp` payload uses issuer/account Crystal Powers, SHA1, six digits and a30-second interval, matching the existing verifier. `qrcode-generator`2.0.4 creates the matrix in the private frontend component. React renders the modules as an SVG with a four-module quiet zone and fixed black/white contrast, including forced-colour appearances. No remote QR image service, third-party request, browser navigation, local/session storage, analytics event or server-side QR endpoint receives the secret. No `dangerouslySetInnerHTML` is used. Invalid/failed QR generation retains the manual-key path. The secret and QR are private credentials; do not save real enrolment screenshots to Git or test reports.

No password, authenticator seed, algorithm, challenge expiry, CSRF, account permission, verification/recovery behaviour or existing MFA enrolment is changed. A deployment restarts disposable server sessions; if an in-progress challenge expires, sign in normally to resume enrolment of the saved account. Do not create another owner or reset its authenticator merely to refresh the QR.

## Verification — 28 October 2026

- Production frontend build and offline bootJar pass. npm dependency installation/audit reports0 vulnerabilities. The existing deferred Three.js chunk warning remains.
- `scripts/verify-mfa-qr-browser.cjs` passes167 assertions with public synthetic keys only, covering owner/team enrolment at320/390/768/1440px, independent jsQR decoding, exact TOTP parameters, manual fallback, no storage/network disclosure, invalid-key fallback and zero runtime errors. `jsqr`1.4.0 is a development-only decoder, not shipped application code.
- Independently decode the eight actual browser PNG screenshots at their rendered sizes:8/8 correct. Evidence is under ignored `.codex-runtime/qa/mfa-qr/`, including `native-pixel-report.json`.
- Existing owner sign-in/recovery/security41, team sign-in79 and team account-security137 assertions pass. The latter includes staged authenticator replacement, cancellation and confirmation. An old appearance test incorrectly toggled the now-persistent appearance menu closed; scope the theme controls and explicitly close after checking all five appearances. Keep all original assertions. One initial team run rejected the8083 QA port; use its existing allowed18084 port without widening guards.
- No new backend behaviour/schema changed. The pending department-email Java/configuration changes are unrelated and remain outside the QR deployment. No real enrolment seed/password/code was read or used in these tests, and no account/password/MFA verification was performed on behalf of the owner.

Run local synthetic browser checks against an explicitly labelled frontend-only preview using the installed Playwright/Edge paths. Team verifiers accept8084/18084; the owner/QR verifier also accepts8083. Actual live authenticator scanning and confirmation remain user actions.
