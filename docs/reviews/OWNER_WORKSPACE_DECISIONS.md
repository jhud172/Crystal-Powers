# Owner workspace decisions for Crystal Powers 2.0

Decision date: 10 October 2026. These decisions accompany the working audit; they do not certify the full owner studio or release.

## Autosave evaluation — EDIT-09

**Keep explicit Save draft as the initial 2.0 default.** Preview, typing, image selection, viewport/theme changes, restored connectivity and reauthentication must never create a revision automatically. Saving remains separate from publishing. The toolbar identifies unsaved changes and saved/public revisions; navigation, reload and tab-close protection explain potential loss. A failed save retains the current edits and does not claim completion.

This follows the current API and observed workflow. Every successful `PUT /api/admin/projects/{id}` creates an immutable revision. It checks `expectedVersion` under a database lock and returns 409 for a competing draft. An autosave on each edit would inflate history; a debounced request through the present busy fieldset would also interrupt typing. Supporting continuous editing needs separate saved, submitted and current snapshots. Silently replaying an interrupted request or session-expired action would contradict the deliberate retry behaviour now verified.

### Defined behaviour for any future opt-in implementation

| Concern | Required behaviour |
| --- | --- |
| Concurrency | Submit the version associated with the submitted snapshot. Preserve edits made after submission. Accept the returned version only for that snapshot; do not replace newer typed content. Stop on 409, retain local edits and ask for a deliberate reconciliation/reload. No last-writer-wins overwrite. |
| Debounce | An explicitly enabled mode could wait 1.5 seconds after the final change and after text composition ends. Only one request may be in flight. Queue the latest snapshot, rather than one request per keystroke. Do not send if the snapshot matches the saved draft. |
| Network failure | Distinguish unconfirmed delivery from a confirmed save. Keep an unsaved/error status and explicit retry; do not automatically replay on network restoration. Reconcile the server head before any repeat request because an interrupted response might have followed a committed revision. |
| Session expiry | Pause on 401/expired-CSRF, preserve the tab’s edits and open the deliberate sign-in flow. Reauthentication does not resume a background write; the owner reviews and retries. |
| Revision history | Define a bounded/coalesced autosave history separately from explicit named saves before enabling the feature. Preserve published pointers and restorations. The current immutable-per-save contract must not be quietly weakened. |
| Uploads | Upload remains an explicit file choice with server validation and ownership. Saving an assigned image is separate from uploading a file. Never upload or select a file again automatically after a failed/expired request. |
| Publishing | Only a saved, reviewed revision with fresh permission acknowledgement may publish. Autosave never publishes, unpublishes, archives or restores. |
| Privacy | Keep private draft state in the signed-in tab. No local/session storage, URL payload, external autosave service or persistent client cache. |
| Accessibility | Save status must distinguish saving/saved/unsaved/unconfirmed/conflict without repetitive per-keystroke announcements. Explicit Save remains keyboard accessible. In-flight background saves must not disable the text field or steal focus. |
| Exit | Warn when the current snapshot is not confirmed saved, including when a request is pending. Cancelling an exit preserves the editor; choosing to leave is explicit. |

The future mode needs API/history and reconciliation work plus meaningful concurrent, dropped-response, composition, ongoing-typing, expired-session and exit checks. It is **not enabled or claimed as delivered** in 2.0. No new dependency, storage or migration is introduced by this evaluation.

Current-default evidence: source `ProjectEditor.tsx` invokes save only from the explicit Save action; `verify-workspace-browser.cjs` covers save failures, conflicts, retained edits and revision/publication separation. `verify-session-browser.cjs` and the actual `session-server-journey.cjs` prove no write replay after sign-in. `verify-preview-browser.cjs` checks unsaved content and zero writes while changing preview sizes, palettes and gallery/device views. Actual packaged portfolio QA separately checks saved/public revision boundaries and explicit retries. Reports are ignored under `.codex-runtime/qa/`; these are local browser/server checks, not hosted or physical acceptance.

## Authenticator QR and copy evaluation — AUTH-05

**Keep the manual setup key and add user-triggered local copying for 2.0.** `AuthenticatorKey.tsx` shows the account, time-based key type, six digits, 30-second interval and SHA1 algorithm. Copying uses the browser clipboard only after the owner clicks; denial or an unavailable API leaves the selectable manual key with a clear fallback. Its confirmation reminds the owner to clear their clipboard. Keys never enter browser storage, analytics, screenshots or QA reports; successful enrolment/confirmation removes them from the screen.

The backend already returns an `otpauth` URI for first enrolment. A locally generated QR could make mobile enrolment easier, but neither the existing frontend nor backend dependencies contain a QR renderer. The repository requires explicit authorisation before introducing a dependency. An external QR endpoint would disclose the secret, and a hand-written QR encoder would add unnecessary security-sensitive maintenance. No QR is generated, no QR service is contacted and no new dependency is installed. This completes the requested **evaluation**, rather than claiming a QR feature was delivered. A future authorised local library must be checked for maintenance/licensing, correct URI encoding, scanning on actual authenticator apps, private-only rendering and clearance on completion/cancellation.

`AuthenticatorCode.tsx` accepts authenticator digits and complete alphanumeric recovery codes without a numeric-only keyboard. Exactly six grouped digits are normalised, including leading zeroes; recovery code letters remain intact. New-device confirmation has a numeric six-digit field because recovery codes cannot confirm a new secret. `OwnerSettings.tsx` provides an authenticated, CSRF-protected cancel/restart path for its five-minute pending setup. The existing authenticator stays active until a new one is confirmed; cancellation does not undo an already-consumed verification code.

Evidence: real isolated security QA checks denied/successful copy without retaining key values, grouped real TOTP/leading zeroes, alphanumeric recovery/reset, cancellation/restart, old-device rejection on a fresh time step and successful new-device verification. Backend tests separately protect owner/CSRF requirements and unchanged credentials after cancellation. Physical scanning and hosted owner acceptance remain release checks.

## Private-state navigation

The existing React Router dependency now uses its data-router API to block native Back/Forward as well as React links. `app/NavigationProtection.tsx` owns one shared blocker and native refresh/tab-close protection. Editor dirty-state and unacknowledged one-time-code flows register short-lived guards; no draft, code or credential is persisted. A single blocker avoids competing listeners when reauthentication is open. Accepted session discard unmounts private state synchronously before navigating, avoiding a second discard prompt. Hash-only chapter navigation remains usable, and reset-link stripping preserves the router's history state/index.

Labelled navigation fixtures check cancelled/repeated Back, cancelled/confirmed Forward, saved Back/Forward, public links, native refresh, code acknowledgement, preserved/discarded edits, reset history and absence of blocker warnings. Existing public/enquiry/session/owner/editor/preview journeys are checked separately after the router change. This is local browser evidence, not physical-device or screen-reader certification.
