# 19 - Database And Data

## Purpose

Use for persistence, repositories, migrations, and data modelling.

## Current State

The public website currently has no active database persistence. Portfolio, services, navigation, and theme data are static frontend data. Contact and services submissions are emailed by Spring Boot and are not stored in a database.

## Rules If Persistence Is Added

- Inspect schema before changes.
- Use migrations where appropriate.
- Do not make destructive changes without explicit instruction.
- Preserve existing data.
- Avoid exposing entities directly through APIs.
- Keep DTO boundaries.
- Define nullability deliberately.
- Add indexes only with evidence.
- Define transaction boundaries.
- Test repository behaviour.

## Validation

For current static data changes, verify imports and route rendering. For future persistence, test migrations, repositories, services, and API DTOs.

