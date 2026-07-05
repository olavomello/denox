# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.2.x   | ✅        |
| < 0.2   | ❌        |

## Reporting a vulnerability

Please **do not open a public issue** for security vulnerabilities.

Report privately through GitHub Security Advisories ("Report a vulnerability" on the repository
page). Include reproduction steps and the affected version. You will receive an acknowledgment
within 72 hours.

## Built-in protections

Denox applies these controls globally (see `src/middleware/`):

- Secure headers + Content Security Policy, `X-Frame-Options: DENY`
- CORS with explicit origins (wildcard rejected in production)
- CSRF origin checks on browser routes
- Request body size limits and request timeouts
- Rate limiting per client IP
- Centralized error handling with error masking (no stack traces to clients)
- HTML escaping helpers for all dynamic interpolation
- Fail-fast environment validation; secrets only via environment variables
