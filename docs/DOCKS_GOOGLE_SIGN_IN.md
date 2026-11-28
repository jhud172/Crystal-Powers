# Crystal Docks Google sign-in

Register a Google OAuth web application for the Crystal Docks staging or production HTTPS origin. Set `PUBLIC_URL` to that origin and configure `DOCKS_GOOGLE_CLIENT_ID` and `DOCKS_GOOGLE_CLIENT_SECRET` in the hosting secret settings. Add the exact redirect URI `<PUBLIC_URL>/api/docks/auth/google/callback` to the Google client. The flow uses the `openid` and `email` scopes.

Deploy Flyway migration `V99__docks_google_sign_in.sql`. The browser uses two short-lived cookies scoped to the Docks Google endpoints. The callback validates the browser binder, state and the Google ID token, including the nonce. The browser consumes its own ticket to create the existing Crystal Docks session. All expected origins must match the configured HTTPS origin.

Google identities are keyed by Google subject. On first sign-in, an authoritative and verified Gmail or Google Workspace address can reuse an existing verified email account. Google accounts with a third-party email address sign in to a separate Crystal Docks account.

For Windows, sign in through the browser, choose **Get a Windows sign-in code**, and paste it in the app with **Use a Windows code from the reports page** selected. The code expires after two minutes and is single use. The Windows app then enrols the device through the same endpoint as email sign-in.

On staging, exercise approval and cancellation in a real Google browser session. Verify separate browsers cannot complete each other's start requests, that both code types reject replay, and that signing in using an existing verified Gmail account preserves devices and entitlement. Verify Windows enrolment and email fallback before enabling production.
