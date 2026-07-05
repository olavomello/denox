![](https://github.com/olavomello/denox/blob/main/public/images/denox-logo.png?raw=true)

# Denox

> **A modern Full Stack Framework for Deno powered by Hono.**

Build fast, scalable and maintainable applications using **Deno**, **Hono**, **File Based Routing**
and a clean **MVC** architecture — with security, testing and deployment built in from day one.

Denox combines the best ideas from modern web frameworks into a lightweight, high performance
framework built natively for Deno. Inspired by the developer experience of frameworks like Next.js
and Laravel, it provides file based routing, dynamic routes, automatic route discovery, configurable
layouts, nested pages, convention over configuration, TypeScript first development and a clean MVC
architecture. Powered by Hono and the native Deno runtime, Denox delivers a familiar, productive
workflow while remaining fast, modular and free from unnecessary complexity.

[![CI](https://github.com/olavomello/denox/actions/workflows/ci.yml/badge.svg)](https://github.com/olavomello/denox/actions/workflows/ci.yml)
![Deno](https://img.shields.io/badge/deno-2.x-black)
![Hono](https://img.shields.io/badge/hono-4.x-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-0.2.1-green)

Read
[Medium](https://olavomello.medium.com/denox-a-full-stack-dynamic-framework-ai-ready-and-built-natively-for-deno-a819cc94d5a5)

---

## Features

- ⚡ **Hono** HTTP engine on native `Deno.serve`
- 🗂 **File based routing** — `pages/about/main.ts` → `/about`, `[id]` → `:id`
- 🏛 **MVC feature slices** — model · DTO · repository · service · controller · routes, with
  constructor injection and interface-based repositories
- 🔐 **Security by default** — CSP, secure headers, CORS, CSRF, rate limiting, body limits,
  timeouts, error masking, XSS-safe rendering
- ✅ **Three test layers** — unit, integration (`app.request()`), e2e (real socket)
- 🧾 **Typed, fail-fast configuration** — every env var validated at startup
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

Open **http://localhost:8000** — try `/?name=Deno`, `/about`, `/api/ping`, `/api/users`.

> In development the server binds to `127.0.0.1` by default. Set `HOSTNAME=0.0.0.0`
> (production/Docker) to listen on all interfaces.

## Tasks

| Task                  | Description                                       |
| --------------------- | ------------------------------------------------- |
| `deno task dev`       | Regenerate routes + start with `--watch`          |
| `deno task start`     | Start the server                                  |
| `deno task routes`    | Regenerate `src/frontend/pages.gen.ts`            |
| `deno task test`      | Run unit + integration + e2e tests                |
| `deno task test:unit` | Unit tests only (same for `:integration`, `:e2e`) |
| `deno task coverage`  | Tests with coverage report                        |
| `deno task ci`        | Full quality gate (fmt, lint, check, tests)       |
| `deno task compile`   | Build a standalone binary in `./dist/app`         |
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
│   ├── users/         model · dto · repository · service · controller · routes
│   └── products/      same slice structure
└── frontend/          file based pages + layouts (server rendered)
    ├── pages/         index.ts → /, about/main.ts → /about, [id] → :id
    └── layouts/       default.ts + registry.ts
```

Full contract and conventions: [`AGENTS.md`](AGENTS.md). Reference SDD cycle:
[`specs/user-management.md`](specs/user-management.md) →
[`docs/user-management.md`](docs/user-management.md).

## API example

```bash
curl -X POST http://localhost:8000/api/users \
  -H 'content-type: application/json' \
  -d '{"name":"Grace Hopper","email":"grace@example.com"}'
```

```json
{
  "success": true,
  "data": {
    "id": "…",
    "name": "Grace Hopper",
    "email": "grace@example.com",
    "createdAt": "…"
  }
}
```

Errors always use the same envelope
(`{ "success": false, "error": { "code", "message", "details?" } }`) and never expose stack traces.

## Testing

```bash
deno task test        # 29 tests across three layers
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

## Roadmap

See [`ROADMAP.md`](ROADMAP.md) — next up: database adapters (Deno KV / Postgres), layout
auto-registration, `denox` CLI, auth module, OpenAPI generation.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md) first. Every feature follows
**Specification Driven Development**: spec (`draft`) → human approval → architecture → plan →
implementation → tests → docs. The quality gate is one command: `deno task ci`.

## License

[MIT](LICENSE) © [Olavo Mello](https://www.linkedin.com/in/olavo-mello/)
