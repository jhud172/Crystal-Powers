# Release verification — 9 October 2026

The tested application is committed on `James/crystal-powers-2-completion` and remote main. It was deployed to the existing Render service as `9abd386` on 9 October; the production evidence below supersedes earlier pending-deployment notes.

## Hosted verification

The first deployment built successfully but stopped because Supabase's pre-existing `rls_auto_enable` function made its otherwise empty `public` schema non-empty. A read-only query confirmed zero relations. A one-time version-zero Flyway baseline allowed all three migrations to run; no existing provider objects were removed. Retry `dep-db4ea4c9v7es73ac7410` applied V1–V3 to PostgreSQL 17.11 and booted Spring Boot 3.5.16 in 41.101 seconds, with Java 17, the unprivileged container user and the default production profile. Render reported Live at 14:00 BST. Temporary baseline variables were then removed. Health monitoring now uses `/api/health`, and On Commit automatic deployment is restored.

Checks on the actual custom domain `https://crystal-powers.com`:

- All six public pages, `/admin` and the SPA not-found route returned 200. HTML uses `Cache-Control: no-store`; its entry `/assets/index-HsDP3OUJ.js` matches the locally tested build, and production CSP is present.
- Health returned `{"status":"up"}` and public projects returned the intended empty list. Anonymous owner projects returned 401; a nonexistent/unpublished project returned 404.
- The live crystal reached its open state with one canvas, no document overflow, no broken completed images and no sampled browser console errors.
- All five appearances selected correctly at an actual 390 px viewport without overflow. Reduce effects produced a static opening with zero canvases. The mobile menu closed on Escape. All six public pages, owner login and not-found rendering had no horizontal overflow or broken completed images in the 390 px check; Back/Forward worked. Temporary preferences and viewport override were restored.
- Empty contact submission showed six invalid required fields and the validation message. Exactly one authorised, clearly labelled test then returned success. Resend email `01a120c1-68d8-7a0c-8fcb-4e5d42d575e3`, from `studio@crystal-powers.com` to the approved enquiry inbox, has **sent** and **delivered** events. This verifies provider delivery, not the recipient opening or inbox-versus-spam placement.
- Private storage retains the 5 MB JPEG-only restriction and zero anonymous policies. Supabase permission inspection confirmed RLS on all eight application/history tables and no SELECT, INSERT, UPDATE or DELETE access for either browser role (`anon` / `authenticated`). Owner enrolment, authenticated media upload/publication and recovery delivery were not exercised against production.

Private evidence includes `live-release-checks.json`, `live-mobile-pages.json`, `live-home-mobile.png`, `live-crystal-open.png`, `live-contact-delivery-success.png`, `resend-test-delivered.png` and Supabase schema/permission screenshots under ignored `.codex-runtime/qa/`. No credentials were put in Git or the browser application. The full 2.0 checklist remains open.

## Repeatable checks

From the repository root, with existing frontend dependencies and an installed JDK:

```powershell
.\scripts\verify-release.ps1 -JavaHome "$env:USERPROFILE\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2" -JavaSocketTempDirectory C:\cp-java-tmp
```

The script builds the frontend, checks authored animation and asset contracts, reruns backend tests, packages the application and checks whitespace. It installs no dependencies, stops on failure and restores the calling process's environment. The optional Java socket path must be short and absolute without spaces, to keep Java option parsing unambiguous.

Java selector creation fails with `Invalid argument: connect` in this device's profile temporary directory. A standalone `Selector.open()` probe reproduces that failure. The same installed JDK succeeds in `C:\cp-java-tmp` and a separate short directory containing spaces; spaces alone are therefore not an established root cause. Using the working directory for process-local `TEMP`, `TMP`, `java.io.tmpdir` and `jdk.net.unixdomain.tmpdir` allows Gradle and test workers to run. No global Java, networking or security settings were changed.

## Results

