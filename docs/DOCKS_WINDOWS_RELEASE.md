# Publish a Crystal Docks Windows release

Build the package with `packaging/Build-Msix.ps1` in the Crystal Docks repository and verify the Windows publisher signature and timestamp on the final bytes. Use the same package identity and publisher as the installed versions. Test the upgrade, history retention, scheduled checks and uninstall on a clean Windows 11 x64 pilot before offering the package.

Upload the signed MSIX to the `docks-downloads` public bucket in the website's configured Supabase project. Give the object the build filename, such as `Crystal-Docks-1.2.3.0-win-x64-signed.msix`. Keep customer files and private assets out of this bucket. Store each version under its own filename and verify the public download against the build's SHA-256 file. A public release asset from the Crystal Docks GitHub repository is supported when available under tag `v1.2.3.0`.

Before enabling the release feed, run `packaging/Test-ReleaseMsix.ps1` from the Windows repository on the downloaded file on a clean Windows 11 machine. Pass the digest, version and publisher from the release build record. It checks the download bytes, exact package identity, architecture, publisher and trusted timestamped signature.

Set `DOCKS_RELEASE_WINDOWS_X64_VERSION` to the four-part MSIX version, `DOCKS_RELEASE_WINDOWS_X64_URL` to the exact HTTPS asset URL, and `DOCKS_RELEASE_WINDOWS_X64_SHA256` to the verified digest of the signed package. The feed and redirect require all three settings. From a signed-out browser, confirm the feed returns the expected `version` and `sha256` and the matching `/{version}/download` route delivers a package that passes `Test-ReleaseMsix.ps1`. Compare with the build record independently of the feed.

Open `/docks` in a signed-out browser and check the version and Windows download link. The same page shows the release status with no download link when the feed is empty. Its app preview comes from the Windows smoke test with example data. The reports link opens the separate account area.

Desktop users choose when to check and whether to open the browser. Windows handles the signed package installation. To withdraw an offer, clear the environment settings. If a faulty release has already been installed, publish a corrected package with a higher version and the same publisher.
