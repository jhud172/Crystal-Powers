# 22 - Refactoring

## Purpose

Use for behaviour-preserving structure changes.

## Rules

- Preserve behaviour.
- Define boundaries before editing.
- Avoid mixed refactor and feature work.
- Move in small stages.
- Keep tests passing.
- Update imports.
- Remove dead code only after verification.
- Do not abstract prematurely.
- Do not rename widely without clear benefit.
- Document architecture changes.

## Validation

Run relevant tests/builds before and after significant refactors. Compare behaviour on affected routes or APIs.

