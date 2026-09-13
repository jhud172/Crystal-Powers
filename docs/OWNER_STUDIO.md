# Owner studio

Open `/admin` on the deployed website. The owner studio is part of the application; publishing does not need a code change or deployment.

## First use

1. Configure `OWNER_SETUP_TOKEN` as a unique random value of at least 32 characters in the server's environment. Keep it private.
2. Visit `/admin`, enter the setup token, your email and a unique password of at least 12 characters (maximum 72 UTF-8 bytes).
3. Add the displayed secret to an authenticator using time-based, six-digit codes. Enter the current code to finish setup.
4. Save the ten recovery codes in your password manager. They are displayed once and each can be used once.
5. Remove `OWNER_SETUP_TOKEN` from the deployed environment once setup is complete. The database also prevents creating a second owner.

Passwords alone cannot open the project editor. The application requires the authenticator or a recovery code. Do not share setup secrets, authenticator secrets or recovery codes in project content or screenshots.

## Publish a project

1. Choose **New project**. Set the title and a permanent, lowercase project address such as `my-new-website`.
2. In **Details**, choose Website, App or System and the laptop, desktop monitor or phone display. Add the introduction, optional HTTPS live-site address and technologies.
3. In **Images**, upload a PNG, JPEG or WebP screenshot. Choose the cover and add a meaningful description. The cover also appears on the interactive 3D device. Gallery images have their own descriptions and order.
4. In **Story**, explain the idea, approach and outcome. Include only work and claims you have permission to share.
5. **Save draft**, then inspect **Preview**. Preview can show unsaved edits and uses protected images.
6. Select **Publish project**. Visitors see the published revision within 30 seconds. Feature the project to show it on the homepage; lower order numbers appear first.

Uploading a screenshot does not fetch or embed the linked website. This keeps the editor independent of third-party framing restrictions and avoids server-side fetching of arbitrary addresses.

## Drafts, history and removal

- Saving a draft preserves the current public version until you publish again.
- **History** lists every saved revision. Restoring creates a new private draft and preserves the previous versions.
- **Unpublish** removes public access while retaining drafts and images.
- **Archive** hides a project and moves it to the archived list. Restoring an archived project makes its previous published version visible again if it still has one. Unpublish first if it should remain private.
- Concurrent edits are rejected rather than overwriting a newer draft. Reload the saved draft when warned. Reloading replaces unsaved edits after confirmation.
- If your session expires, the editor keeps unsaved content in the open tab while you sign in again. Closing or reloading the tab loses unsaved edits.

The six older portfolio entries are imported as private drafts. They need genuine screenshots and a review of all claims before publishing.

## Images and storage

Uploads are limited to 12 MB, 16 megapixels, 8,192 pixels per side and 40 images per project. Accepted images are decoded, resized to at most 2,560 pixels on the longest side and re-encoded to JPEG with metadata removed. The output limit is 5 MB per image; the application stops new uploads at 850 MB total.

Images referenced by historical revisions are retained for recovery. There is deliberately no permanent image deletion in the editor. Review the backup manifest and storage usage before manually removing any unused objects; do not remove an object merely because it is absent from the current draft. A saved historical or public revision may still need it.

## Account recovery

**Forgot password** sends a short-lived recovery link to the owner email. Completing the reset also requires a current authenticator code or an unused recovery code. Unknown email addresses receive the same on-screen response. The token expires after 15 minutes and can be used once.

In **Account security**, changing the password, replacing the authenticator or generating new recovery codes requires your current password and a fresh second factor. Replacing the authenticator keeps the old one active until the replacement is verified. Credential changes end existing sessions.

If both the authenticator and every recovery code are lost, there is no public bypass. Use a separately verified operator recovery process with your database backup and deployment access. Retain `APP_ENCRYPTION_KEY` securely: restoring the database without its matching encryption key cannot recover the encrypted authenticator secret.

## Operational limits

The single-instance server uses in-memory sessions and bounded, in-memory attempt limits. A server restart signs users out and resets rate-limit windows. Limits are not a substitute for provider quotas or an edge abuse-control service. Enquiries are capped at 15 per peer address per hour, five per email per hour and 60 per server day window. Reverse proxies may group visitors under one peer address; forwarded headers are not trusted by the application.

The local profile disables email delivery and uses private local storage. A local success in a mocked transport test is not evidence of real email delivery. Verify delivery on the configured production domain before accepting enquiries.

Save changes before using browser Back/Forward: browser-history navigation inside the app is not blocked. Navigation links and leaving/reloading the page warn about unsaved work.
