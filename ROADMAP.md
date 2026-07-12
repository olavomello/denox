# DenoX Roadmap

## Delivered

- ✅ **0.3 — Persistence**: Deno KV driver with atomic uniqueness, Insomnia collection, docs
  pipeline
- ✅ **0.4 — Storefront**: products showcase, multi-image upload + carousel, friendly slug URLs with
  301s, dynamic sitemap providers, cron jobs, three example layouts, config-driven UI
- ✅ **0.5 — Authentication**: PBKDF2, revocable KV sessions, requireAuth/requireRole, CSRF origin
  guard, login/signup pages
- ✅ **0.6 — Media**: two-tier image optimization (passthrough + pure-wasm), CLS-free responsive
  images, remote proxy, Open Graph images registry
- ✅ **0.7 — Payments**: Stripe provider over plain REST + Web Crypto (no SDK), server-side pricing,
  product snapshots, idempotent webhooks
- ✅ **0.8 — OpenAPI**: 3.1 document from colocated slice descriptions, zero-dependency reference
  page, generated Insomnia collection with staleness gate, bidirectional route/document parity test

## Next

- Payments follow-ups: product `sku` field + inclusion in `productSnapshot` (deferred from the 0.7
  spec); reserved statuses (`processing`/`cancelled`/`refunded`) gaining producing events; refunds
- `denox` CLI (`denox new`, `denox generate feature <name>`)
- Frontend ergonomics: nested layouts / per-directory `_layout.ts`, optional JSX/TSX pages, layout
  auto-registration
- WebSocket support
- Documentation site (Lume) publishing the guides + API reference

## 0.x — Agent Skills

- Package DenoX know-how as installable skills for coding agents (Claude, Cursor, Codex):
  feature-slice scaffolding, SDD workflow enforcement, deploy targets — distilled from AGENTS.md and
  the guides

## 1.0 — Production hardening

- Postgres driver + migrations (Deno Deploy "+Attach" SQL)
- Redis-backed rate limiting store
- Observability hooks (OpenTelemetry)
- Publication on JSR
- Benchmarks and performance budget in CI
