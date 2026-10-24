# Bulk acceptance review — 24 October 2026

This checkpoint covers the completed private workflow, actual-session, backend, recovery, motion and local performance batches. It supersedes earlier pending-test statements for those exact scopes. It does not turn simulated providers or desktop emulation into production/device acceptance.

## Implemented corrections

- Reserved first-view height on asynchronous owner/client/privacy routes. Measured layout shift fell from a worst case of 0.539 to 0.06565 in the 48-profile correction run; the verifier now enforces a 0.10 CLS budget.
- Added a separate **Confirmed project scope** field to staff tracking and client project progress, rather than exposing the private enquiry brief. V63 is additive; saved tracking versions, current staff capabilities and client/request isolation apply. Text is limited to 6,000 characters, long references wrap and newlines remain readable. Missing input from older clients preserves existing scope; explicit blank clears it. Only changed scope adds a public history event, and issued payment terms stay immutable.
- Added owned disposable PostgreSQL/packaged-browser runners. Real password/MFA/cookies and actual persisted responses replace API interception for the new end-to-end journeys. Credentials exist in process memory, synthetic records remain local and payment/mail/AI providers are explicitly disabled.
- Included the concurrently added assistant budget in the guarded backup inventory, rejected unknown assistant tables, protected its PostgreSQL grants and verified the actual database override in its tests. These are integration safeguards; the independent Companion implementation is preserved.

## Rapid-scroll correction

A valid delayed IntersectionObserver callback can include an older offscreen entry followed by a newer onscreen entry. Both Prism observers consumed only the first entry, which can leave stars/the live stage paused after a fast scroll. Added `verify-batched-intersection-browser.cjs`, coalescing actual chronological native entries without inventing geometry or overriding page visibility. It fails on the previous build at the continuing-star-draw assertion. Both `PrismStarfield.tsx` and `CrystalOpening.tsx` now consume the latest entry. Final rebuilt regression/motion runs are recorded below; native background-tab acceptance is still a different gate.

The earlier non-coalesced41-check rerun passed, and five additional native observer traces continued drawing; those alone did not explain away the original timeout. The deterministic valid-batch reproduction exposed and fixed the underlying edge case. Original failed evidence is retained in `batched-intersection/before-latest-entry-fix.json` and `prism-precision-20261023/rapid-scroll-frame-timeout.json`.

## Final evidence

Final cleaned candidate SHA256: `2306ea516b0982b0b67601c27377f773cba2b83b7875c3a97b0ffb2433aaa05e`. The motion/performance correction candidate is `d7dc0bbbc5856ff523a43458c1f91868c1574eaaaddf2369ba9079205993feec`; the final steps only namespace the added heading and remove retired build-output assets, with their own final navigation/static/inventory gates. All430 non-static backend entries are byte-identical to the fully backend/recovery-tested scope candidate `09838ebcf5208b5ba45c3e49237bde3aea74beecf411de5d27e5d21e95823e25`. The feature-code correction changes only existing Prism frontend observer handling; the later namespace/packaging corrections are separately verified; backend/recovery evidence retains its original candidate identity.
All **159** built frontend files match their packaged JAR bytes; backend-owned `robots.txt` is also preserved. There are **160** static entries and **0** stale entries. The retained candidate and source fingerprints are in ignored `.codex-runtime/qa/bulk-completed-candidate.json`; migrations V63, V64 and V65 are present. No dependency installation, external provider operation, deployment, commit or push was performed by this audit.

