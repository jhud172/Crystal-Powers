# 13 - Security

## Purpose

Use for backend validation, upload handling, secrets, headers, CORS, CSRF, dependency risk, and error reporting.

## Rules

- Validate server-side and never trust frontend data.
- Sanitise output where appropriate.
- Keep secrets out of frontend code and Git.
- Use environment variables for credentials.
- Preserve upload validation and content type checks.
- Treat filenames safely; prevent path traversal if files are ever written to disk.
- Consider rate limiting, CSRF, CORS, and secure headers based on evidence.
- Avoid leaking internals through error messages.
- Log without sensitive data.
- Do not add security libraries automatically.

## Validation

Require evidence before changing security configuration. Test validation and upload boundaries after changes.

