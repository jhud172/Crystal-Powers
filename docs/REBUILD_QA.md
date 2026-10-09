# Immersive rebuild verification

Latest continuation: [9 October release verification](RELEASE_VERIFICATION_2026_10_09.md) records the current test rerun, packaged boot and unresolved hosted gates. The September evidence below is historical.

Date: 13 September 2026. Scope: local implementation on `James/immersive-rebuild`, based on upstream `6bfba8d`. No public deployment or production credentials were used.

## Automated and package checks

| Check | Result |
| --- | --- |
| `npm --prefix frontend run build` | Passed TypeScript and Vite production build. |
| `gradlew.bat test` | 23 tests, zero failures/errors/skips, H2. |
| `gradlew.bat postgresTest` | Same 23 tests passed against isolated PostgreSQL 17 at port 55432. |
| `gradlew.bat bootJar` with the freshly built frontend | Passed; packaged application started and served the public site. |
| `npm --prefix frontend audit --json` | Zero known vulnerabilities. |
| Resolved Maven runtime inventory / OSV scan | 68 packages, zero reported findings after compatible security updates. |
| `python assets/blender/prepare_web_assets.py` | GLB geometry, animation, metadata, self-contained buffers and size contract passed; manifest refreshed. |
| Combined PostgreSQL and media backup/restore | Passed, including matching image SHA-256 and all seven table digests in the earlier restore/restart rehearsal. |
| Backup tamper and restore guards | Changed bytes rejected; non-local production target refused. |
| `git diff --check` | Passed. Git reports expected Windows line-ending conversion notices. |
| Final `docker build` and limited runtime smoke | Passed Linux build; UID 999 (`crystal`), 512 MB limit, about 157 MB observed idle memory. Health, routes, GLB, private-draft 404 and anonymous-admin 401 passed. Disposable container stopped and removed afterwards. |

Tests cover password-only access rejection; TOTP/recovery replay prevention; session and CSRF rotation; singleton owner; stale draft conflicts; immutable revision restoration; public/draft separation; private media, sanitisation and cross-project ownership; unsafe input and escaped SEO; PostgreSQL RLS; reset expiry/factor checks; credentials-version invalidation; authenticator replacement; mocked Resend and private Supabase failures/timeouts. Tests do not contact real recipients or hosted storage.

Security dependency updates include Spring Boot 3.5.16, Tomcat 10.1.59, Jackson 2.21.5, Log4j 2.25.5 and PostgreSQL JDBC 42.7.12. An initial Tomcat 10.1.58 attempt failed dependency resolution because that release vote failed; 10.1.59 resolved and passed. The initial runtime advisory scan found 42 entries; the final scan found none. This is dependency evidence, not a claim that the application is vulnerability-free.

## Browser and visual checks

- Reviewed original light/dark Cycles assets, desktop homepage, phone homepage and tablet contact layout.
- Public route checks at phone widths (375/390 px) and tablet (820 px) found no horizontal overflow. Project details were checked after their asynchronous data loaded. Existing birthday route loaded under the production CSP.
- All five themes switched; appearance and mobile menus returned focus on Escape. Mobile navigation exposed all destinations. Required-field errors focused the first invalid field; unsuccessful contact delivery retained entered values and focused feedback.
- Real GLB crystal, laptop, monitor and phone rendered inside the packaged application. Keyboard rotation, Escape and launch-button focus were verified. Laptop authored animation stopped at completion. Phone screenshot proportions were corrected by preserving Blender screen metadata and visually rechecked.
- Reduced-motion emulation removed the film control and avoided automatic canvas activation. A deliberately blocked model request produced the still-image fallback with no active canvas or rotation controls.
- Strict production `script-src 'self'` initially exposed unnecessary decoder WebAssembly initialisation. Disabling Draco/Meshopt for the original uncompressed GLBs fixed the failure without weakening CSP.
- Owner UI previously verified private upload, preview, publish, anonymous visibility, immutable history restore and stale-session handling. Final session-recovery and container evidence is appended below as completed.

## Asset and runtime budgets

Four GLBs: crystal 227,840 bytes; laptop 1,322,404; monitor 62,828; phone 91,180. Each is below the 5 MB model budget. Light/dark films are six seconds, 24 fps, 1280 × 800; approximately 0.79/1.07 MB. Editable scenes and original renders are included in the repository.

Final frontend output: main CSS 42.71 KB (8.70 KB gzip), application JS about 65.44 KB (18.24 KB gzip), React vendor 236.18 KB (75.52 KB gzip). Three.js is a separate deferred 1,007.36 KB chunk (276.30 KB gzip), with a 46.31 KB scene chunk. Vite warns about the large Three.js chunk; its download is deliberately deferred until a visitor requests 3D. Browser resource inspection confirmed no Three.js, GLB or film downloads on initial home load, and zero canvases.

One active visible canvas, demand rendering when idle, DPR capped at 1.5, offscreen/tab-hidden pausing, restrained transmission samples and reusable model caching bound rendering work. A three-second desktop animation-frame sample recorded 721 callbacks, mean 4.17 ms and p95 about 4.3 ms. This measures browser callback pacing on this desktop, not GPU frame time or phone performance. No physical handset was available; the 30 fps physical-phone acceptance gate remains open. No claim of formal WCAG certification, full penetration testing, sustained memory-load testing or real hosted-provider delivery is made.

## Evidence and remaining launch boundary

Machine-local evidence is under ignored `.codex-runtime/qa/`: route/theme audits, dependency inventories, advisory reports, PostgreSQL restore evidence, backup guard results and screenshots. Backend XML results are in `build/test-results/test/` and `postgresTest/`. Synthetic owner data and recovery material must remain private and must not be reused in production.

The existing Render service in My Workspace is on Starter and automatically deploys main. The free-plan blueprint is prepared but has not changed it. Real Supabase credentials/private bucket, verified Resend sender and receipt, public owner MFA enrolment, final hosting choice, deployment and DNS remain user-controlled steps; see `DEPLOYMENT.md`.

## Final editor verification

Both expired-session paths passed in the packaged UI: an unauthorised request and a stale CSRF token reopened the sign-in dialog. Email/password plus fresh MFA restored access with the unsaved title intact, and the recovered draft could be saved. The media-library loader now also opens reauthentication on session expiry.

The editor now intercepts navigation links before discarding unsaved work. Its native confirmation caused the browser automation's focus command to stall; dismissal could not be certified with that tool. Existing before-unload, editor-back, reload and account-change warnings remain. Browser-history navigation within the SPA is not blocked; save before using browser Back/Forward. This limitation is not represented as a passed protection check.

Final evidence additions: `container-smoke.json`, `docker-build-final.log`, `npm-audit-final.json`, `backup-guard-evidence.json`. A bounded secret-pattern scan of 142 authored/modified files reported no matches; ignored `.env`, runtime data and unrelated pre-existing files were excluded.

The native-dialog automation stall also prevented normal clicks in the public tab. Isolated developer diagnostics confirmed the dark film was present, unpaused and advancing (2.40 seconds into its six-second loop), without a playback error. Diagnostic instrumentation was cleared by reload. This distinguishes working playback from the stalled automated input surface. The local synthetic project was restored to its original content and archived through the authenticated API after testing; no demo claim is left public.
