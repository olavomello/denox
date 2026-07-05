# AGENTS.md

## Denox Engineering Guidelines

> This document is the authoritative engineering contract for the Denox project. Every contribution
> — human or AI agent — must comply with it. When this document and existing code disagree, this
> document wins; open an issue.

---

# Mission

Develop Denox as a production grade Full Stack Framework for Deno focused on:

- Performance
- Simplicity
- Security
- Scalability
- Maintainability
- Developer Experience
- Native Deno APIs
- Convention over Configuration

---

# Technology Stack (pinned)

| Concern         | Choice                | Version constraint        |
| --------------- | --------------------- | ------------------------- |
| Runtime         | Deno                  | `>= 2.5 < 3` (CI: `v2.x`) |
| HTTP engine     | Hono                  | `npm:hono@^4.9.0`         |
| Language        | TypeScript            | strict mode (deno.json)   |
| Test assertions | `jsr:@std/assert`     | `^1.0.13`                 |
| Packages        | Deno native + JSR/npm | via `deno.json` imports   |

Rules:

- All dependencies are declared **only** in the `imports` map of `deno.json`.
- `deno.lock` is committed. Upgrades are deliberate PRs, never side effects.
- Adding a dependency requires justification in the feature spec (Minimize external dependencies —
  prefer native Deno APIs and Hono built-ins).

---

# Canonical Directory Structure

The tree below is normative. New features copy the `users/` slice exactly.

```
denox/
├── AGENTS.md                     ← this contract
├── deno.json                     ← tasks, imports, strict compiler options
├── .env.example                  ← every variable, documented
├── src/
│   ├── main.ts                   ← entrypoint: Deno.serve only
│   ├── app.ts                    ← composition root (middleware + routers)
│   ├── config/
│   │   └── env.ts                ← typed, validated, fail-fast configuration
│   ├── shared/
│   │   ├── logger.ts             ← Logger interface + ConsoleLogger
│   │   ├── http.ts               ← ok()/fail() response envelope
│   │   ├── html.ts               ← escapeHtml()
│   │   └── exceptions/
│   │       └── app_exception.ts  ← AppException hierarchy
│   ├── middleware/
│   │   ├── error_handler.ts      ← THE only exception→response mapping
│   │   ├── security.ts           ← headers, CSP, CORS, body limit, timeout
│   │   ├── rate_limit.ts
│   │   └── request_logger.ts
│   ├── api/
│   │   ├── main.ts               ← aggregates feature routers under /api
│   │   ├── health/
│   │   │   └── health.routes.ts
│   │   └── users/                ← REFERENCE FEATURE SLICE
│   │       ├── user.model.ts     ← entities only
│   │       ├── user.dto.ts       ← unknown → typed DTO (validation)
│   │       ├── user.repository.ts← interface + default implementation
│   │       ├── user.service.ts   ← business rules only
│   │       ├── user.controller.ts← HTTP adapter only
│   │       └── user.routes.ts    ← composition root of the slice
│   └── frontend/
│       ├── main.ts               ← frontend router (+ CSRF)
│       ├── generate_routes.ts    ← file based routing generator
│       ├── pages.gen.ts          ← AUTO GENERATED — never edit
│       ├── loader.ts / render.ts
│       ├── layouts/
│       │   ├── registry.ts       ← register every layout here
│       │   └── default.ts
│       └── pages/                ← index.ts → /, about/main.ts → /about,
│                                    posts/[id].ts → /posts/:id
├── test/
│   ├── unit/                     ← pure logic, mocked dependencies
│   ├── integration/              ← full pipeline via app.request()
│   ├── e2e/                      ← real Deno.serve + fetch
│   ├── fixtures/                 ← deterministic shared data
│   └── mocks/                    ← call-recording test doubles
├── specs/                        ← SDD specifications (+ _TEMPLATE.md)
├── docs/
│   ├── architecture/  docs/plans/  and per-feature docs
├── deploy/                       ← nginx.conf, Caddyfile, denox.service, README
├── .github/workflows/ci.yml
├── Dockerfile / docker-compose.yml / .dockerignore
└── CHANGELOG.md CONTRIBUTING.md SECURITY.md ROADMAP.md LICENSE VERSION
```

