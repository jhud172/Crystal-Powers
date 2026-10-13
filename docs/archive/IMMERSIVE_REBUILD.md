# Crystal Powers immersive rebuild

## Agreed outcome

Rebuild every public page as James's flagship business website, retaining Crystal Powers and the crystal motif. James is Founder & CEO and currently the sole operator. Build photographic light/dark experiences using original Blender models, renders and authored animation plus live interactive GLB project displays. Retain public routes, birthday experience, legacy redirects, enquiry contracts and existing theme preferences.

The admin editor must support owner email/password + authenticator MFA, recovery, secure sessions, private project drafts/revisions/media, preview/publish/unpublish/feature/order/archive, and immediate public showcase updates without code changes. PostgreSQL migrations, object storage, backup/restore, deployment configuration, security tests and visual/runtime evidence are required.

Free plans only: Render, Supabase database/storage, Resend HTTPS email. No purchases or automatic upgrades. Secrets, account access, DNS and public deployment are separate user-controlled gates. Required dependency installation is explicitly authorised in the conversation.

## Art direction

Visual thesis: optical glass and sculpted metal photographed with generous negative space, matching daylight and graphite lighting, and precise oversized typography.

Content plan: crystal introduction, selected real projects, website/app/system capabilities, founder-led process, clear enquiry. Each section has one purpose; avoid ornamental dashboards and generic card mosaics.

Interaction thesis: a Blender-authored crystal reveal, project screens inside inspectable Blender device models, and short coordinated transitions between views. Normal scrolling, semantic text, visible keyboard focus and static fallbacks remain available.

## Delivery gates

- [x] Inspect architecture, skills, ownership, dependencies and upstream changes.
- [x] Create `James/immersive-rebuild` from verified upstream `6bfba8d`; preserve untracked local files.
- [x] Restore dependencies; record current baseline build/browser/backend evidence.
- [x] Create editable crystal, laptop, monitor and phone Blender assets; verify geometry/materials/animations and exported GLBs.
- [x] Produce matched light/dark hero and device renders, cinematic clips, optimised images and asset manifests.
- [x] Implement and visually verify complete homepage-to-project milestone.
- [x] Redesign all public routes, theme controls, navigation, footer, errors and forms.
- [x] PostgreSQL schema, migrations, protected media and project revisions/publication APIs.
- [x] Owner setup, login, MFA, recovery, session/CSRF/rate limiting and access tests.
- [x] Admin editor, private previews, upload/publish/order/archive and anonymous-session verification.
- [x] Preserve enquiry contract; add HTTPS email transport, failure tests and deployment configuration.
- [x] Route metadata/sitemap, load/runtime budgets, responsive/accessibility/fallback QA.
- [x] Spring production package, database restart/persistence and backup/restore rehearsal.
- [x] Final Linux container build and 512 MB runtime smoke check.
- [ ] Physical-phone frame-rate certification (requires an actual handset).
- [ ] User-owned external setup, live deployment and externally verified publishing/email.

## Verification boundaries

Do not label a build as visual proof, a Blender source file as render proof, an exported GLB as browser interaction proof, or local publishing as a verified live deployment. Do not publish the current portfolio's unverified client/outcome claims: seed those entries as private drafts.

Performance budgets: independently loaded mobile scene <=5 MB, desktop scene <=10 MB; cinematic video deferred. One active canvas, bounded DPR, offscreen pause, mobile detail reduction. Validate 30 fps minimum on the actual tested mobile device; desktop smoothness and page-load measures must be recorded rather than asserted.

## Progress log

- 2026-09-13: full rebuild goal created. Working branch starts from current upstream. Local Vite installation was incomplete; restoration started. Blender 5.2 executable and RTX 3070 Ti are available; MCP connection is unavailable, so use isolated background Blender processes.

- 2026-09-13: public routes, original Blender scenes/stills/films/GLBs, owner MFA and publishing, PostgreSQL protection, private media, revision restore and recovery implemented. H2 and PostgreSQL suites each passed 23 tests. Dependency scan reports no known findings in 68 runtime packages. Combined database/media restoration and integrity guards passed. See `REBUILD_QA.md` for evidence and honest limits.
- Read-only Render inspection found Crystal Powers in My Workspace on Starter with automatic main deployment. No external settings, credentials, DNS, push or deployment changed.
