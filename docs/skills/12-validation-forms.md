# 12 - Validation And Forms

## Purpose

Use for Contact, Services, validation DTOs, upload handling, and form UI states.

## Rules

- Frontend validation improves UX; backend validation remains authoritative.
- Preserve field values on error.
- Show field-level errors, clear success state, clear failure state, and loading state.
- Disable submit only when appropriate.
- Prevent duplicate submissions.
- Make errors accessible and easy to associate with fields.
- Preserve upload validation for count, total size, and file type.
- Handle server failures clearly.
- Avoid aggressive animation around errors.
- Ensure form controls are unaffected by cursor and tilt effects.

## Validation

Test success, validation error, server failure, loading, reset, and upload error states. Run backend validation/upload tests when backend behaviour changes.

