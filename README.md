# Denox

> **A modern Full Stack Framework for Deno powered by Hono.**

Build fast, scalable and maintainable applications using **Deno**, **Hono**, **File Based Routing**
and a clean **MVC** architecture — with security, testing and deployment built in from day one.

[![CI](https://github.com/olavomello/denox/actions/workflows/ci.yml/badge.svg)](https://github.com/olavomello/denox/actions/workflows/ci.yml)
![Deno](https://img.shields.io/badge/deno-2.x-black)
![License](https://img.shields.io/badge/license-MIT-blue)

<!-- screenshot placeholder: docs/assets/denox-home.png -->

---

## Features

- ⚡ **Hono** HTTP engine on native `Deno.serve`
- 🗂 **File based routing** — `pages/about/main.ts` → `/about`, `[id]` → `:id`
- 🏛 **MVC feature slices** — model / DTO / repository / service / controller
- 🔐 **Security by default** — CSP, secure headers, CORS, CSRF, rate limiting, body limits,
  timeouts, error masking, XSS-safe rendering
- ✅ **Three test layers** — unit, integration (`app.request()`), e2e (real socket)
- 🧾 **Typed, fail-fast configuration** — every env var validated at startup
- 📦 **Deploy ready** — Docker, Nginx/Caddy, systemd, CI pipeline
- 📐 **Specification Driven Development** — AI-agent-ready contract in `AGENTS.md`

---

## Requirements

- Deno **2.5+** — install: `curl -fsSL https://deno.land/install.sh | sh` (Windows:
  `irm https://deno.land/install.ps1 | iex`, macOS: `brew install deno`)
- Git

## Quick Start

```bash
git clone https://github.com/olavomello/denox.git
cd denox
cp .env.example .env
deno task dev
```

Open http://localhost:8000 — try `/?name=Deno`, `/about`, `/api/ping`, `/api/users`.

## Tasks

| Task                 | Description                                 |
| -------------------- | ------------------------------------------- |
| `deno task dev`      | Regenerate routes + start with `--watch`    |
| `deno task start`    | Start the server                            |
| `deno task routes`   | Regenerate `src/frontend/pages.gen.ts`      |
| `deno task test`     | Run unit + integration + e2e tests          |
| `deno task coverage` | Tests with coverage report                  |
| `deno task ci`       | Full quality gate (fmt, lint, check, tests) |
| `deno task compile`  | Build a standalone binary in `./dist/app`   |

## Architecture

```
src/
├── main.ts            entrypoint (Deno.serve)
├── app.ts             composition root: middleware + routers
├── config/            typed, validated environment
├── shared/            logger, exceptions, envelope, escapeHtml
├── middleware/        error handler, security, rate limit, request log
├── api/               JSON API — one MVC slice per feature
│   └── users/         model · dto · repository · service · controller · routes
└── frontend/          file based pages + layouts (server rendered)
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
  "data": { "id": "…", "name": "Grace Hopper", "email": "grace@example.com", "createdAt": "…" }
}
```

## Deployment

Docker, reverse proxy (Nginx/Caddy), systemd and scaling guidance:
[`deploy/README.md`](deploy/README.md).

```bash
docker compose up -d --build
```

## Roadmap

See [`ROADMAP.md`](ROADMAP.md) — next up: database adapters, layout auto-registration, `denox` CLI,
auth module, OpenAPI generation.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md). Every feature follows
Specification Driven Development.

## License

[MIT](LICENSE) © Olavo Mello
