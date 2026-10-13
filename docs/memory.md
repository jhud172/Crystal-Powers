# Project decisions — Crystal Powers

This repository note points to current decisions. The older June implementation is retained in [historical decisions](archive/DECISION_HISTORY_2026_06.md).

- Public brand: Crystal Powers; founder: James; British English and factual public claims.
- Selected2.0 design: Liquid Light. Existing appearances and original device/Blender sources remain. The unused old opening component is removed.
- Public client approval: Clare’s Life Celebrations only. Portable screenshots/content are source material until real upload IDs and publication review are completed.
- Architecture: React/Vite frontend and Spring Boot APIs/production host; preserve routing, validation, uploads, mail and publishing contracts.
- Security: singleton owner remains protected; admins provision team accounts with trusted roles, private activation, MFA and server-side capability/resource checks. No public elevated-role selector.
- Expanded hub: text channels/groups/customisation, moderation and support tracking. See [team scope](TEAM_HUB_2_0.md) for implemented foundations and missing features.
- Dependency migration authorised 12 October. Tailwind 4/PostCSS adapter installed; no GSAP/Motion consumers remain. Rescan and visual compatibility acceptance are still required.
- Company mailbox/provider, legal operator and retention/support policies are undecided; do not invent them or make outbound/provider changes without actual details.
- Working order: complete implementation, then final test/fix/retest. The12October cleanup check is an explicitly requested exception, not full release acceptance.

Use [handover](CODEX_SESSION_HANDOVER.md), [audit](CRYSTAL_POWERS_2_0_AUDIT.md) and source as current evidence. Historical accumulated test counts are not fresh passes.
