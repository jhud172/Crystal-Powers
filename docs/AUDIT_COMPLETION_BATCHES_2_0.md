# Crystal Powers 2.0 — completion checklists and batch execution

Started 30 October 2026 against `8d5bf15`, tracking the initial **24 open named audit items** and **eight phase sign-offs**. HUB-11 is now accepted locally: **133/156 checked,23 named items still open**. The main audit remains the acceptance authority. Completed implementation, local test evidence, real-provider evidence and owner sign-off are recorded separately.

## Execution contract

Objective: finish the outstanding user, operator and release journeys with reproducible evidence, correcting failures in their owning batch. Implement a coherent batch, run its grouped checks, fix failures and rerun affected checks before moving on. Reuse a passed result only while its source/build/provider scope remains valid.

Ownership: frontend routes/features/styles, backend controllers/services/security, private migrations, Blender assets and existing guarded scripts retain their repository owners. No implicit route/API/data contract change. No invented operating policy, client claim, provider delivery or physical-device result. Keep all credentials, runtime databases and private evidence ignored. Use disposable loopback fixtures for automated mutations; protect production and the existing owner identity.

Impact: the initial plan/reconciliation changed documentation only. Implemented batches now also correct original asset provenance, mobile project-card layout, pre-controller multipart errors and restricted Stripe key configuration, with guarded local QA tools. Existing routes, response shapes, schema and branding are preserved; multipart failure now returns its intended413. Private workflows retain keyboard/focus/reduced-motion and denial/session coverage. Provider activation needs the agreed test account and controlled procedure; payments stay sandbox-only. No external release has changed.

Completion criteria: every item below has evidence matching its real acceptance boundary, all applicable grouped checks pass for the final candidate, operating facts are confirmed, and James signs off PHASE-A–H. Local fixtures cannot close provider, real account, physical-device or owner-review gates.

Installation authority, 30 October: James grants standing permission to install the tools/dependencies needed for this work and asks for no further routine installation questions. This overrides the repository's installation-confirmation requirement for this session. Keep consequential business/provider changes, private credential/MFA handoffs and unconfirmed operating facts distinct from routine setup.

## Batch register

| Batch | Scope | Initial state / prerequisite |
| --- | --- | --- |
| B0 | Current baseline and audit reconciliation | Passed local build/contracts/package; H2 and PostgreSQL each283tests; private results recorded separately |
| B1 | Operating facts, privacy and service terms | Waiting for confirmed facts; James confirms none are decided |
| B2 | Company email and client correspondence | Technical preparation available; real inbox/account and controlled delivery acceptance required |
| B3 | Stripe sandbox billing | CLI authorised and selected sandbox verified; restricted-key mode guards tested; private application key/listener and actual payment journeys pending |
| B4 | Trusted private upload scanning | Local acceptance complete: actual engine/protocol, HTTP concurrency/quota and reviewer/member browser checks pass; hosted acceptance stays in B6/B8 |
| B5 | Motion, background lifecycle and polling | Actual native probe remains unavailable on this desktop; complete motion and conversation polling acceptance remain open |
| B6 | Full private workflow acceptance |23 UI suites,31 actual role and38 actual session browser checks,57 populated recovery checks pass; hosted/provider/device gates remain |
| B7 | Physical-device and assistive acceptance | Needs representative physical hardware and assistive-technology observations |
| B8 | Final candidate and phase sign-offs | Depends on applicable preceding gates and James's review |

## B0 — current baseline and documentation