Feature test placement: `test/unit/<feature>_*_test.ts`, `test/integration/api_<feature>_test.ts`.

---

# Development Philosophy

Follow: SOLID, DRY, KISS, YAGNI, Clean Architecture, MVC, Feature Based Organization, Specification
Driven Development.

Avoid: God classes, circular dependencies, static/global mutable state, duplicate code, magic
strings, magic numbers (extract named constants).

---

# Specification Driven Development

Every feature follows this workflow. **Artifacts are named after the feature**
(`specs/<feature-name>.md`, etc.). Use `specs/_TEMPLATE.md`.

## Step 1 — Specification (`specs/<feature-name>.md`)

Must contain: Objective, Scope, Functional Requirements, Non Functional Requirements, Acceptance
Criteria, Security Considerations, Performance Considerations, Tests.

### Approval mechanism (mandatory for agents)

Specs carry YAML frontmatter with a `status` field:

```yaml
status: draft | approved | implemented
```

- The author (human or agent) creates the spec with `status: draft`.
- A **human maintainer** reviews and sets `status: approved` and `reviewed_by`.
- **Agents MUST stop after Step 1 and wait.** No architecture, plan or code may be generated while
  the spec is `draft`. Agents never edit `status` themselves.

## Step 2 — Architecture (`docs/architecture/<feature-name>.md`)

Components, Flow, Sequence, Dependencies, Risks.

## Step 3 — Implementation plan (`docs/plans/<feature-name>.md`)

Ordered steps with a definition of done.

## Step 4 — Implementation

## Step 5 — Tests (all three layers where applicable)

## Step 6 — Documentation (`docs/<feature-name>.md` + CHANGELOG entry)

`docs/user-management.md` and its spec/architecture/plan are the reference example of a completed
SDD cycle.

---

# Architecture Rules (MVC)

**Controllers** — receive request, parse/validate input, call services, return the envelope. Never:
database access, business rules, file operations, error response construction (throw instead).

**Services** — business rules only. Never: HTTP, HTML, routing, `Context`.

**Repositories** — persistence only, always behind an interface. Services depend on the interface
(dependency inversion); concrete implementations are chosen only in the feature's `*.routes.ts`
composition root.

**Models** — entities only. No behavior.

**Views (pages/layouts)** — render HTML only. Every dynamic value goes through `escapeHtml()`.

**Dependency injection** — constructor injection everywhere. Prefer composition; avoid inheritance
(the only sanctioned base class is `AppException`).

---

# Shared Primitives (use these — never reinvent)

| Concern           | Location                             | Rule                                                                                                                       |
| ----------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Logging           | `shared/logger.ts` (`logger`)        | No `console.*` anywhere else.                                                                                              |
| Errors            | `shared/exceptions/app_exception.ts` | Throw typed exceptions; only `middleware/error_handler.ts` maps them to responses. Never `throw new Error` in controllers. |
| Response envelope | `shared/http.ts` (`ok`, `fail`)      | Every JSON endpoint uses it.                                                                                               |
| HTML escaping     | `shared/html.ts` (`escapeHtml`)      | Mandatory for all interpolation.                                                                                           |
| Configuration     | `config/env.ts` (`env`)              | Nothing else reads `Deno.env`. Never hardcode ports, secrets, URLs, timeouts, paths.                                       |

New failure modes = new `AppException` subclass (open/closed), never edits to the error handler's
logic.

---

# File Based Routing

- Pages live in `frontend/pages/`; layouts in `frontend/layouts/`.
- `deno task routes` regenerates `frontend/pages.gen.ts`. **Never edit it.** CI fails if the
  committed file is stale.
- Route mapping: `index.ts|main.ts` → directory root; `[param]` → `:param`. Static routes are always
  registered before dynamic ones.
- New layouts: create the file, register one line in `layouts/registry.ts`.

