# DenoX Roadmap

## 0.3 — Persistence

- Database adapter interface + first implementation (Deno KV and/or Postgres)
- Migrations and seed tooling
- Repository implementations swap-in (no service/controller changes)

## 0.3.x — Products showcase ✅

- ✅ Server-rendered storefront on `/products` + dynamic product view (`/products/:id`) with
  independently editable `showcase`/`product` layouts
- ✅ Product image upload (magic-byte validation) with chunked Deno KV blob storage; dynamic
  per-request page metadata; HTML error pages

## 0.4.x — Storefront polish

- Friendly product URLs: slug generated from the product name on create and editable on update,
  unique (secondary index like the e-mail one), replacing the ID in `/products/:slug`; old ID URLs
  redirect
- Dynamic sitemap entries: generated pages (products, future dynamic content) included alongside the
  static route table
- ✅ +3 complete example layouts (midnight, editorial, neobrutalist) under `layouts/examples/`,
  registered for one-line switching

## 0.5 — Platform: authentication & sessions

- Full user authentication on top of the existing users API — architecture inspired by the Next.js
  authentication guide (https://nextjs.org/docs/app/guides/authentication): credential verification,
  password hashing, stateless-session cookies (signed/HttpOnly) or KV-backed sessions, auth
  middleware protecting routes, and the authorization layer for the admin surfaces (product
  management, uploads)

## 0.6 — Media & sharing

- Image optimization pipeline: on-demand resizing (including remote sources), modern formats (WebP),
  per-device sizes, native lazy loading with optional blur-up placeholders, automatic layout-shift
  prevention (width/height) and SEO alt text derived from image name/description — codec strategy
  (wasm) to be resolved in the spec against the zero-dependency principle
- Static Open Graph images per page/product via an `opengraph-image.ts` convention controlling the
  OG image configuration

## 0.7 — Payments

- Payment endpoint with a provider interface — Stripe first (checkout/payment intents + webhook
  status updates handled automatically), other providers later; optional linkage to users and
  products; depends on authentication

## 0.x — Agent Skills

- Package DenoX know-how as installable skills for coding agents (Claude, Cursor, Codex):
  feature-slice scaffolding, SDD workflow enforcement, deploy targets — distilled from AGENTS.md and
  the guides

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
