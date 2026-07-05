# Changelog

All notable changes to Denox are documented in this file. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-07-05

### Added

- `src/config/env.ts`: typed, validated, fail-fast environment configuration.
- `src/shared/`: logging abstraction, exception hierarchy, response envelope, HTML escaping helper.
- `src/middleware/`: centralized error handler, secure headers + CSP, CORS, body limit, request
  timeout, rate limiting, request logging.
- Users and products features restructured as full MVC slices (model, DTO + validation, repository
  interface + in-memory implementation, service, controller, routes) with constructor injection.
- Health endpoints: `GET /api/health` and `GET /api/ping`.
- Test suite: unit, integration and e2e layers with fixtures and mocks (29 tests).
- CI pipeline (`.github/workflows/ci.yml`): fmt, lint, stale-route check, type check, tests with
  coverage, compile and Docker build validation.
- Deployment artifacts: `Dockerfile`, `docker-compose.yml`, Nginx and Caddy configs, systemd unit,
  deployment guide.
- SDD artifacts for the user-management feature (spec, architecture, plan, docs) and a spec
  template.

### Changed

- `deno.json`: pinned import map, strict compiler options, task set with exact CI commands; removed
  unused/incorrect dependencies (`express`, npm `jsr`, npm `std`, `@std/http`).
- Route generator rewritten with native `Deno.readDir` (zero dependencies), deterministic
  static-before-dynamic ordering.
- Layouts resolved through an explicit registry (`layouts/registry.ts`).
- Controllers converted from static classes to instances with injected services.
- AGENTS.md rewritten: canonical directory tree, pinned stack, defined shared primitives, spec
  approval mechanism, security-as-middleware policy, exact quality-gate commands.

### Removed

- Duplicate `_layout.ts`.
- `.html` alias routes (duplicate URLs).
- Broken template test (`test/main_test.ts`).
- Deprecated `--unstable` flags and `deno bundle` tasks.

### Fixed

- XSS: untrusted values are escaped before HTML interpolation.
- CRLF/LF inconsistency (`.gitattributes` enforces LF).

## [0.1.0]

- Initial prototype: Hono composition, file based routing generator, users/products controllers with
  static data.
