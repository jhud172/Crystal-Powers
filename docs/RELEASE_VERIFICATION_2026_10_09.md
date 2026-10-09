# Release verification — 9 October 2026

The latest application is committed on `James/crystal-powers-2-completion`. This record verifies local release behaviour; it does not certify a deployment of that revision to Render.

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

Render is signed out in the in-app browser. James has authorised deployment and been asked to sign in; no second deployment authorisation is needed. Verify the existing service's PostgreSQL, encryption, private storage and mail configuration before pushing remote main, because it automatically deploys. Then verify the exact deployed commit, successful hosted boot, health, routes, asset loading, owner protection and provider behaviour. The local profile must never be enabled as a production workaround.

Hosted PostgreSQL/RLS, real provider delivery, owner enrolment and the latest live boot remain unverified. A local PostgreSQL executable was not available, so `postgresTest` was not rerun. Docker's engine was unavailable; a current Linux container boot was not certified. Physical-phone acceptance remains open. Existing warnings include the large deferred Three.js chunk, Three.Clock deprecation/GPU precision warnings, test MockBean deprecation/unchecked generics, and eight existing npm build-tool advisory findings. No dependency upgrade was performed. The full 2.0 completion checklist remains open.