- [x] Pull latest main without discarding unrelated local work; record source/live revision and recount unique named items.
- [x] Record James's 30 October answer: legal/trading identity, business contact address, retention/deletion periods and aftercare/support terms are all unconfirmed.
- [x] Obtain permission to restore the newly pulled lockfile; no manifest/version upgrade is authorised by that restore.
- [x] Restore locked dependencies and verify the dependency tree: npm ci and npm ls pass; npm reports zero vulnerabilities.
- [x] Run the current production frontend build and existing source/asset contracts. Correct LF provenance and recapture/review the stale poster collection; all relevant contracts pass.
- [x] Run current H2 backend tests: 283 tests / 16 suites, zero failures/errors/skips after refreshing the old frontend resources. Initial stale-resource failure and interrupted rerun remain recorded.
- [x] Package the current frontend/backend and verify exact static inventory: 162 matching files, zero stale; candidate 20ea3fcc0a9455bb9013e02601c7454cc8cb505af4f7441051d526a13009503d.
- [x] Establish a disposable provider-disabled browser environment: explicit frontend-only fixture preview on loopback8084, existing bundled Playwright and installed Edge; no real account writes.
- [x] Reconcile stale top-level guidance in audit, handover, release, laptop and optional-feature notes without rewriting historical evidence.
- [x] Record fresh evidence and prerequisites. Next: grouped PostgreSQL and private browser verification, then native motion and live scanner acceptance.

Tests: existing production build, animation/font/asset contracts, H2 tests, exact package inventory and baseline application readiness. PostgreSQL results require an actual guarded disposable PostgreSQL instance; never substitute H2 evidence.

## B1 — operating facts and public policies

### CONTACT-08 — contact privacy explanation
- [ ] Confirm responsible legal/trading identity, contact details and enquiry-processing/retention facts.
- [ ] Add approved plain-English privacy explanation and working links; retain truthful next-step wording.
- [ ] Test contact normal/error/success states, mobile/keyboard and published/unpublished policy behaviour.

### NEW-01 — informational pages and discovery
- [ ] Complete privacy/accessibility content using actual operations and audit findings.
- [ ] Verify publication-controlled routes, footer links, metadata and sitemap agree.
- [ ] Check direct routes, keyboard access and unpublished-policy fallback.

### CONTENT-03 — commercial scope and aftercare
- [ ] Confirm actual inclusions/exclusions, handover and included support/aftercare.
- [ ] Reconcile Services, quote builder, Contact and Support wording without silently changing prices.
- [ ] Check a complete connected service-to-enquiry journey and rendered copy.

### CONTENT-05 — consistent public expectations
- [ ] Apply confirmed accessibility, privacy and support arrangements across public/private information.
- [ ] Check there are no invented promises or contradictory contact/support details.
- [ ] Review affected content in all five appearances and narrow layouts.

### MAIL-05 — private/public operating policy
- [ ] Confirm responsible handlers, access rules, retention/deletion and support scope.
- [ ] Apply the same approved facts to mail, hub, contact and policy content.
- [ ] Verify permitted access/deletion workflows and published copy match the approved process.

Exit: approved facts and content plus connected browser checks. **Waiting for facts**, not an implementation failure. Source can be prepared without publishing an invented policy.

## B2 — real email and correspondence

### MAIL-01 — hosted company mailboxes
- [x] Recheck public domain mail routing:30October DNS resolves three Lark MX records and the Lark SPF include; no record was changed.
- [ ] Recheck actual mailbox/alias inventory against the intended directory; DNS cannot prove inbox ownership or access.
- [ ] Complete independent staff inboxes, named administrators, first sign-ins and MFA via private user credential handoff.
- [ ] Verify each intended receiving address and access owner; enable no unverified department destination.

### MAIL-02 — sender and DNS
- [x] Snapshot public MX/SPF/DMARC before changes: Lark MX, `include:spf.onlarksuite.com -all`, DMARC `p=none`; ignored evidence is in public-mail-dns.json.
- [ ] Inspect actual provider sender verification and its DKIM selectors; verify authenticated message alignment.
- [ ] Identify any required changes and retain the pre-change DNS record/rollback scope.
- [ ] Verify actual records and authenticated received-message results; preserve the website and existing sender records.

### MAIL-03 — application routing
- [ ] Check sender, destination, Reply-To and trusted HTTPS public origin without exposing credentials.
- [ ] Activate only verified department destinations; confirm blank/omitted fallback semantics.
- [ ] Run normal/support/sales/general route tests and confirm saved request/idempotency behaviour.

