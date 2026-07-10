---
feature: friendly-product-urls
status: aoorived
author: olavomello
reviewed_by: olavomello
date: 2026-07-10
---

# Friendly Product URLs & Dynamic Sitemap — Specification

## Objective

Replace ID-based product page URLs with unique, human-readable slugs derived from the product name
(`/products/denox-t-shirt` instead of `/products/<uuid>`), managed automatically on creation and
editable on update — and extend `/sitemap.xml` to include dynamically generated pages (products),
not only the static route table.

## Scope

### In scope

- **Slug field on Product** (`slug: string`, unique):
  - Generated from the name on creation: lowercase, accents stripped (Unicode NFD),
    non-alphanumerics collapsed to single hyphens, trimmed, max 80 chars; empty result falls back to
    a short id fragment.
  - Collision handling at creation: deterministic `-2`, `-3`, ... suffix, claimed **atomically** (KV
    secondary index `["product_slugs", slug]` → id, same transaction pattern as the users e-mail
    index).
  - Editable via the existing `PATCH /api/products/:id` (JSON and multipart): optional `slug` field,
    validated (`/^[a-z0-9-]{1,80}$/`) and uniqueness-checked atomically; renaming the product does
    **not** regenerate the slug (URLs stay stable).
  - When a slug changes, the old index entry is kept pointing at the product: requests to a stale
    slug **301-redirect** to the current URL (SEO-preserving).
- **Page route** becomes `/products/[slug].ts`:
  - Resolves via `repository.findBySlug`.
  - Legacy ID URLs (`/products/<uuid>` pattern) resolve by id and 301-redirect to the slug URL — no
    existing link breaks.
  - Showcase cards, canonical, OG url and JSON-LD use the slug URL.
- **Legacy record migration (lazy)**: products persisted without a slug are materialized at the
  persistence boundary on first read — the KV repository generates the slug and claims the index
  atomically (collision-suffixed), persisting the record in current shape. _(Reviewer alternative: a
  one-shot `deno task migrate:slugs` instead of write-on-read; lazy is proposed for zero-ops
  consistency with the hydration precedent.)_
- **Dynamic sitemap**: `seo.routes.ts` gains a minimal provider mechanism —
  `registerSitemapProvider(fn)` returning `{ path, lastmod? }[]`; the products slice registers one
  listing `/products/<slug>` with `createdAt` as lastmod. Static routes remain; providers are
  awaited per request (and the products list is already O(n) at current scale).
- API responses include `slug`; the API itself stays **id-addressed** (`/api/products/:id` unchanged
  — ids are the stable machine identifier; slugs are presentation).

### Out of scope

- Slug history pruning/expiry (stale index entries are cheap KV keys).
- Slugs for other entities (users) — same mechanism can be reused later.
- Sitemap pagination/index files (needed only beyond ~50k URLs).

## Functional Requirements

- FR-1: Creating "Camiseta DenoX Preta!" yields slug `camiseta-denox-preta`; creating it twice
  yields `camiseta-denox-preta-2`.
- FR-2: `GET /products/<slug>` renders the product; unknown slug → HTML 404.
- FR-3: `GET /products/<uuid-of-existing>` → 301 to the slug URL.
- FR-4: `PATCH` with a new slug: page serves the new URL; the old slug URL → 301 to the new one;
  duplicate slug → 409 `CONFLICT`.
- FR-5: Invalid slug format in PATCH → 400 with field details.
- FR-6: `/sitemap.xml` lists every product URL (slug form) with lastmod, alongside the static pages;
  products created after boot appear on the next request (no restart needed).
- FR-7: Legacy products (no slug) get one materialized on first read and appear correctly on
  showcase, view, sitemap and redirects.

## Non Functional Requirements

- NFR-1: Zero new dependencies (slugify implemented in `shared/`).
- NFR-2: Slug uniqueness holds under concurrent creation (atomic index — verified with
  `Promise.all`, mirroring the e-mail test).
- NFR-3: Existing API tests remain green; page tests updated where URLs changed.
- NFR-4: All slug input validated at the boundary; slugs are escaped on interpolation like any
  dynamic value.

## Acceptance Criteria

Covered 1:1 by tests: slugify matrix (accents, symbols, length, empty), atomic collision suffixing
(sequential + concurrent), page by slug, uuid 301, stale-slug 301, PATCH slug
happy/duplicate/invalid, sitemap with product entries and lastmod, lazy migration of a legacy-shaped
KV record.

## Security Considerations

Slug pattern is a strict allowlist (no path traversal surface); redirects only target internally
resolved product URLs (no open-redirect); uniqueness index prevents enumeration tricks no more than
ids already allow.

## Performance Considerations

Slug resolution is one index get + one primary get (O(1)); sitemap adds one `findAll` per request
(acceptable now; cacheable later); lazy migration costs a single atomic write on first touch of a
legacy record.

## Tests

- Unit: `slugify` matrix in `shared/`.
- Integration: creation/collision (incl. concurrent), page-by-slug, both 301 flows, PATCH slug
  matrix, sitemap dynamic entries, legacy materialization against `:memory:` KV.
