# Frontend dependency review — 10 October 2026

## Current cleanup scan —12October2026

James authorised a cleanup verification checkpoint. npm audit --json returns exit0 and zero advisory counts across all severities for the installed/locked frontend tree; the Tailwind4/PostCSS production build also passes. The ignored raw report is .codex-runtime/qa/cleanup-2026-10-12/npm-audit.json. This supersedes the preceding pending-scan status and dated findings, while browser/CSS/final release acceptance remains open. It is not a runtime security assessment or an eternal advisory guarantee.

## Superseding implementation checkpoint — 12 October 2026

James explicitly authorised updates and migration. Installed Tailwind 4.3.3, its 4.3.3 PostCSS adapter and PostCSS 8.5.29; updated the compatible source-map-js dependency. Removed GSAP/@gsap/react/Motion after active production/development source inspection found no consumers, and removed the separate autoprefixer adapter. Updated the PostCSS configuration and CSS import/config directives, retaining the existing Tailwind configuration and former border default. Package and lockfile are changed. Installation used `--ignore-scripts --no-audit`; no advisory rescan, build or browser test has run. The preceding advisory findings below are historical, and the remediation gate remains open until final verification.

Official migration references: [Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide) and [PostCSS installation](https://tailwindcss.com/docs/installation/using-postcss). Tailwind 4’s browser baseline is Chrome111, Safari16.4 and Firefox128; final compatibility acceptance must cover supported visitors. No new animation library is needed for the selected Liquid Light interaction.

Read-only `npm audit --json` refreshed the installed/locked frontend findings: **8 affected packages, 6 high / 2 moderate, no critical**. The ignored raw report is `.codex-runtime/qa/npm-audit-pc.json`. No package, lockfile or installed dependency was changed. This is a failed advisory gate, not proof that the public Spring application is remotely exploitable.

| Root advisory | Current path | Remediation |
| --- | --- | --- |
| [Braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | Tailwind 3 → Chokidar / fast-glob / micromatch → braces | No patched braces version is listed. npm proposes Tailwind 4.3.3, a major migration removing the affected path; do not force-install without checking the resulting tree and CSS. |
| [Selector parser CPU exhaustion](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | Tailwind 3 → postcss-nested → postcss-selector-parser | Patched parser is 7.1.6; current compatible tree needs review alongside the Tailwind migration. |
| [Source-map indexed-section exhaustion](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | Build-tool PostCSS → source-map-js | Patched source-map-js is 1.2.2; resolve within the existing compatible range, inspect lockfile and rescan. |

The eight entries include dependent packages inheriting severity from these three advisories. Tailwind is actively used: `postcss.config.js`, `tailwind.config.ts`, `styles/base/studio-base.css` directives and utilities. It cannot simply be deleted. Current production delivers compiled CSS/JavaScript through Spring; its visitor enquiry/upload APIs do not accept arbitrary Tailwind patterns, selectors or source maps. This source inspection narrows the known exposure to the build/development pipeline; it is not a complete exploit analysis or an accepted release exception. Keep development servers loopback-only and builds restricted to trusted source.

## Concrete proposed change, awaiting dependency-install authority

1. Update compatible existing transitive dependencies to their patched releases and rescan.
2. Evaluate Tailwind 4.3.3 with its supported PostCSS adapter; migrate the existing configuration/directives and legacy `@apply` rules while preserving final computed styles and the five appearances.
3. Compare the resulting dependency tree/lockfile and compiled CSS; reject any migration that retains the unpatched braces path or alters the public/owner/personal experience unexpectedly.
4. Run frontend build, animation contract, affected public/owner/birthday browser suites, advisory scan and packaged backend tests. Keep the advisory gate open until those checks pass; revert dependency/config/CSS changes together if needed.

Repository `AGENTS.md` instruction 8 says: “Do not install dependencies unless the user explicitly authorises it.” The broad 2.0 goal does not remove that explicit installation restriction. No installation or forced major upgrade has been performed. Independent design, asset and performance work can continue meanwhile.
