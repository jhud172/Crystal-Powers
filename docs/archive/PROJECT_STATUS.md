# Project status — 13 September 2026

Crystal Powers is an immersive portfolio and enquiry website with an owner publishing studio. The rebuild is on `James/immersive-rebuild`, based on verified upstream `6bfba8d`; it has not been pushed or deployed.

## Implemented

- React 19 / TypeScript / Vite frontend, Spring Boot 3.5.16 backend.
- Complete public design across home, work, case studies, services, studio, support, contact and errors; existing birthday route and legacy redirects retained.
- Original Blender crystal, laptop, monitor and phone, editable scenes, light/dark Cycles images, cinematic films and real interactive GLBs. Five appearance preferences, keyboard controls, reduced motion, static fallbacks and one active canvas.
- `/admin` owner setup, password plus mandatory authenticator MFA, single-use recovery, session renewal, account security and password reset.
- Private drafts, immutable revisions, restoration, preview, screenshot uploads, publication, unpublication, featured ordering and recoverable archive. Older unverified sample projects remain private.
- PostgreSQL/Flyway production data, protected private Supabase media, HTTPS Resend integration and preserved enquiry validation/upload contracts.
- Server-generated public metadata, sitemap, noindex for private routes, CSRF/session protection, throttling and sanitised images.

## Validation and launch

Read `REBUILD_QA.md` for completed checks and limits, `OWNER_STUDIO.md` for publishing, and `DEPLOYMENT.md` for account configuration and recovery. Local mail is intentionally disabled. Real Supabase storage, delivered email, public owner enrolment, DNS and live deployment still require James's accounts and approval.

The existing Render service in My Workspace uses Starter and auto-deploys main. The new blueprint requests free hosting with automatic deployment disabled; it has not changed that service. Do not merge or push main before resolving this launch boundary.