### MAIL-04 — invitations and support replies
- [ ] Recheck stored recipient, fresh review/consent, expiry, replacement/revocation and current-role checks.
- [ ] Test disabled/success/uncertain/failure/bounce/outage and deliberately reviewed retry paths in controlled conditions.
- [ ] Confirm actual receipt, correct reply route and normal activation without logging tokens/secrets.

### MAIL-06 — end-to-end mail acceptance
- [ ] Agree labelled test messages, exact controlled receiving addresses and provider procedure before sending.
- [ ] Record actual application submission, provider outcome, inbox receipt and reply separately.
- [ ] Verify bounce/outage/recovery safely without duplicate messages or customer mail.

### CLIENT-03 — client/team correspondence
- [ ] Test project/thread isolation, stored recipients, contact preferences and visible saved/delivered states.
- [ ] Test stale permission/session, network failure and explicit retry without replay.
- [ ] Complete the authorised hosted client/team correspondence and notification journey using controlled accounts.

Exit: source tests plus real controlled provider/mailbox evidence. Existing Sent/Accepted records alone do not pass receipt.

## B3 — Stripe sandbox

### PAY-01 — account and operating setup
- [ ] Confirm actual company/sandbox account and retained approved GBP/deposit/balance/optional-support choices.
- [ ] Verify sandbox-only keys/origin/webhook settings privately; keep live billing disabled.
- [ ] Review financial/privacy/customer support terms with B1.

### PAY-03 — one-off checkout
- [ ] Run successful, declined, cancelled, pending and required-action sandbox checkout.
- [ ] Verify server-owned money/currency, permission and idempotency; return URL cannot settle an invoice.
- [ ] Check signed-event settlement, receipt and client-facing reload/retry states.

### PAY-04 — optional recurring support
- [ ] Confirm explicit consent, price/interval/start and cancellation wording.
- [ ] Exercise sandbox activation, renewal, failed/required-action renewal and cancellation.
- [ ] Verify billing state remains separate from project progress and no accidental subscription occurs.

### PAY-05 — client billing management
- [ ] Verify authenticated client/provider-customer isolation and portal creation.
- [ ] Exercise sandbox payment-method, subscription/cancellation and receipt/history journeys.
- [ ] Check expired session, wrong-client access, mobile and error/retry behaviour.

### PAY-07 — financial operations
- [ ] Verify admin-only financial changes/refunds and scoped support visibility.
- [ ] Exercise controlled sandbox provider outages, uncertain recovery, duplicate/out-of-order events and refunds.
- [ ] Verify ledger/allocation/refund records survive supported migration/backup/restore.

### PAY-08 — complete sandbox matrix
- [ ] Group and pass checkout/recurring/portal/refund/webhook browser and server cases on one identified candidate.
- [ ] Reconcile sandbox provider records with stored client/financial status and receipts.
- [ ] Review permissions, mobile/keyboard, failure states and financial/privacy operations; no real charge as a test.

Exit: actual Stripe sandbox evidence plus existing contracts and recovery checks. Local provider fixtures remain labelled synthetic.

## B4 — HUB-11 trusted uploads

- [x] Identify and configure an actual trusted private scanner in an isolated acceptance environment: ClamAV 1.5.4, current official signatures, loopback13310.
- [x] Exercise actual clean, recognised non-clean and unavailable scanner outcomes through the application UploadScanner: seven live checks plus one stopped-daemon check.
- [x] Exercise a simulated stalling scanner response and verify the whole-operation deadline: ERROR after20027ms, ongoing reads cannot defeat it, owned peer retires.
- [x] Verify quarantine, scanner leases, human review, concurrent/stale decisions and failed/revoked access: actual competing lease/review requests, stopped-scanner denial and current dual-database authority contracts.
- [x] Check type/size/filename limits, storage/download/tenant boundaries and no automatic publication: actual15MB parser rejection, cross-channel quota races/removal/retry and private download headers, plus current group/foreign-resource/five-file contracts.
- [x] Check the scanner-approved private upload/review/download UI on compact/tablet/desktop and keyboard:17 actual browser checks with real ClamAV,16 with scanner stopped. Viewports are emulated; physical acceptance stays B7.
- [x] Record scanner configuration/definitions/version and the isolated local environment without secrets; [current run](reviews/AUDIT_BATCH_RUN_2026_10_30.md).

