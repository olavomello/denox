# DenoX Roadmap

## 0.3 — Persistence

- Database adapter interface + first implementation (Deno KV and/or Postgres)
- Migrations and seed tooling
- Repository implementations swap-in (no service/controller changes)

## 0.4 — Frontend ergonomics

- Layout auto-registration in the route generator
- Nested layouts and per-directory `_layout.ts`
- Static asset serving with cache headers
- Optional JSX/TSX pages

## 0.5 — Platform

- `denox` CLI (`denox new`, `denox generate feature <name>`)
- Session and authentication module (secure cookies)
- OpenAPI generation from route metadata (Swagger UI)
- WebSocket support

## 1.0 — Production hardening

- Redis-backed rate limiting store
- Observability hooks (OpenTelemetry)
- Publication on JSR
- Benchmarks and performance budget in CI
