# Crystal Docks report retention

The reports page stores one manually shared summary per enrolled device. The summary is available to its owner for 30 days from the check time. The page hides expired rows immediately. The server attempts to purge up to 500 expired rows every five minutes.

**Delete uploaded summaries** clears all of the signed-in account's website summaries and keeps their sharing preference. **Turn off sharing and delete reports** also withdraws permission for future uploads. Desktop history stays on the computer and has its own **Clear saved checks** control.

Deploy Flyway migration `V96__docks_report_retention.sql` with this integration. On staging, use two test accounts to confirm that deletion is scoped to the authorised account. Confirm that rows older than 30 days are hidden before the background job runs, removed when it runs and rejected on upload. Confirm that a newer upload remains available during expiry cleanup.