| Grouped gate | Result and scope |
| --- | --- |
| Frontend | `npm.cmd --prefix frontend run build`: 736 modules, successful. Existing large deferred Three chunk warning remains. |
| Backend | Full `test postgresTest` tasks: 263 tests each, zero failures/errors/skips. Seven affected tests were then rerun in both databases after the assistant database override and scope denial assertion were corrected: 7/7 each. The original five assistant cases within the full PostgreSQL task had pinned H2; the corrected focused run proves those five against actual PostgreSQL, completing unique-case database coverage without calling the first run PostgreSQL proof for those cases. |
| Real workflow browser | **38** passing checks on the observer correction package, including literal multiline/long-reference scope sharing, ordering, staff/client progress and messages, preferences, groups, channel restriction, private owner revision/media, consent-gated publish/unpublish, logout and five populated surfaces at 390/768/1440px. No API mocks or runtime errors. `populated-recovery-browser-20261024005421/browser-report.json`. |
| Real delegated role browser | **31** passing checks on the preceding stability package: ADMIN/SUPPORT/MEMBER invitation, activation, MFA, allowed/forbidden routes/actions, delegated editor/upload/publication/archive/restore and existing-session revocation. Owner/moderator/client covered in workflow batch. This is local role coverage, not provider delivery. `populated-recovery-browser-20261024001607/roles-browser-report.json`. |
| GPU profiling | **15** actual desktop GPU profiles, **7** compact fallback cases and **2** explicitly non-comparable baseline entries. No measured GL/disjoint/runtime errors. Prism auto/low/high median draw-bearing callback GPU cost: 0.169/0.059/0.334ms. The retained older package predates Prism and has one separately recorded startup GL1281; the current renderer has no startup flags. These are not whole-frame/physical-phone/thermal results. `render-cost-pc/report.json`. |
| Native background visibility | **Unavailable**, not passed: explicit shared-context same-window target activation and minimisation both left `document.visibilityState` visible in this automation session.0 runtime errors; no synthetic hidden event was substituted. The initial second-tab attempt needed an explicit browser context, then the corrected native probe completed. `native-visibility-bulk/report.json`. |
| Final populated recovery | **57** passing real-HTTP checks;46 tables,139 rows,4 schema comparisons,2 sequences and1 private JPEG match. Current and retained earlier candidates resume authorised writes; scope and assistant-budget records survive both. RLS/browser-role checks deny8 representative private reads. `populated-recovery-scope-final-20261024/report.json`. |
| Final existing public integration | **48** returning-visitor cold profiles pass on the observer candidate:0 response/runtime/network/overflow/automatic-WebGL failures, maximumCLS0.06565, maximumLCP1268ms. Final cleaned-package delivery: **106** checks /19 assets /0errors, plus **139** public-section checks at390/1440px and exact160-file package inventory. These are unthrottled desktop diagnostics, not physical/field performance. Companion acceptance is excluded. |
| Final identity refresh | **401** checks pass: client entry79, team entry79, stale parsed-response lifecycle16, staff security137, bounded role editor47 and member management43. Private transport fixtures are explicitly synthetic, separate from the actual-session journeys. The two management suites first rejected18084 in a shared imported read-only audit helper; widened only its explicit loopback QA allowlist and reran both:90/90 pass. |
| Final rebuilt motion refresh | **242** checks pass on the observer correction candidate: lifecycle50, Prism41, delayed native-entry batch4, quality95, brand resources40, adaptive12. The old implementation fails the new deterministic4-case regression at the continuing-star assertion; the corrected stars and WebGL stage both resume. Reports record candidateSHA256; final namespace/packaging-only corrections do not change these feature implementations. |

Full XML summaries are retained in `bulk-scope-full/`; corrected seven-case XMLs in `bulk-scope-corrections/`. Relevant logs: `bulk-scope-final-frontend.log`, `bulk-scope-backend-final.log`, `bulk-scope-corrections-final.log`, `bulk-scope-browser-final.log` and `bulk-scope-recovery-final.log`. Initial failed verifier reports remain labelled alongside their successful corrections; they are not silently discarded.

## Final navigation and packaging corrections

The separate component reused `prism-title`, breaking the existing home chapter target/accessible relationship. The new section verifier failed the previous candidate at duplicate IDs on390px. Namespaced only the added heading/aria reference to `prism-companion-title`, preserving the existing public fragment. Final **139** checks cover unique IDs, native hash and actual scrolling to each section, expected route status and reflow across eight public routes at390/1440px. No runtime errors remain.

A full JAR inventory then found **12** retired hashed assets plus the intentional backend robots file outside the159 frontend outputs. `processResources` now verifies its generated target stays inside the build directory and regenerates only static output; the normal resource copy restores both frontend assets and backend-owned `robots.txt`. The new `verify-packaged-assets.py` gate rejects the retained pre-cleanup candidate and passes the cleaned package with160 matching static files/0 stale entries. It is included in grouped navigation/performance runs. This removes generated leftovers, not source assets or business data. Full logs: `bulk-clean-package-final.log`, `bulk-clean-navigation-final.log`, `bulk-clean-static-inventory.log` and the expected old-package rejection log.

## Checklist status

There are **156** named feature/release items: **131 checked /25 open**, plus **8** separate phase-acceptance boxes still open. Local contract completion is distinct from provider, native/physical and deployed acceptance.

## What genuinely remains

The audit is not a licence to invent operational facts or mark unperformed acceptance complete. Open implementation/release gates remain grouped as follows:

