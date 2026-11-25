# Publish a Crystal Docks Windows release

Build the package with `packaging/Build-Msix.ps1` in the Crystal Docks repository and verify the Windows publisher signature and timestamp on the final bytes. Use the same package identity and publisher as the installed versions. Test the upgrade, history retention, scheduled checks and uninstall on a clean Windows 11 x64 pilot before offering the package.

Use the dedicated [Crystal Docks Downloads repository](https://github.com/jhud172/crystal-docks-downloads) for Windows release assets. It starts private with a README and has no source code. Stage the signed MSIX and its checksum in a draft release. Keep the build filename, such as `Crystal-Docks-1.2.3.0-win-x64-signed.msix`, and use the matching tag `v1.2.3.0`. Once the signed package passes clean-device acceptance and publication is authorised, make the downloads repository public and publish the draft. The source repository can stay private. The download URL is `https://github.com/jhud172/crystal-docks-downloads/releases/download/v1.2.3.0/Crystal-Docks-1.2.3.0-win-x64-signed.msix`.

The website also accepts files from the `docks-downloads` public bucket in its configured Supabase project. Check the project's upload limit before using it. The self-contained x64 preview was about 65.7 MB, above the Free project's 50 MB maximum. Keep customer files and private assets out of the download bucket. [Supabase Storage upload limits](https://supabase.com/docs/guides/storage/uploads/file-limits)

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
