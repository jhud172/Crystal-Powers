# Repository Reconciliation Report

**Date:** 2026-06-23  
**Branch:** `main`  
**Scope:** documentation and repository-state reconciliation only. No application behaviour, routes, APIs, validation, email delivery, uploads, SPA fallback, legacy redirects, frontend UI, backend code, dependency manifests or build configuration were changed.

## 1. Summary

The repository is a React 19 + Vite 6 + TypeScript frontend under `frontend/`, served in production by a Spring Boot backend under `src/`. The active public UI is the React SPA. Spring Boot owns API endpoints, validation, contact processing, upload validation, email delivery hooks, legacy redirects, SPA fallback and production static hosting.

The reconciliation confirmed that the current architecture is mostly consistent with the handover, but several older documents still describe a pre-interaction-foundation state. Those stale statements have been marked or corrected where doing so is documentation-only.

## 2. Git State

- Current branch: `main`
- Tracked application files changed in this task: none
- Existing untracked handover/skills files remain:
  - `AGENTS.md`
  - `docs/CODEX_SESSION_HANDOVER.md`
  - `docs/skills/`
- New documentation created in this task:
  - `docs/ADVANCED_EXPERIENCE_DEPENDENCIES.md`
  - `docs/REPOSITORY_RECONCILIATION_REPORT.md`
- Documentation updated in this task:
  - `docs/ADVANCED_EXPERIENCE_AUDIT.md`
  - `docs/ADVANCED_EXPERIENCE_STRUCTURE.md`
  - `docs/PROJECT_STATUS.md`
  - `docs/agent.md`

## 3. Architecture Confirmed

- React owns public page rendering, routing, layout, navigation, footer, theme switching, page UI, form UI state and the Three.js hero.
- Spring Boot owns `/api/contact`, `/api/services`, validation, contact/service enquiry processing, upload validation, mail sending, legacy redirects, SPA fallback and production hosting.
- Vite dev server proxies `/api` to `http://localhost:8080`.
- Gradle orchestrates production frontend integration by running the frontend build and copying `frontend/dist` into Spring static resources during `processResources`.

## 4. Active Routes

Verified from `frontend/src/app/App.tsx`:

- `/`
- `/home` redirects to `/`
- `/about`
- `/services`
- `/portfolio`
- `/portfolio/:slug`
- `/support`
- `/contact`
- `*` renders `NotFound`

## 5. Active API And Web Ownership

- `ApiInquiryController` handles both `POST /api/contact` and `POST /api/services`.
- `LegacyRouteController` redirects legacy `.html` routes.
- `SpaController` forwards extensionless public routes and fallback routes to `index.html`.
- No Java controller currently returns a Thymeleaf view name.

## 6. Dependency State

Installed frontend dependencies include:

- `three`
- `@react-three/fiber`
- `@react-three/drei`

Not installed:

- `gsap`
- `@gsap/react`
- `motion`
- `framer-motion`
- `lenis`
- `@react-three/postprocessing`
- `postprocessing`

Therefore, there is no central GSAP registration, ScrollTrigger registration or Motion provider/configuration to maintain yet.

## 7. Three.js Hero State

The homepage crystal remains a real WebGL scene in `frontend/src/components/hero/CrystalOpenerScene.tsx`. It uses React Three Fiber, Drei, procedural geometry, physical materials, transmission/IOR, orbit rings, sparkles, Suspense/lazy loading and a non-WebGL fallback. No crystal code was changed.

## 8. Interaction Foundation State

The current implementation includes:

- IntersectionObserver scroll reveal
- cursor aura pointer tracking
- `[data-tilt]` interactions
- reduced-motion checks
- pointer capability handling
- route-aware reveal refresh in the layout
- central interaction lifecycle in `Layout`
- progressive enhancement so content remains visible when JavaScript is unavailable

Old dead CSS systems `body.is-overdrive` and `.site-secret-node` were not found in active source. `.site-shell` still exists as a class in current styles and should not be treated as dead without checking usage.

## 9. Reusable Component State

Reusable advanced-experience components exist under:

- `frontend/src/components/motion/`
- `frontend/src/components/effects/`
- `frontend/src/components/ui/`
- `frontend/src/components/three/`
- `frontend/src/features/home/`
- `frontend/src/features/portfolio/`
- `frontend/src/features/navigation/`
- `frontend/src/lib/performance/`
- `frontend/src/lib/three/`
- `frontend/src/types/`

Several of these are currently scaffolding or reserved components and are not integrated into public route markup.

## 10. Branding Reconciliation

Active React content uses the public brand `Crystal Powers`.

Old or risky brand references were found in inactive Thymeleaf templates under `src/main/resources/templates/`, including a singular old brand variant. These templates are not currently returned by controllers and appear to be historical remnants. They were not edited in this task because they are application resources and changing them would require full application verification. Future cleanup can either remove the inactive templates after evidence or update their brand text as part of a tested backend resources task.

Internal names such as package names, Java package names, Gradle project names, deployment names and filesystem paths still contain `crystal-power`, `Crystal-Production` or `com.crystalpower`. These are internal identifiers and should not be renamed casually.

## 11. Static And Asset Reconciliation

Confirmed active public assets include:

- `frontend/public/favicon.svg`
- `frontend/public/site.webmanifest`
- `frontend/public/animations/cp-logo-crystal-ufo-highres.gif`
- `frontend/public/animations/cp-logo-crystal-ufo-highres.webp`
- key images referenced by React route data and components

Suspected inactive or historical assets remain in `frontend/public/` and tracked QA screenshots/logs remain under `frontend/`. They were not removed because this task did not perform source cleanup and deletion needs stronger evidence plus verification.

## 12. Documentation Inconsistencies Resolved

- `docs/agent.md` now names `ApiInquiryController` for both active API endpoints.
- `docs/PROJECT_STATUS.md` no longer claims inactive Thymeleaf source templates have been removed.
- `docs/ADVANCED_EXPERIENCE_STRUCTURE.md` now clarifies that some directories are reserved concepts, not current directories.
- `docs/ADVANCED_EXPERIENCE_AUDIT.md` now states it is historical and superseded by later interaction-foundation work.
- `docs/ADVANCED_EXPERIENCE_DEPENDENCIES.md` was created because the dependency document referenced by onboarding did not exist.

## 13. Documentation Still Requiring Care

- `docs/ADVANCED_EXPERIENCE_AUDIT.md` remains mostly historical and should not be used as a live implementation checklist.
- `docs/skills.md` is an older skill/reference document. The newer repository-local skills live under `docs/skills/` and should be the primary guidance for future Codex sessions.
- `docs/CODEX_SESSION_HANDOVER.md` is currently untracked but should remain as the current permanent handover document.

## 14. Pre-existing Issues And Deferred Cleanup

Pre-existing issues not introduced by this task:

- inactive Thymeleaf source templates remain under `src/main/resources/templates/`
- stale brand text exists inside those inactive templates
- tracked QA screenshots and Vite preview logs exist under `frontend/`
- several advanced-experience components are scaffolded but unused
- some public assets appear historical or unused by active React routes
- internal package/project identifiers still reflect older naming

No files were deleted or moved.

## 15. Verification Performed

Because only documentation and agent-instruction files were changed, frontend and backend builds were not run.

Verification performed:

- inspected Git branch and status
- inspected recent commits
- searched for old branding across non-generated source
- searched generated/ignored build output separately
- inspected route ownership
- inspected API/web controller ownership
- inspected dependency manifests
- inspected active and inactive static/template resources
- checked changed-file scope with Git

## 16. Recommended Next Task

Recommended next implementation task: perform a tested inactive-resource cleanup plan for `src/main/resources/templates/`, tracked QA screenshots/log files, and suspected unused public assets.

Suggested order:

1. Prove inactive Thymeleaf templates are not routed or packaged as required runtime views, then remove or archive them in a tested cleanup.
2. Remove tracked generated QA screenshots/logs if they are confirmed non-source artefacts.
3. Audit `frontend/public/` image usage and remove stale assets only after route rendering and build verification.