- **Operating decisions:** legal/trading name, public company mailbox/domain, retention/deletion, support/aftercare and service inclusions remain explicitly undecided. Privacy stays unpublished until those facts are supplied; its 404 is intentional and tested.
- **Authorised providers:** company mailbox/DNS sender verification, real delivery/reply/bounce/outage tests; Stripe sandbox account and actual payment/renewal/action/refund/webhook journeys; real upload scanner acceptance. Local mocks, imported financial snapshots and disabled transports do not satisfy these.
- **Physical and native acceptance:** native hidden-tab behaviour, physical touch/GPU/thermal checks and assistive technology; desktop viewport emulation and deterministic visibility events remain separately labelled.
- **Publication and release:** only Clare’s Life Celebrations is approved public work. Actual approved publication, phase/design acceptance, final deployed revision/routes/integrations and final physical/deployed private-route acceptance remain open. The local identity/role/security/workspace contracts are now checked against their recorded scopes. The local synthetic publish/unpublish test does not publish a client project.
- **Concurrent Companion is excluded by James:** its feature/release acceptance belongs to the separate work. An initial cold attempt before the scope reply recorded a first-visit1440px scene failure: WebAssembly instantiation is blocked by the packaged `script-src self` CSP. All48 existing-feature returning profiles in that attempt had zero runtime/network/overflow failures and maximumCLS0.06565. The raw52-profile attempt is retained as `performance-pc/including-excluded-companion-attempt.json`; it is not reported as a successful full run. A separate ad-hoc Companion transport probe also hit403 after omitting the required CSRF proof; that verifier was removed when scope was clarified. No CSP or assistant logic was weakened to conceal these results. Its heading ID alone was namespaced as a necessary integration fix for the existing homepage fragment; that is not assistant feature acceptance. Actual provider/notice/pricing acceptance is not claimed.

## Open named gates and the evidence needed

| IDs | What closes them |
| --- | --- |
| HOME-03 | Real approved Clare content published through the owner workflow and checked with final public data. Empty/error and synthetic publication flows already pass locally. |
| CONTACT-08, NEW-01, CONTENT-03, CONTENT-05, MAIL-05 | Agreed operator/trading/contact facts, retention/deletion, service inclusions and aftercare; publish matching accurate content. Those facts remain undecided. |
| MAIL-01–04, MAIL-06 | Actual agreed domain/mailbox/provider, authorised DNS sender verification, configured addresses/URLs and real staging delivery/reply/bounce/outage evidence. Local transport and token contracts pass separately. |
| PAY-01, PAY-03–05, PAY-07–08 | Actual Stripe sandbox/company setup, complete checkout/portal/recurring/refund/action/webhook provider journeys, and agreed financial/privacy operations. Money, signed-event and UI contracts pass locally; no real charge was used. |
| HUB-11 | An actual trusted scanner and its end-to-end private-upload acceptance. Validation/quarantine/lease/approval/authorisation tests already pass. |
| MOTION-03, HUB-10 | Actual native background lifecycle/polling acceptance. Deterministic visibility and bounded-request tests pass; minimisation alone was unavailable. A separate native target-activation probe is recorded without synthesising hidden state. |
| PERF-03, HUB-18 | Physical touch/GPU/thermal and assistive-technology/private-route acceptance. Emulated widths and automated checks are labelled separately. |
| RELEASE-02 and PHASE-A–H | Final phase/design review and the deployed candidate/routes/integrations. Local passes and a successful package do not prove deployment. The excluded Companion has its own recorded first-visit CSP finding. |

## Commands and repeatability

Run completed batches, then correct and rerun only affected scopes. Use the documented short Java temporary path and dedicated loopback PostgreSQL55447; Windows reserves the usual55432 here. No production database is accepted by the runners.

```powershell
npm.cmd --prefix frontend run build
# With disposable PG_TEST_* and SKIP_FRONTEND_BUILD=1 configured:
.\gradlew.bat test postgresTest bootJar --offline --no-daemon --console=plain
python scripts/run-real-session-browser.py
python scripts/run-real-session-browser.py --roles
python scripts/run-packaged-public-qa.py motion
python scripts/run-packaged-public-qa.py identity
python scripts/run-packaged-public-qa.py navigation
python scripts/verify-packaged-assets.py
python scripts/run-packaged-public-qa.py performance --only-cold
```

The recovery command and evidence limits are recorded in the current audit/progress; source and restore databases must be fresh. Runners refuse occupied application ports and stop only their own child servers. Local evidence/backups/test databases are retained for review.

## Final cleanup and residual checks

Final source/public-asset fingerprints are stable;139 public source files match their built copies. Python syntax7 /Node syntax19 checks, source/document links, unique audit IDs and `git diff --check` pass. Existing MockBean/unchecked-operation/JVM and deferred Three chunk warnings are recorded, not silently called failures or advisory certification.

Initial verifier corrections remain visible: the excluded dock owns one published-project visibility subscription, now recorded as an exact one-listener allowance across every existing-feature cycle; the native probe needs an explicit shared browser context/returning-visitor marker; imported read-only UI helpers now accept only the additional guarded18084 loopback URL. The natural rapid-scroll timeout was investigated and then given the deterministic valid-batch reproduction/fix above, rather than dismissed from a lucky rerun.

Cleanup completed: no remaining client connections to the owned test cluster; QA application18084, baseline8085 and PostgreSQL55447 are stopped. Existing frontend preview8084 remains listening. `final-service-state.json` records those observations. Synthetic databases/backups/reports and retained candidates remain ignored local evidence. No other machine services, source assets, client records or Git history were removed.
