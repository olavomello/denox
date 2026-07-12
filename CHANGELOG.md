# Changelog

All notable changes to DenoX are documented in this file. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.8.0] - 2026-07-12

### Fixed

- `dev` and `start` tasks now load `.env` via `--env-file` — the file was documented and templated
  but never actually read; unnoticed until the Stripe keys became the first genuinely required
  variables. Missing file only warns (CI and Deno Deploy unaffected).

## [0.7.0] - 2026-07-11

### Added

- **Payments (0.7)** — provider abstraction with Stripe first, implemented over its plain HTTPS REST
  API with native fetch + Web Crypto (no SDK, zero dependencies): authenticated checkout
  (`POST /api/payments/checkout`) with server-side pricing and product snapshots, raw-body webhook
  signature verification (constant-time HMAC, 5-minute replay tolerance), idempotent status
  lifecycle (pending → paid/failed/expired, with reserved states for future events), owner-or-admin
  reads, admin listing, KV persistence with provider/user indexes and a 24h event ledger. Default
  `payments.provider: "none"` keeps endpoints answering 501 with no keys required; enabling stripe
  fail-fasts on missing env keys.

- **Image optimization pipeline (0.6)** — two tiers behind an `ImageProcessor` interface: the
  zero-dependency passthrough default ships header-sniffed dimensions (CLS-free pages), responsive
  `imageTag()` markup (srcset/sizes, lazy/eager LCP policy), derived alt text with per-image
  overrides (`alts` on the multipart PATCH) and stable variant URLs; the opt-in wasm tier
  (`media.optimization`, imagescript pure-wasm build — the npm build requires FFI and is not
  Deploy-safe) adds real resizing, WebP transcoding and BlobStorage-cached, in-flight-deduplicated
  variants. Plus an SSRF-guarded remote image proxy (`/img`, disabled until `media.remotePatterns`
  is set).

### Changed

- Product `images` evolved from `string[]` to `ProductImage[]` (`url`, `width`, `height`, `alt`) —
  legacy records hydrate at the persistence boundary; API consumers should read `images[].url`.

## [0.5.0] - 2026-07-10

### Added

- **Authentication, sessions & authorization (0.5)** — Next.js-guide-shaped architecture with native
  primitives: signup/login/logout/me endpoints, PBKDF2 (Web Crypto) password hashing with per-user
  salts and stored parameters, revocable KV-backed sessions (`expireIn` TTL) behind a hardened
  `HttpOnly` cookie, `requireAuth`/`requireRole` middleware, Origin-check CSRF guard on
  cookie-authenticated mutations, login brute-force rate bucket, `/login` and `/signup` pages on the
  data-api form layer (with `data-redirect` support and no-JS PRG fallbacks), and a seeded dev
  admin. First registered user becomes **admin**.

### Changed

- Product mutations (create/update/delete, image upload/removal) and users read endpoints now
  require an **admin** session.

### Removed

- **Breaking**: `POST /api/users` — user creation moved to `/api/auth/signup` (always credentialed).

- **Example layouts**: three self-contained designs under `layouts/examples/` — `midnight` (dark
  dashboard with sidebar), `editorial` (serif magazine) and `neobrutalist` (bold borders and offset
  shadows) — registered for one-line switching via `layout: "<name>"`, fully style-scoped,
  ui-config-driven and escaped.

- **Cron jobs (scheduled tasks)**: third entry point at `src/crons/` powered by native `Deno.cron` —
  typed `CronJob` contract, explicit registry (empty by default), fail-fast duplicate validation,
  per-execution structured logging with error containment, `crons.enabled` toggle and graceful
  degradation on runtimes without `Deno.cron`; three inert `.example.ts` recipes (daily report,
  scheduled pricing, catalog sync).

## [0.4.0] - 2026-07-09

### Added

- **Configurable UI**: new `ui` section in `denox.config.ts` (favicons, stylesheets, brand,
  navigation, footer) rendered and escaped by the framework — head injector handles
  favicons/stylesheets with dedupe, `layouts/partials.ts` renders header/footer, the three layouts
  shrink to their differences; CSS preload follows the configured stylesheet list.
- **Product image carousel** on the product view (CSS scroll-snap + `denox-carousel.js`,
  progressive, CSP-safe) for products with 2+ images.
- `PATCH /api/products/:id`: partial update of name, price and description (enables adding
  descriptions to products created before the field existed); also accepts `multipart/form-data` for
  unified updates — text fields, new photos (`image`, repeatable) and photo removals
  (`removeImages`) in a single request with up-front removal validation.

- **Products showcase**: responsive server-rendered storefront on `/products` and product view at
  `/products/:id` (first dynamic file based route), each with its own managed layout (`showcase`,
  `product`); optional `description` on products; per-request page `meta` resolvers (dynamic SEO)
  and HTML error pages for non-API routes.
- **Product images**: multi-file upload `POST /api/products/:id/images` (multipart field `image`,
  repeatable; PNG/JPEG/WebP ≤ 1 MB each, validated by magic bytes), served from the public namespace
  (`GET /uploads/products/:id/:imageId`) — never under `/api`; deletion endpoints for single images
  (`DELETE /api/products/:id/images/:imageId`) and for the product (`DELETE /api/products/:id`,
  cascading blob cleanup); products carry an `images` list (cover + gallery); shared `BlobStorage`
  with in-memory and chunked Deno KV drivers (durable on Deno Deploy, zero dependencies).

- `docs/guides/creating-a-feature.md`: hands-on walkthrough of the full feature workflow (SDD →
  slice → tests → docs), referencing the Insomnia collection for interactive endpoint exploration.
- `deno task doc`: HTML API reference generated from the mandatory JSDoc (output git-ignored).
- Form state styles in `default.css`: `.field-error`, `.success`, `aria-invalid` borders and
  `aria-busy` submit feedback for the form helper.

## [0.3.0] - 2026-07-06

### Added

- **Persistence layer (Deno KV)**: `STORAGE_DRIVER=memory|kv` + `KV_PATH` (validated, memory
  default); KV repositories for users, products and contact beside the in-memory ones; repository
  factories in the composition roots; atomic e-mail uniqueness (entity + index in one KV
  transaction, verified under concurrency); `deno task seed` (idempotent, driver-agnostic);
  `unstable: ["kv"]` in deno.json; subprocess e2e booting the real server on the KV driver.

### Changed

- Services/controllers/DTOs untouched — driver selection lives entirely in the composition roots
  (interfaces already isolated persistence).

## [0.2.3] - 2026-07-05

### Added

- **Form interaction layer**: `public/assets/js/denox-form.js` progressive enhancement helper (zero
  build, zero deps) — `data-api` forms submit JSON to the API without navigation, per-field
  validation errors map to `[data-error-for]` slots from the standard envelope, success templates,
  cancelable `denox:success`/`denox:error` events, `aria-busy`/`aria-invalid`.
- Contact API slice (`POST /api/contact`) with DTO validation and repository interface; no-JS
  fallback `POST /contact` (Post-Redirect-Get) using the same DTO and service.
- SDD artifacts and docs (`docs/form-interaction.md`); tests across the three layers.

### Fixed

- `/contact` form previously posted to a non-existent route (404).

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
