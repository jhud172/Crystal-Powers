# Crystal Docks report retention

The reports page stores one manually shared summary per enrolled device. The summary is available to its owner for 30 days from the check time. The page hides expired rows immediately. The server attempts to purge up to 500 expired rows every five minutes.

**Delete uploaded summaries** clears all of the signed-in account's website summaries and keeps their sharing preference. **Turn off sharing and delete reports** also withdraws permission for future uploads. Desktop history stays on the computer and has its own **Clear saved checks** control.

Deploy Flyway migration `V96__docks_report_retention.sql` with this integration. On staging, use two test accounts to confirm that deletion is scoped to the authorised account. Confirm that rows older than 30 days are hidden before the background job runs, removed when it runs and rejected on upload. Confirm that a newer upload remains available during expiry cleanup.

## Support access

After uploading a summary, the customer can grant support access for one hour and share the generated reference. The signed-in owner uses **Account security → Crystal Docks support reports** and enters that reference. The viewer returns only the customer's active summaries, and each successful read is recorded in the customer's support activity. Customers can revoke access at any time. Clearing summaries or disabling sharing also revokes access.

Deploy migration `V97__docks_report_support_access.sql`. The expiry job removes expired grants and support audit events older than 90 days. Verify the complete customer-to-owner flow on staging with two real test accounts and a test owner session.

## Diagnostic research

Diagnostic research has its own consent and uses a manual contribution from the Windows app. Each contribution contains the processor and memory ranges only. The server keeps the latest contribution per account for 30 days from submission. Turning research off deletes it and preserves the separate report preference.

The owner view shows separate processor and memory distributions as group totals once at least five accounts have a current contribution. Deploy migration `V98__docks_diagnostic_research.sql` and verify report consent, research consent, expiry and withdrawal against PostgreSQL on staging.