Exit: real scanner protocol and application end-to-end proof; mocked CLEAN results are separate.

## B5 — native motion and polling

### MOTION-03 — cancellation and render lifecycle
- [x] Run the existing motion, Prism, delayed-observer, quality, resource and adaptive grouped checks on final2d02845d: all six deterministic suites pass; native probe explicitly remains unavailable and the group reports partial acceptance.
- [ ] Exercise rapid navigation, repeated activation, reverse/reset, offscreen return and context failure.
- [ ] Observe genuine native tab hiding/minimisation and return; confirm retirement/pause and exactly one restored scene.
- [x] Verify listener/canvas/request counts settle and reduced motion retains essential content in current deterministic regression; native hiding is separately unproven.

### HUB-10 — foreground conversation updates
- [ ] Test bounded polling, unread/read positions, reconnect and group/channel/project access changes.
- [ ] Observe real hidden-tab request retirement and deliberate foreground recovery.
- [ ] Verify revoked access cannot recover forbidden history and no unconfirmed write is replayed.

Exit: local regression and actual native visibility observations. If the environment never exposes hidden state, record unavailable and retain the native gate.

## B6 — complete private acceptance

### HUB-18 — all private roles/routes
- [x] Run current owner/team/client authentication, recovery, member/role, workspace/group/settings and upload/support fixture batches:23 suites pass after the documented mobile layout and theme-test corrections; [current run](reviews/AUDIT_BATCH_RUN_2026_10_30.md).
- [x] Run actual disposable-server session/role workflows, direct/negative API access and revocation/concurrency cases:31 actual role lifecycle plus38 actual owner/team/client browser checks; both database suites pass283tests each.
- [x] Run actual guarded PostgreSQL, browser-role isolation and populated recovery/compatible-candidate checks:283 PostgreSQL tests and57 populated recovery checks pass, including46 tables/139rows, schema/constraints, two sequences, media and representative browser-role denials.
- [ ] Complete the final hosted allowed/denied role and exceptional-state journeys using activated controlled accounts.
- [ ] Include keyboard, responsive layouts, private metadata and the B2/B4/B7 dependencies before accepting the parent.

### CLIENT-04 — complete staff/client journey
- [ ] Exercise assignment, enquiries/files, project correspondence, contact preferences and session revocation.
- [ ] Test concurrency/idempotency, mobile/keyboard, recovery and provider failure/retry.
- [x] Verify supported populated backup/restore on the current candidate and the compatible pre-layout-fix candidate:57 checks pass with synthetic financial snapshots and providers disabled.
- [ ] Verify final hosted boundaries with the same candidate scope; local backup/restore does not establish provider or production recovery acceptance.

Separate credential prerequisite: complete the invited restricted Codex account's password/MFA privately, then verify its exact three granted capabilities and denied owner capabilities. Existing owner MFA stays intact; no credential reset or authentication bypass.

Exit: every applicable real and fixture scope passes, with evidence separated. B2/B4/B7 are prerequisites for complete parent acceptance.

## B7 — PERF-03 physical and assistive checks

- [ ] Agree representative actual phone/tablet/touch and desktop/GPU devices and record model/OS/browser/viewport.
- [ ] Check sustained frame cost/thermal behaviour, quality downshift/recovery, touch scrolling, orientation and context recovery.
- [ ] Check public and representative private journeys with real keyboard/assistive technology, enlarged text and zoom/reflow.
- [ ] Review focus/labels/announcements/contrast, essential content and reduced-effects fallback.
- [ ] Retain actual device observations; viewport emulation and desktop GPU measurements remain separate evidence.

