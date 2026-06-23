# 00 - Session Start

## Purpose

Use at the start of every implementation session to establish current repository state before editing.

## Required Reading

Read these first:

- `docs/CODEX_SESSION_HANDOVER.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/agent.md`
- `docs/content.md`
- `docs/memory.md`
- Relevant files under `docs/skills/`

Do not assume documentation is fully current. Compare it against actual code.

## Mandatory Rule

Do not begin implementation until the relevant architecture, ownership and dependencies have been inspected.

## Start Checklist

1. Inspect current branch.
2. Inspect Git status.
3. Read recent commits.
4. Check uncommitted changes and avoid overwriting unrelated work.
5. Identify whether the task affects frontend, backend, shared contracts, build pipeline, content, or design system.
6. Read requested files before editing.
7. Verify relevant dependencies and scripts.
8. State the scope before making changes.
9. Run only relevant commands during implementation.
10. Run full verification before finalising significant work.

## Failure Conditions

- Starting edits before inspecting ownership and dependencies.
- Reverting or overwriting unrelated user work.
- Treating docs as truth without checking code.
- Running broad commands that are unrelated to the task.

## Reporting

Report branch, status, affected areas, files read, files changed, commands run, verification results, skipped checks, and risks.

