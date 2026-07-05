# Changelog

All notable changes to DenoX are documented in this file. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.2] - 2026-07-05

### Added

- **Production Ready by Default**: root `denox.config.ts` with typed `defineConfig()` (app
  metadata + feature toggles over production defaults); injected SEO head (title, description,
  keywords, author, canonical, Open Graph, Twitter Cards, JSON-LD) with per-page `config.meta`;
  generated `/sitemap.xml` (from the file based route table) and `/robots.txt`; `/site.webmanifest`
  generated from config; preload hints for public CSS and fonts; lazy images on page content;
  Cache-Control on static assets.

### Changed

- Static assets are served after the security stack (assets now carry secure headers) with
  configurable cache headers.
- Secure headers stack is toggleable via `security.headers`.
- Default layout reads `lang` from config; title and manifest link are now injected (deduplicated)
  instead of hardcoded.

### Removed

- Static `public/site.webmanifest` (replaced by the config-driven endpoint; it also referenced a
  missing maskable icon).

## [0.2.1] - 2026-07-05

### Added

- Multi-platform deploy layer: root manifests for Fly.io (`fly.toml`), Railway (`railway.toml`) and
  Render (`render.yaml`), all built from the root Dockerfile with `/api/health` checks.
- `scripts/deploy.ts` + `deno task deploy <target> [--run]`: lists targets, prints the deploy plan
  (env reminders included) and optionally executes it, delegating authentication to each platform
  CLI. Targets: deno-deploy, fly, railway, render, docker, vps.

### Changed

- `HOSTNAME` default is now `127.0.0.1` in development and `0.0.0.0` only in production; startup log
  prints a clickable localhost URL.
- `deploy/README.md`: PaaS section with the platform matrix.

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
