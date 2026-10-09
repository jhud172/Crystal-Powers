# Codex session handover — Crystal Powers 2.0 continuation

Date: 9 October 2026. Branch: `James/crystal-powers-2-completion`, based on `origin/James/immersive-rebuild` at `c66e3d0`. Worktree: `C:\Users\James Hudson\.codex\worktrees\crystal-powers-2-completion\Crystal-Production`. The original checkout remains on main at `6bfba8d` with untracked `clipmind/` preserved.

The latest audit/checklist was found on the immersive-rebuild branch, not main. Use `CRYSTAL_POWERS_2_0_AUDIT.md` and `CRYSTAL_POWERS_2_0_PROGRESS.md` to continue. Main does not contain the newer public/owner implementation; do not modify the old crystal expecting the rebuilt homepage to change.

## Current changes

Added shared semantic palettes, stronger form borders, consistent navigation and a compact mobile project CTA. Added persisted Reduce effects, CSS suppression and active canvas/film disposal. Homepage now handles loading/empty/error/retry rather than silently dropping the showcase.

Three representative development-only visual drafts exist at `/design/observatory.html`: Homepage, Services builder and Case study. They import shared tokens/pricing; no enquiry submission or actual client claim. They are not mounted by `App.tsx` or included in the normal production bundle. James has not accepted their visual direction or the complete 2.0 release.

Opening: `animationContract.ts` selects existing authored clips by exact name with an explicit legacy single-clip fallback; the Observatory uses strict open/close names. Viewer loading has a 12-second visibility-aware timeout, first-frame readiness and cache-evicting Retry; malformed/slow synthetic assets recovered and were restored byte-for-byte. `build_observatory.py` adds original eight-facet geometry, an engineered frame, sixteen pivots and `CrystalOpen`/`CrystalClose` (~1.4 seconds), with separate source scenes/posters. The public homepage now mounts `CrystalOpening.tsx` with optional loading/open/close/skip/replay/static states, while copy/CTAs stay available. Complete project-window masking, material/poster matching and full cancellation acceptance remain pending. The separate draft previews rendered rest/open states only. See the progress record for actual-width/mobile behaviour and current QA evidence.

James authorised installing Blender. Official checksum-verified 5.2.2 LTS portable runtime is under `%LOCALAPPDATA%/Programs/Blender/blender-5.2.2-windows-x64/`. Current GPU is Intel Iris Xe; old RTX environment assumptions do not apply. Cycles uses CPU and full poster regeneration takes several minutes. Consult the progress document for latest build/render/manifest evidence before ticking any acceptance item.

## Environment and verification

James explicitly authorised `npm ci`; existing frontend dependencies were restored without changing package manifests/lockfile. Baseline and implementation frontend builds passed, with the existing oversized Three vendor warning. Eight npm audit findings remain (six high, two moderate) in existing build tooling. No force-fix or major upgrade was performed.

Relevant browser evidence covers 320–1920 px public-shell/draft overflow, desktop/mobile draft screenshots, five semantic palettes and targeted contrast, Escape/focus, preference persistence, one ready crystal canvas and disposal when reducing effects. Showcase empty/error/retry was checked against a temporary synthetic local API, now stopped. Post-birthday route loading was smoke checked.

Backend tests did not execute: Gradle failed with `Unable to establish loopback connection`, including no-daemon/IPv4/Java 17 attempts. No system networking/security changes were made. Full authenticated owner flows, physical-phone performance, actual email, providers and deployment remain unverified in this continuation.

Evidence lives under ignored `.codex-runtime/qa/`; do not publish it as client content. The synthetic fixture served only project-list responses and did not create a database or owner account. Vite remains available on `http://127.0.0.1:5175` for review. Restart with `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5175` if needed.

## Next work and boundaries

Review the three draft compositions, then continue the segmented crystal/frame and explicit animation contracts. Define enquiry intent and reset/continuity contracts before converting the actual Services/Contact/Support flows. Real project publication requires truthful permission-cleared content; privacy/support details must reflect actual operations.

No changes were pushed, merged, published or deployed. The existing live Render service auto-deploys main; its hosting, Supabase/private storage, Resend, owner enrolment, DNS and real email receipt remain separate account-level actions. Read `OWNER_STUDIO.md`, `DEPLOYMENT.md` and `REBUILD_QA.md`; preserve their security and evidence boundaries. Retain this attached worktree until its changes are integrated or deliberately archived.