Exit: the real device/assistive matrix passes. Device availability cannot be inferred from a desktop viewport.

## B8 — final release and review

### RELEASE-02 — final candidate
- [ ] Confirm applicable preceding gates, exact source scope and approved public content.
- [ ] Produce the final frontend/backend/database/browser/package/recovery results and candidate hash.
- [ ] Verify the authorised Render revision, asset bytes, real routes, approved integrations and current error logs.
- [ ] Complete post-deployment authenticated role/session and controlled provider acceptance without replaying earlier mutations.
- [ ] Resolve failures and record rollback/data/provider boundaries; final candidate acceptance requires the phase reviews below.

### Separate owner phase sign-offs
- [ ] **PHASE-A:** Review and accept foundations and representative designs with the current evidence.
- [ ] **PHASE-B:** Review and accept shared experience and opening, including cancellation/fallback behaviour.
- [ ] **PHASE-C:** Review and accept the complete homepage with approved live work.
- [ ] **PHASE-D:** Review and accept Services/Contact/Support and their connected normal/failure journeys.
- [ ] **PHASE-E:** Review and accept portfolio/case studies, real images and publication boundaries.
- [ ] **PHASE-F:** Review and accept remaining public/informational pages with confirmed facts.
- [ ] **PHASE-G:** Review and accept owner studio and applicable private roles/journeys.
- [ ] **PHASE-H:** Review and accept the final release candidate and residual operational arrangements.

These are James's product/release reviews. Automated tests prepare the reviewable result; they do not substitute for his acceptance.

## Evidence and batch log

Store machine-local logs/reports under ignored `.codex-runtime/qa/audit-batches-2026-10-30/`; portable summaries belong in `docs/reviews/`. Do not commit credentials, databases, private screenshots or real invitation tokens. Batch summaries must list candidate/source, commands, counts, failures/fixes, skipped scopes, remaining prerequisites and next action.

| Date | Batch | Action/result |
| --- | --- | --- |
| 30 October | B0 | Source/audit inventory reviewed; plan covers all 24 open named items and eight phase sign-offs. Current dependency mismatch found; exact-lock restore authorised and started. Current H2 backend test batch started. |
| 30 October | B1 | James explicitly confirms all requested operating facts are undecided; policy publication remains pending. |
| 30 October | B0 | Corrected H2 baseline passes283/16/0 failures/errors/skips. Production frontend/dependency/asset checks and exact162-file package inventory pass. Font text uses upstream LF on Windows;12 reviewed poster captures refresh stale renderer provenance. Initial old-resource failure and the tool-interrupted rerun are not counted as passes. |
| 30 October | B3 | James reconnected Stripe and selected Crystal Production LTD sandbox, acct_1TFxT1FtqSI9Oxmn, livemode=false. Its existing portal is active; no webhook endpoints exist. Backend test-key handoff and a local signed-event listener remain prerequisites. Sandbox display name is not confirmation of legal/trading facts. |
| 30 October | B4/B6 | Approved portable PostgreSQL17.11 and ClamAV1.5.4 downloaded from official distributions. PostgreSQL runs on127.0.0.1:55447 with disposable QA data. ClamAV signatures downloaded and validated; daemon/application acceptance still pending. Existing database/browser runners now honour PG_BIN without widening target guards. |
| 30 October | B6 | Current PostgreSQL suite and23 sequential private fixture suites started. First owner UI suite passes41checks; remaining results are in progress, not accepted in advance. |

References: [main audit](CRYSTAL_POWERS_2_0_AUDIT.md), [current overview](reviews/AUDIT_OVERVIEW_2026_10_30.md), [latest handover](CODEX_SESSION_HANDOVER.md), [design goal](FRONTEND_DESIGN_GOAL_2_0.md), [release/recovery](RELEASE_CANDIDATE_2_0.md), [company email](COMPANY_EMAIL_SETUP_2_0.md).
