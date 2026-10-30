# Crystal Powers 2.0 laptop handover —19 October2026

> Current continuation, 30 October: this checkout pulled main at8d5bf15 and subsequently committed/pushed the completion batch as **f200fca**, now verified LIVE on Render with20read-only checks. Use main and the [current batch checklist](AUDIT_COMPLETION_BATCHES_2_0.md), [handover](CODEX_SESSION_HANDOVER.md) and [overview](reviews/AUDIT_OVERVIEW_2026_10_30.md). The branch, non-deployed publication state and pending provider statements below describe the historical 19 October handoff. Current production includes the 30 October application release and Clare's approved live publication; full acceptance remains open.

Continue on `James/crystal-powers-2-completion`. All current source, assets, migrations, QA scripts and audit notes belong to this handoff. This is a development handoff, not a production release or deployment. The full goal remains unfinished.

## Get the PC changes

From the laptop checkout, first inspect `git status` and preserve any laptop edits. Then:

```powershell
git fetch origin
git switch James/crystal-powers-2-completion
git pull --ff-only
git log -1 --oneline
git status --short
git rev-list --left-right --count HEAD...origin/James/crystal-powers-2-completion
```

The last command should show `0 0`. If local work diverges, reconcile it without resetting or discarding it. Do not switch/push `main` as a shortcut: it may trigger deployment.

## Latest finished batch

- Fixed enlarged Show/Hide labels by preventing the password toggle from shrinking.
- Fixed readiness controls hidden beneath the editor toolbar. One owned ResizeObserver measures its actual height; large screens keep a bounded, scrollable readiness panel below it. Narrow/short screens and missing-observer browsers use ordinary document flow. Observer disconnects on unmount.
- Added shared forward/reverse Tab looping only inside native modal publication, refund, reauthentication and image dialogs. Escape, native inert background, browser shortcuts, explicit consent, pending-operation restrictions and return-focus handlers remain.
- Added opt-in private visual/input audits to existing synthetic functional journeys, preserving their original assertions and form values.

Final frontend build and bootJar pass. Nine functional/rendered suites pass **565 checks**; seven embedded private audits pass **730 additional checks across16 states**, including3,806 solid-text samples, reflow/doubled text, focused-control hit-testing and forward/reverse native Tab. Total **1,295 checks** for this scoped batch. The interrupted owner-session suite was restarted only after its handle and process were confirmed absent, then passed all24 functional checks plus29 private checks.

Current packaged artifact SHA256: `89de812ded2e78fcbb060693cd30e478c06927e1861b70e1682896713d3dc116`. All146 frontend outputs match; all615 non-frontend archive entries match preceding `1ab932…` (and the earlier full backend gate). Previous256 H2/256 PostgreSQL and41 populated recovery tests retain that exact backend-byte scope; they were not rerun for these frontend changes. Existing deferred Three chunk warning remains. No real provider call, publication, account creation or live deployment was performed.

Local ignored evidence: `.codex-runtime/qa/private-design-final-inventory.json`, `private-design-d5/*/report.json`, screenshots and `private-design-final-*.log`. These runtime artifacts/JARs are not Git deliverables; portable scripts and this evidence summary are committed. Historical failed results are preserved locally under `private-design-failed-20261019`.

## Recreate local build and QA fixtures if needed

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run build
New-Item -ItemType Directory -Force .codex-runtime/qa/approved-clare | Out-Null
Copy-Item assets/portfolio/clares-life-celebrations/desktop.jpg .codex-runtime/qa/approved-clare/desktop.jpg
Copy-Item assets/portfolio/clares-life-celebrations/mobile.jpg .codex-runtime/qa/approved-clare/mobile.jpg
```

Use local Playwright/Edge paths for `CRYSTAL_PLAYWRIGHT_MODULE` and `CRYSTAL_BROWSER_EXECUTABLE`; do not assume the PC runtime paths exist on the laptop. The built-preview verifiers use loopback8084 with explicit synthetic API interception. Set `CRYSTAL_QA_URL=http://127.0.0.1:8084` and `CRYSTAL_PRIVATE_DESIGN_AUDIT=1` to enable embedded panel acceptance. The preview server is not a running backend. Keep actual `.env`, credentials, private media and databases local; they are intentionally excluded from Git.

## Continue from here

Use [the design goal](FRONTEND_DESIGN_GOAL_2_0.md) and [main audit](CRYSTAL_POWERS_2_0_AUDIT.md). Finish remaining private settings, groups, uploads/moderation, delegated editor and client conversation exceptional-state visual/input acceptance; then remaining page-by-page/performance/assistive/device gates and final complete applicable regression. Modals in this batch are inspected in their current appearance; do not call that all-theme modal acceptance. No broad all-page or DONE parent is newly completed by this handoff.

Only Clare’s Life Celebrations is approved public client work. Keep Liquid Light and autonomous hero motion. Stripe/GBP/deposit-balance/explicit optional monthly support are approved. Legal identity, company email/domain, retention and aftercare terms remain **undecided**; real mailbox/provider, physical-device and deployed acceptance remain open. Do not invent facts, publish synthetic fixtures or turn a local green gate into release approval. Keep substantial implementation batches followed by grouped checks/fixes; do not rebuild/test the whole app after every small edit.
