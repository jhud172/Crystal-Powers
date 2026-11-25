# Crystal Docks report retention

The reports page stores one manually shared summary per enrolled device. The summary is available to its owner for 30 days from the check time. The page hides expired rows immediately. The server attempts to purge up to 500 expired rows every five minutes.

Each shared summary can be downloaded as JSON with its device label, check time and CPU and memory readings. The browser creates that file from the displayed summary. **Delete summary** removes only the displayed version for that device, and ends any active summary support grant. Other devices and the sharing preference remain available.

**Delete uploaded summaries** clears all of the signed-in account's website summaries and keeps their sharing preference. **Turn off sharing and delete reports** also withdraws permission for future uploads. Desktop history stays on the computer and has its own **Clear saved checks** control.

Deploy Flyway migration `V96__docks_report_retention.sql` with this integration. On staging, use two test accounts to confirm that deletion is scoped to the authorised account. Confirm that rows older than 30 days are hidden before the background job runs, removed when it runs and rejected on upload. Confirm that a newer upload remains available during expiry cleanup.

## Support access

After uploading a summary, the customer can grant support access for one hour and share the generated reference. The signed-in owner uses **Account security → Crystal Docks support reports and logs** and enters that reference. The viewer returns the customer's active summaries, and each successful read is recorded in the customer's support activity. Customers can revoke access at any time. Clearing summaries or disabling sharing also revokes summary access.

Deploy migration `V97__docks_report_support_access.sql`. The expiry job removes expired grants and support audit events older than 90 days. Verify the complete customer-to-owner flow on staging with two real test accounts and a test owner session.

## Diagnostic research

Diagnostic research has its own consent and uses a manual contribution from the Windows app. Each contribution contains the processor and memory ranges only. The server keeps the latest contribution per account for 30 days from submission. Turning research off deletes it and preserves the separate report preference.

The owner view shows separate processor and memory distributions as group totals once at least five accounts have a current contribution. Deploy migration `V98__docks_diagnostic_research.sql` and verify report consent, research consent, expiry and withdrawal against PostgreSQL on staging.

## Diagnostic logs

Customers choose a recent scan in the Windows app and review the timestamp, processor and memory usage, battery charge, logical processor count, free system storage, startup and installation counts, and overall physical drive status. Only these readings and the enrolment needed to verify device ownership are submitted after approval. Raw Windows event logs, filenames and the names of drives, software and processes stay on the computer.

One diagnostic log per account can be shared at a time. A new upload replaces the old log and reference. Support needs the reference and an authenticated owner session. The customer can see the log's expiry and read activity, or use **Delete log and end access** in reports. The server blocks reads once access expires or the upload is deleted. Device removal deletes that device's shared log. The same five-minute cleanup removes expired uploads. Log audit entries are scoped separately and kept for up to 90 days.

Flyway migration `V101__docks_diagnostic_log_sharing.sql` and the executable website passed against a disposable PostgreSQL 17 database. The smoke test created and revoked a log and checked the customer-visible audit. Browser fixtures exercised the customer and owner interfaces with a simulated API. Verify the full flow over HTTPS with a staging owner and two customer accounts before release.

## Account deletion

Customers can open **Account privacy** on the reports page and delete their Crystal Docks account. The server requires a session issued in the past ten minutes. An active subscription or unresolved checkout blocks deletion. Such accounts can use the Stripe portal or contact support to resolve billing. The operation checks the current Stripe state before accepting an expired checkout that had a provider session.

Deletion revokes all Docks sessions and removes enrolled devices, identity links, reports, logs, permissions and research contributions. Household members keep their own accounts and reports. Historical billing records remain in the billing systems. Docks detaches the account from terminal subscription records and clears their checkout links. Saved Windows history stays in the local profile. Clear it from **Advanced view → Clear saved checks** before deleting the account if desired.
