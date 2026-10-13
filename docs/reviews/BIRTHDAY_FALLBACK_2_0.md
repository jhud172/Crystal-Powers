# Birthday capability fallback — Crystal Powers 2.0

Verified 10 October 2026. The personal birthday route remains separate and noindex. Both synthetic before/after-birthday branches failed when IntersectionObserver was unavailable: React Router rendered an application error, with no main story. The initial pageerror-only probe missed React’s handled error; the follow-up captured console errors and the rendered error screen. Ignored before evidence: birthday-fallback-pc/before.json.

## Fix and acceptance

BirthdayMission.tsx and PostBirthdayMission.tsx now check constructor callability before creating observers. Without that capability they reveal their existing content directly, create no observer and omit the untracked current-chapter marker. Native links, keyboard gift reveal/night-drive action, timers, private metadata and the existing observer-supported experience remain intact. No dependency/polyfill or extra global listener.

verify-birthday-browser.cjs adds 40 meaningful checks across two date branches, 390/1440px and normal/reduced motion. It verifies one readable story, actual text-container and ancestor opacity/display/visibility, no misleading tracked chapter, keyboard action and absence of both uncaught and handled console errors. Source repro previously failed both branches; the final packaged candidate passes 76 total checks. The 36 prior normal/date/lifecycle/layout checks were refreshed, not counted again. The stronger final repeat also passes 76; it does not add another 40 to the accumulated total.

Frontend build 664 modules/bootJar pass. Birthday’s deferred chunk changes 32.07→32.45kB raw, 8.04→8.09kB gzip. Entry 109.79/31.97, CSS 93.74/17.65 and scene 35.81/12.58 retain the preceding measurements. Existing Three.js warning remains. Fresh static delivery 51 checks pass. Java/API/data/security/provider/3D sources are unchanged; 43 H2 tests are preceding release evidence, not a claimed rerun for this frontend-only fix.

The actual jar’s version/index and every compiled JS/CSS asset were independently checked against dist: exactly eight assets, zero missing/stale assets, byte-identical contents. The updated standalone candidate is retained as release-2-0/candidate-2.0.0-birthday-fallback.jar, SHA256 eef317a7d9047f405506a39806feccd5be40e582ee4c10ecc9706bf6f9e03796. Earlier candidate and rollback artifacts remain separately retained. No public client publication, account or email transmission.

## Physical/container availability

Standard Android SDK adb is available, but adb devices -l returned no connected device. That is tool availability, not physical-phone acceptance. Docker CLI is installed, but Docker Desktop’s Linux-engine named pipe is absent. No engine/service was launched or container built; the Docker build’s dependency restoration would also need the pending explicit install authority. Evidence: ignored release-2-0/environment-availability.json. ADB started its previously stopped server for the device query; housekeeping records whether that owned helper was stopped.

Physical/assistive technology, native background-tab cancellation, representative rendering/performance, privacy operating facts, commercial confirmation, actual Clare publication, dependency and full hosted/release gates remain open. MOTION-03/PERF-03 are not checked off by this fix. Audit115/133, accumulated browser checks2165→2205. Current source remains uncommitted/unpushed/undeployed.

Runtime housekeeping: disposable8084 session95284/PID29908 stopped through its original handle; PID absent. The previously stopped ADB server was started by this turn’s query (PID60376), then stopped only after a fresh empty device list; PID absent. Original source/Vite/SMTP/8083 services and private data/keys remain. No Docker service, physical-device install, account, publication or email was created.