---

# Code Generation Rules

Every file must: use TypeScript strict mode, be fully typed, avoid `any`, avoid implicit returns,
and carry a header comment explaining why the module exists and its single responsibility.

`unknown` is **required** at trust boundaries (request bodies, env, external data) and must be
narrowed by a validator before use. Inside typed code, prefer precise types over `unknown`.

Placeholders: never generate placeholder _code_ (stubs, TODO bodies, fake logic). Placeholder
_content_ in docs (e.g. `example.com`, screenshot slots in README) is acceptable and must be clearly
marked.

---

# Comments

Every public class, interface, function, method and exported constant carries JSDoc:

```ts
/**
 * Creates a new user.
 *
 * @param dto Validated user creation data.
 * @returns Created user.
 * @throws {ConflictException} When the email is already registered.
 */
```

---

# Security

Cross-cutting protections are implemented **once** in `src/middleware/` and `src/config/` and
applied globally in `src/app.ts`:

secure headers, CSP, XSS/clickjacking protection, CORS, CSRF (frontend), rate limiting, request size
limits, timeouts, error masking, request logging, environment validation, secrets isolation.

Feature code must **use** these protections — never re-implement them and never opt out.
Feature-level responsibilities are: input validation at the boundary (`unknown` → DTO), output
escaping (`escapeHtml`), and authorization checks (when the auth module lands).

Never expose stack traces. HTTPS is terminated by the reverse proxy (see `deploy/`). Secure cookies
required for any future session work.

---

# Performance

Prefer: streaming, lazy loading, caching, immutable objects (`readonly`, `Object.freeze`). Avoid:
blocking operations, repeated allocations/parsing, large synchronous loops in request paths.

---

# Environment

`.env.example` documents every variable. `src/config/env.ts` validates all of them at startup and
fails fast. Production rejects `CORS_ORIGIN=*`.

---

# Testing

Three mandatory layers (see `test/`):

- **Unit** — pure logic; repositories replaced by mocks from `test/mocks/`.
- **Integration** — the fully wired app via `app.request()`; asserts status codes, envelopes and
  security headers.
- **E2E** — real `Deno.serve` on an ephemeral port + real `fetch`.

Shared data lives in `test/fixtures/`. Every acceptance criterion in a spec maps to at least one
test. Coverage is reported in CI.

---

# Quality Gate (exact commands)

A task is finished only when all of these pass:

```bash
deno task fmt:check    # formatting
deno task lint         # linting
deno task routes       # regenerate route table (must not produce a diff)
deno task check        # type check src + tests
deno task test         # unit + integration + e2e
```

Or in one shot: `deno task ci` (same sequence CI runs). Also required: documentation updated,
CHANGELOG updated, security and performance sections of the spec reviewed.

---

# CI / Deployment / Release

- CI: `.github/workflows/ci.yml` — fmt, lint, stale-route check, type check, tests + coverage
  artifact, compile validation, Docker build.
- Deployment artifacts live in `Dockerfile`, `docker-compose.yml`, `deploy/` (Nginx, Caddy, systemd)
  with the full guide in `deploy/README.md`.
- Release hygiene: update `CHANGELOG.md` and `VERSION` (SemVer) in the same PR as the feature.
  `ROADMAP.md` tracks direction.

---

# AI Agent Instructions

When generating code:

1. Read this document and the reference feature (`src/api/users/`) first.
2. Follow the SDD workflow; **stop after the spec until it is approved**.
3. Generate production ready code — no stub logic.
4. Prefer native Deno APIs, then Hono built-ins, then (justified) dependencies.
5. Copy the structure of the reference slice for new features.
6. Use the shared primitives table; never create parallel loggers, error handlers, config readers or
   response shapes.
7. Update docs, tests and CHANGELOG in the same change set.
8. Run the quality gate (`deno task ci`) before declaring a task complete.
9. Never edit generated files (`pages.gen.ts`) or `deno.lock` by hand.
10. When in doubt between two designs, choose the one already used in this repository (convention
    over configuration).
