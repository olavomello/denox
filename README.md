![](https://github.com/olavomello/denox/blob/main/public/images/denox-logo.png?raw=true)

# 🦖 DenoX

> **A modern Full Stack Framework for Deno powered by Hono.**

Build fast, scalable and maintainable applications using
[**Deno**](https://github.com/denoland/deno), [**Hono**](https://github.com/honojs/hono), **File
Based Routing** and a clean **MVC** architecture — with security, testing and deployment built in
from day one.

DenoX combines the best ideas from modern web frameworks into a lightweight, high performance
framework built natively for Deno. Inspired by the developer experience of frameworks like Next.js
and Laravel, it provides file based routing, dynamic routes, automatic route discovery, configurable
layouts, nested pages, convention over configuration, TypeScript first development and a clean MVC
architecture. Powered by Hono and the native Deno runtime, DenoX delivers a familiar, productive
workflow while remaining fast, modular and free from unnecessary complexity.

[![CI](https://github.com/olavomello/denox/actions/workflows/ci.yml/badge.svg)](https://github.com/olavomello/denox/actions/workflows/ci.yml)
![Deno](https://img.shields.io/badge/deno-2.x-black)
![Hono](https://img.shields.io/badge/hono-4.x-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-0.2.1-green)

🦖 [Live version - Deno Deploy](https://denox.olavomello.deno.net/)

Read on
[Medium](https://olavomello.medium.com/denox-a-full-stack-dynamic-framework-ai-ready-and-built-natively-for-deno-a819cc94d5a5)

---

## Features

- 🏆 **Production Ready by Default** — SEO (meta, Open Graph images with an `opengraph-image.ts`
  registry, Twitter Cards, JSON-LD, dynamic sitemap with providers, robots), PWA manifest, asset
  preload, CLS-free responsive images and cache headers — automatic, driven by `denox.config.ts`,
  opt-out per feature
- 🔑 **Authentication & authorization** — signup/login/logout/me with native PBKDF2 hashing,
  revocable KV-backed sessions behind hardened HttpOnly cookies, `requireAuth`/`requireRole`
  middleware, CSRF Origin guard, login rate limiting, ready-made `/login` and `/signup` pages
- 💳 **Payments** — Stripe checkout behind a provider abstraction (plain REST + Web Crypto webhook
  verification, no SDK): server-side pricing, product snapshots, idempotent status lifecycle; off by
  default, enabled with two env keys
- 🖼 **Image optimization** — header-sniffed dimensions (zero layout shift), responsive `srcset` with
  lazy/eager LCP policy and derived alt text out of the box; opt-in pure-wasm tier adds resizing,
  WebP and cached variants; SSRF-guarded remote image proxy
- 📜 **Self-documenting API** — OpenAPI 3.1 contract from colocated slice descriptions at
  `/openapi.json`, zero-dependency reference page at `/docs/api-reference`, generated Insomnia
  collection with a CI staleness gate, and a parity test that fails when routes and docs drift
- 📮 **API-backed forms, zero build** — `data-api` forms submit JSON, map per-field validation
  errors automatically, redirect on success and keep page state; native fallback without JS
- ⚡ **Hono** HTTP engine on native `Deno.serve`
- 🗂 **File based routing** — `pages/about/main.ts` → `/about`, `[slug]` → `:slug`
- 🏛 **MVC feature slices** — model · DTO · repository · service · controller · routes, with
  constructor injection and interface-based repositories
- 🔐 **Security by default** — CSP, secure headers, CORS, CSRF, rate limiting, body limits,
  timeouts, error masking, XSS-safe rendering
- ✅ **Three test layers** — unit, integration (`app.request()`), e2e (real socket)
- 🧾 **Typed, fail-fast configuration** — every env var validated at startup
- 🛍 **Reference storefront** — server-rendered showcase + product pages on friendly slug URLs (301s
  for legacy links), multi-image upload with carousel (chunked KV blob storage) and per-product SEO
  with real image dimensions
- 🎨 **Config-driven identity & layouts** — brand, nav and footer from `denox.config.ts`; three
  ready example layouts (midnight, editorial, neobrutalist) switchable with one line
- ⏰ **Cron jobs** — explicit registry over native `Deno.cron` with error containment and inert
  recipe examples
- 💾 **Durable storage on demand** — `STORAGE_DRIVER=kv` switches repositories to Deno KV (native on
  Deno Deploy) with atomic uniqueness; memory stays the dev default
- 🚀 **One-command deploy** — Deno Deploy, Fly.io, Railway, Render, Docker, VPS
- 📐 **Specification Driven Development** — AI-agent-ready contract in `AGENTS.md`

---

## Requirements

- **Deno 2.5+**
  - Linux/macOS: `curl -fsSL https://deno.land/install.sh | sh` (or `brew install deno`)
  - Windows: `irm https://deno.land/install.ps1 | iex`
- Git

Verify: `deno --version`

## Quick Start

```bash
git clone https://github.com/olavomello/denox.git
cd denox
cp .env.example .env
deno task dev
```

Open **http://localhost:8000** — try `/?name=Deno`, `/about`, `/products`, `/signup`, `/api/ping`.

> In development the server binds to `127.0.0.1` by default. Set `HOSTNAME=0.0.0.0`
> (production/Docker) to listen on all interfaces.

## Tasks

| Task                  | Description                                       |
| --------------------- | ------------------------------------------------- |
| `deno task dev`       | Regenerate routes + start with `--watch`          |
| `deno task start`     | Start the server                                  |
| `deno task routes`    | Regenerate `src/frontend/pages.gen.ts`            |
| `deno task test`      | Run unit + integration + e2e tests                |
| `deno task insomnia`  | Regenerate the Insomnia collection from OpenAPI   |
| `deno task test:unit` | Unit tests only (same for `:integration`, `:e2e`) |
| `deno task coverage`  | Tests with coverage report                        |
| `deno task ci`        | Full quality gate (fmt, lint, check, tests)       |
| `deno task compile`   | Build a standalone binary in `./dist/app`         |
| `deno task doc`       | Generate the HTML API reference from JSDoc        |
| `deno task deploy`    | List deploy targets / print or run a deploy plan  |

## Architecture

```
src/
├── main.ts            entrypoint (Deno.serve only)
├── app.ts             composition root: middleware + routers
├── config/            typed, validated, fail-fast environment
├── shared/            logger, exceptions, response envelope, escapeHtml
├── middleware/        error handler, security stack, rate limit, request log
├── api/               JSON API — one MVC slice per feature
│   ├── health/        /api/ping, /api/health
│   ├── auth/          signup · login · sessions (PBKDF2 + KV store)
│   ├── users/         model · dto · repository · service · controller · routes
│   ├── products/      same slice structure (+ images, slugs)
│   └── payments/      provider abstraction (Stripe REST) + webhook lifecycle
├── crons/             explicit Deno.cron registry + scheduler
└── frontend/          file based pages + layouts (server rendered)
    ├── pages/         index.ts → /, about/main.ts → /about, [id] → :id
    └── layouts/       default · showcase · product + examples/ + registry.ts
```

Full contract and conventions: [`AGENTS.md`](AGENTS.md). Reference SDD cycle:
[`specs/user-management.md`](specs/user-management.md) →
[`docs/user-management.md`](docs/user-management.md).

**Learning the framework:** start with the hands-on guide
[`docs/guides/creating-a-feature.md`](docs/guides/creating-a-feature.md), explore the API with the
Insomnia collection [`docs/denox-insomnia.json`](docs/denox-insomnia.json) (Local + Production
environments included), and browse the generated API reference with `deno task doc`.

## API example

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H 'content-type: application/json' \
  -d '{"name":"Grace Hopper","email":"grace@example.com","password":"compilers-rule"}'
```

```json
{
  "success": true,
  "data": {
    "id": "…",
    "name": "Grace Hopper",
    "email": "grace@example.com",
    "role": "admin",
    "createdAt": "…"
  }
}
```

Errors always use the same envelope
(`{ "success": false, "error": { "code", "message", "details?" } }`) and never expose stack traces.
The **first registered user becomes admin**; a session cookie is set on signup/login and protected
endpoints (product mutations, user reads, payments) require it.

## Testing

```bash
deno task test        # 146 tests across three layers
deno task coverage    # with coverage report
```

- **Unit** — pure logic with call-recording mocks (`test/mocks/`)
- **Integration** — the fully wired app via `app.request()`
- **E2E** — real `Deno.serve` on an ephemeral port + real `fetch`

## Deployment

Platform manifests live at the repository root (`fly.toml`, `railway.toml`, `render.yaml`,
`Dockerfile`); self-hosted infra lives in [`deploy/`](deploy/) (Nginx, Caddy, systemd). Full guide:
[`deploy/README.md`](deploy/README.md).

```bash
deno task deploy                 # list targets
deno task deploy fly             # dry run: steps + env reminders
deno task deploy fly --run       # execute (auth delegated to the fly CLI)
```

| Target        | Platform            | Notes                                   |
| ------------- | ------------------- | --------------------------------------- |
| `deno-deploy` | Deno Deploy         | First-class Deno hosting (`deployctl`)  |
| `fly`         | Fly.io              | Root `fly.toml`, health-checked         |
| `railway`     | Railway             | Root `railway.toml`, Docker build       |
| `render`      | Render (Blueprints) | Git-driven, reads root `render.yaml`    |
| `docker`      | Any Docker host     | `docker compose up -d --build`          |
| `vps`         | VPS / bare metal    | Compiled binary + hardened systemd unit |

Every production target requires `APP_ENV=production`, `HOSTNAME=0.0.0.0` and a real `CORS_ORIGIN`
(startup rejects `*` in production).

## What's New

Concise highlights per version — full details in [`CHANGELOG.md`](CHANGELOG.md).

- **0.8.0** — 📜 OpenAPI milestone: machine-readable API contract assembled from colocated per-slice
  descriptions, served at /openapi.json with a zero-dependency reference page at
  /docs/api-reference; the Insomnia collection is now a generated artifact (deno task insomnia)
  guarded by an in-suite staleness gate, and a bidirectional parity test fails the build whenever
  routes and docs drift apart.
- **0.7.0** — 💳 Payments milestone: Stripe checkout behind a provider abstraction — plain REST +
  Web Crypto webhook verification (no SDK, still zero dependencies), server-side pricing with
  product snapshots, idempotent status lifecycle, 501-off by default. Plus the full 0.6 media
  milestone: two-tier image optimization (zero-dep passthrough + opt-in pure-wasm resize/WebP),
  CLS-free responsive images, SSRF-guarded remote proxy, and Open Graph images with an
  opengraph-image.ts registry, absolute URLs and real dimensions.
- **0.5.0** — 🔐 Authentication milestone: signup/login/logout/me with native PBKDF2 hashing,
  revocable KV-backed sessions, requireAuth/requireRole middleware (product mutations and user reads
  now admin-only), CSRF Origin guard and login rate limiting. Plus 0.4.x storefront polish: friendly
  product URLs with 301s, dynamic sitemap providers and three example layouts. Breaking: POST
  /api/users removed (signup).
- **0.4.0** — 🛍 Storefront release: products showcase + dynamic product view with dedicated layouts,
  multi-image upload with chunked KV blob storage and carousel, unified PATCH (data + photos),
  config-driven site UI, docs layer and HTML error pages.
- **0.3.0** — 💾 Persistence layer: Deno KV driver (`STORAGE_DRIVER=kv`) with atomic e-mail
  uniqueness, driver factories, idempotent seed — durable data on Deno Deploy.
- **0.2.3** — 📮 Form interaction layer: progressive-enhancement helper (`data-api` forms → JSON
  API, per-field errors, no navigation) + contact API slice with no-JS fallback.
- **0.2.2** — 🏆 Production Ready by Default: config-driven SEO (sitemap, robots, Open Graph,
  Twitter Cards, JSON-LD), generated PWA manifest, asset preload, lazy images and static
  cache/security headers via `denox.config.ts`.
- **0.2.1** — 🚀 Multi-platform deploy layer: `deno task deploy` for Deno Deploy, Fly.io, Railway,
  Render, Docker and VPS.
- **0.2.0** — 🏛 Framework foundation: MVC slices with SOLID injection, three test layers, security
  middleware stack, fail-fast typed config, SDD contract (`AGENTS.md`).

## Roadmap

See [`ROADMAP.md`](ROADMAP.md) — next up: database adapters (Deno KV / Postgres), layout
auto-registration, `denox` CLI, auth module, OpenAPI generation.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md) first. Every feature follows
**Specification Driven Development**: spec (`draft`) → human approval → architecture → plan →
implementation → tests → docs. The quality gate is one command: `deno task ci`.

## License

[MIT](LICENSE) © [Olavo Mello](https://www.linkedin.com/in/olavo-mello/)
