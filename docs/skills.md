# Technical guidance — Crystal Powers

The maintained instruction catalogue is [docs/skills/README.md](skills/README.md). Read its mandatory and relevant task skills. The older architecture/effects reference is archived as [technology history](archive/TECHNOLOGY_HISTORY_1_1.md); it refers to removed systems and is not an implementation guide.

Current stack: React 19, TypeScript, React Router, Vite 6, Tailwind 4 with the official PostCSS adapter, Three/Fiber/Drei for retained device stages, Spring Boot 3.5/Java 17, JDBC/Flyway and PostgreSQL/H2. Read package.json, its frontend lockfile and build.gradle for actual pinned/resolved versions.

Ownership is described in [project structure](PROJECT_STRUCTURE.md). Use semantic tokens, native accessible controls, shared motion policy and explicit resource cleanup. Server services enforce capabilities and resource isolation; repositories own SQL. No general frontend lint/test npm script is configured; use the documented build and applicable contract/browser/backend checks.
