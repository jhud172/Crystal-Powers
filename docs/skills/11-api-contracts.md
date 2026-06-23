# 11 - API Contracts

## Purpose

Use for changes to `/api/contact`, `/api/services`, response shapes, request fields, validation messages, or frontend consumers.

## Rules

- Inspect frontend and backend consumers before changing endpoints.
- Never change request shape silently.
- Never rename fields without coordinated frontend/backend updates.
- Preserve HTTP semantics.
- Preserve validation error shape and success response shape unless explicitly changing the contract.
- Handle API failures in the frontend.
- Document breaking changes.
- Add tests for contract changes.
- Do not expose internal implementation details.

## Validation

Test backend controller behaviour and frontend form handling. Confirm `success`, `message`, and `fieldErrors` remain consistent unless intentionally changed.