| Check | Result |
| --- | --- |
| TypeScript and Vite production build | Passed, 639 modules. |
| Exact animation names, legacy compatibility, malformed contracts and actual GLBs | Passed. |
| Geometry, buffers, pivots, animation duration and responsive poster contracts | Passed for all five models. |
| H2 backend suite, rerun rather than cached | 23 tests; zero failures, errors or skips. |
| Backend test areas | Application/contracts: 9; owner/publishing/private media: 8; recovery: 3; mocked provider transport: 3. |
| `bootJar` | Passed with the freshly built frontend. |
| Packaged local boot | Started in 6.072 seconds; all three Flyway migrations applied to an isolated local H2 database. |
| Public route GETs and owner shell | All six public pages and `/admin` returned 200. |
| Health and public portfolio APIs | 200; health reported `up`, public projects returned the intended empty list. |
| Anonymous owner API and unpublished project API | 401 and 404 respectively. |
| Compiled entry JS, React vendor, CSS, Observatory GLB and poster | 200 with expected content types and sizes. |
| Production browser behaviour | Crystal opened with no console errors under production CSP; light poster loaded, reduced effects removed canvases, Escape returned appearance focus. Public routes and the SPA 404 rendered without overflow or broken completed images in the desktop check. All six public pages had no overflow at 320/390 px; mobile navigation and Back/Forward worked; native required-field validity was present. Owner login rendered at 390 px. |
| Existing hosted release | Homepage booted; all six public routes returned 200. It still serves the previous release and returns 404 for the new health endpoint. |

Local boot used port 18085, the `local` profile, an isolated ignored H2 database and disabled email. No live enquiry, account enrolment, project publication or hosted storage write was performed. Unknown page URLs retain the existing SPA HTTP 200 fallback and render the React not-found page; unpublished project API requests return 404.

Evidence is private and machine-local: `.codex-runtime/qa/release-verification.log`, `packaged-boot-routes.json`, `packaged-browser-routes.json`, `packaged-mobile-routes.json`, `packaged-home-verified.png`, `current-live-routes.json`, and `build/test-results/test/TEST-*.xml`.

## Remaining release gates

Latest provider update: James is signed in to Supabase, Resend and Cloudflare and approved the server-key and verification-DNS configuration. The free Ireland Supabase project has a private JPEG-only `project-media` bucket (5 MB, zero policies); its table editor showed no existing tables. The session-pooler JDBC URL, username, origin and service-role key are saved in Render. Resend verified all three required DNS records; its production API key grants Sending access only for `crystal-powers.com`. That key is prepared in the unsaved Render form, waiting for the user's private database-password entry and **Save only**. Encryption-key/sender/test approval is pending. Remote main includes the tested release and preparation documentation; Render Auto-Deploy remains Off and the old release is still live. No hosted boot, owner enrolment or actual delivery is claimed. This update supersedes earlier account-sign-up status below.

Render sign-in is now available. Its latest manual deploy still used old commit `6bfba8d`; the service's domain list includes verified `crystal-powers.com`. It had no environment variables or linked groups. Auto-Deploy was paused and verified after reload before pushing tested release `022c885` to remote main. Four non-secret settings (public URL, media provider/bucket and mail provider) were saved with **Save only**. Existing Starter hosting was preserved and no deployment was triggered. James confirmed that Supabase and Resend are not set up; both account sign-up pages are open for user credential entry and acceptance of terms. Production database, encryption, private storage and mail configuration remain pending. Then verify the exact deployed commit, successful hosted boot, health, routes, asset loading, owner protection and provider behaviour, and restore automatic deployment after success. No second deployment authorisation is needed. The local profile must never be enabled as a production workaround.

Hosted PostgreSQL/RLS, real provider delivery, owner enrolment and the latest live boot remain unverified. A local PostgreSQL executable was not available, so `postgresTest` was not rerun. Docker's engine was unavailable; a current Linux container boot was not certified. Physical-phone acceptance remains open. Existing warnings include the large deferred Three.js chunk, Three.Clock deprecation/GPU precision warnings, test MockBean deprecation/unchecked generics, and eight existing npm build-tool advisory findings. No dependency upgrade was performed. The full 2.0 completion checklist remains open.
