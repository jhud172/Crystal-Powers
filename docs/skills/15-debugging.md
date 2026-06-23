# 15 - Debugging

## Purpose

Use for bugs, failed builds, broken UI, API failures, regressions, and unexpected warnings.

## Process

1. Reproduce.
2. Capture the exact error.
3. Identify the owner: frontend, backend, API contract, CSS, build, or deployment.
4. Inspect recent changes.
5. Form a minimal hypothesis.
6. Test one change at a time.
7. Verify root cause.
8. Add regression protection where appropriate.
9. Re-run relevant tests.
10. Report root cause and fix separately.

## Prohibited

- Random package changes.
- Broad rewrites for isolated bugs.
- Hiding warnings.
- Suppressing errors without understanding them.
- Changing multiple unrelated systems simultaneously.

