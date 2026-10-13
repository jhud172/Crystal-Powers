# Crystal Powers project structure

React/TypeScript/Vite owns UI. Spring Boot/Java 17 owns APIs, validation, private media, email, persistence, authentication and production frontend hosting.

| Area | Owner |
| --- | --- |
| App routes, shell, navigation, metadata | frontend/src/app |
| Public route composition | frontend/src/routes |
| Liquid Light hero and retained device stages | frontend/src/features/experience |
| Owner authentication, publishing, members UI | frontend/src/features/admin |
| Private team login, conversations, support, delegated projects and financial operations | frontend/src/features/team |
| Private client activation, project conversations, billing and contact preferences | frontend/src/features/client |
| Public portfolio and project presentation | frontend/src/features/portfolio |
| Enquiry/services/studio/support features | frontend/src/features |
| Tokens, shared controls, route/feature CSS | frontend/src/styles |
| Editable Liquid Light preview | frontend/design/observatory.html, features/design/LiquidLightDraft.tsx |
| Controllers/security/services/repositories | src/main/java/com/crystalpower/website |
| Schema/hosted restrictions | src/main/resources/db/migration, src/main/java/db/migration |
| Original model recipes/scenes | assets/blender |
| Approved Clare source material | assets/portfolio/clares-life-celebrations |
| Font provenance/delivery/licences | assets/fonts, frontend/public/fonts/manrope |
| Current plans and operating guides | docs root and docs/skills |
| Technical reviews and historical records | docs/reviews and docs/archive |
| Print deliverables | output/pdf |

Vite builds frontend/dist; Gradle copies it to Spring static resources. Spring serves the SPA and APIs, with legacy redirects and server-rendered metadata. Only published project revisions/media are public. The old Thymeleaf templates, unused prototypes, root npm lockfile/static sitemap and tracked logs were removed. bin/target/build/node_modules/runtime directories are generated or local, not source. bin is untracked; bin and logs are ignored.

Keep the legacy catalogue/importer and existing migrations reproducible; they are private historical drafts, not approved public projects. Public images are retained only when needed by active data/tools or protected provenance. Refer to [cleanup record](CLEANUP_2_0.md), [audit](CRYSTAL_POWERS_2_0_AUDIT.md) and [historical structure](archive/STRUCTURE_HISTORY_2026_10_12.md).

Current schema migrations are V1-V60 across SQL and Java migration directories. New source-only workflows and security migrations require final H2/PostgreSQL/backup acceptance. InvitationEmail is a shared admin/client-access feature, and MessageAttachments is shared by conversation and moderator queues. [Current handover](CODEX_SESSION_HANDOVER.md) and [release readiness](RELEASE_CANDIDATE_2_0.md) distinguish connected source from accepted behaviour.
