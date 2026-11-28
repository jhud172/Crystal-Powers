# Publish a Crystal Docks Windows release

Before merging the Crystal Powers integration, confirm the **Verify Docks website release candidate** check passed for the current pull request merge commit. It builds and tests the packaged website, runs the Docks customer journey against disposable PostgreSQL, and checks the production-profile routes with the providers and download feed disabled. It runs without production credentials or a deployment.

Build the package with `packaging/Build-Msix.ps1` in the Crystal Docks repository and verify the Windows publisher signature and timestamp on the final bytes. Use the same package identity and publisher as the installed versions. Test the upgrade, history retention, scheduled checks and uninstall on a clean Windows 11 x64 pilot before offering the package.

Use the dedicated [Crystal Docks Downloads repository](https://github.com/jhud172/crystal-docks-downloads) for Windows release assets. It starts private with a README and has no source code. Stage the signed MSIX and its checksum in a draft release. Keep the build filename, such as `Crystal-Docks-1.2.3.0-win-x64-signed.msix`, and use the matching tag `v1.2.3.0`. Once the signed package passes clean-device acceptance and publication is authorised, make the downloads repository public and publish the draft. The source repository can stay private. The download URL is `https://github.com/jhud172/crystal-docks-downloads/releases/download/v1.2.3.0/Crystal-Docks-1.2.3.0-win-x64-signed.msix`.

The website also accepts files from the `docks-downloads` public bucket in its configured Supabase project. Check the project's upload limit before using it. The self-contained x64 preview was about 65.7 MB, above the Free project's 50 MB maximum. Keep customer files and private assets out of the download bucket. [Supabase Storage upload limits](https://supabase.com/docs/guides/storage/uploads/file-limits)

While the GitHub release is still a draft, verify the uploaded copy against the independent build record using an authenticated GitHub CLI with access to the downloads repository:

```powershell
.\packaging\Test-ReleaseMsix.ps1 -GitHubDraft -Version $releaseVersion -Publisher $releasePublisher -Sha256 $buildSha256
```

The check downloads the two draft assets, confirms the checksum file and verifies the signed MSIX. It leaves the repository and draft visibility as they were.

Before enabling the release feed, run `packaging/Test-ReleaseMsix.ps1` from the Windows repository on the downloaded file on a clean Windows 11 machine. Pass the digest, version and publisher from the release build record. It checks the download bytes, exact package identity, architecture, publisher and trusted timestamped signature.

Set `DOCKS_RELEASE_WINDOWS_X64_VERSION` to the four-part MSIX version, `DOCKS_RELEASE_WINDOWS_X64_URL` to the exact HTTPS asset URL, and `DOCKS_RELEASE_WINDOWS_X64_SHA256` to the verified digest of the signed package. The feed and redirect require all three settings. From a signed-out browser, confirm the feed returns the expected `version` and `sha256` and the matching `/{version}/download` route delivers a package that passes `Test-ReleaseMsix.ps1`. Compare with the build record independently of the feed.

Check the production routes from this website repository in PowerShell 7. The script checks public pages, report privacy, provider availability and the configured offer without using an account:

```powershell
.\scripts\verify-docks-public-routes.ps1 -Target Production -EmailEnabled -GoogleEnabled -Version $releaseVersion -Sha256 $buildSha256
```

From the desktop repository in PowerShell 7.4 or newer, run the hosted package check with the expected details from the build record:

```powershell
.\packaging\Test-ReleaseMsix.ps1 -Origin https://crystal-powers.com -Version $releaseVersion -Publisher $releasePublisher -Sha256 $buildSha256
```

Open `/docks` in a signed-out browser and check the version and Windows download link. The same page shows the release status with no download link when the feed is empty. Its app preview comes from the Windows smoke test with example data. The reports link opens the separate account area.

Desktop users choose when to check and whether to open the browser. Windows handles the signed package installation. To withdraw an offer, clear the environment settings. If a faulty release has already been installed, publish a corrected package with a higher version and the same publisher.

## Monitor the release

Rerun the production route check after a provider setting or release-feed change. In **Owner Studio > Account security > Crystal Docks release configuration**, confirm the sign-in methods, number of checkout plans, portal availability and listed Windows version. Check **Crystal Docks payment review** for delivery retries or payment reviews, and match the event references in Stripe before retrying a delivery.

If new live purchases need to stop, set `DOCKS_STRIPE_LIVE_CHECKOUT_ENABLED=false` on the website and verify the owner panel reports zero checkout plans. Keep the live Stripe integration active so existing customers retain paid repair access, renewals and the portal. Previously issued Checkout links can still work until Stripe expires them.

For an installer issue, clear the release-feed settings and verify the feed is empty. Keep the existing signed build record and publish a higher version with the same publisher when the fix passes the Windows pilot.

## Main-domain account and release cutover

The product and release status are served at `/projects/docks`. The original `/docks` entry remains compatible. The legacy reports entry at `/docks/reports` opens `/account/dashboard/docks` and preserves Google and Stripe return query values. Support stays at `/docks/support` for the desktop app. The release feed remains under `/api/docks/releases/windows-x64`.

The signed-in product dashboard has Crystal Powers, Crystal Docks and CrystalHub sections. CrystalHub is an informational placeholder. A customer connects an existing invited Crystal Powers client account by verifying its credentials from an authenticated browser Docks session. The two accounts link one-to-one. A desktop Docks token cannot open that client workspace. Removing the link, revoking the Docks session, changing the client credentials or suspending the account ends access granted by the link. The original client sign-in remains available.

Before deployment, review the exact integration revision and the production migration history. The pilot's original V87–V109 files retain their identities. V111 adds the browser-session marker and V112 creates and protects the account-link table. Do not apply this revision to any database where the website-only V87 already ran. Back up the hosted database and private media with the matching encryption key and retain the confirmed predecessor. The backup inventory now covers Docks tables and the support audit ordering sequence.

Use production Google and Stripe credentials configured for `https://crystal-powers.com`. Verify the Google callback on the main domain, a controlled email sign-in, the approved checkout price and webhook configuration, and the account-link scope. Preserve the pilot until the main domain and the signed Windows update are verified. Sandbox subscriptions, pilot sign-in tokens and synthetic records belong to the pilot environment. Do not copy the pilot database into production.

Keep the download feed empty until the trusted Windows release and its laptop verification are complete. Use the signed package and exact digest described above. Then replay the public download, legacy links, Windows device sign-in, a private report, the client workspace link and sign-out before retiring the separate pilot.
