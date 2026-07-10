---
feature: products-showcase
status: approved
author: olavomello
reviewed_by: olavomello
date: 2026-07-08
---

# Products Showcase & Product View — Specification

## Objective

Add a responsive, server-rendered product storefront on the existing `/products` page and a direct
product view at `/products/:id`, fully backed by the database-connected products API, each with its
own independently editable layout following the managed layout scheme. Includes backend image upload
so products display real photos.

## Scope

### In scope

- Showcase grid on `/products` (responsive cards: image/initial, name, description, price) rendered
  from the shared product service.
- Product view at `/products/:id` via the dynamic file based route (`pages/products/[id].ts`) with
  dynamic SEO metadata (title, description, og:image from the product).
- Two new managed layouts registered in `layouts/registry.ts`: `showcase.ts` and `product.ts` (same
  folder scheme, individually editable).
- API adjustments: optional `description`/`imageUrl` on Product (model, DTO validation), `update()`
  on the repository interface (memory + KV).
- **Image upload**: `POST /api/products/:id/image` (multipart field `image`, PNG/JPEG/WebP ≤ 1 MB,
  format sniffed from magic bytes) and `GET /api/products/:id/image` serving the blob; storage
  through a new shared `BlobStorage` (in-memory + chunked Deno KV — 64 KiB values split into chunks,
  works on Deno Deploy with zero dependencies).
- Framework enhancement: per-request page `meta` resolver (dynamic SEO) and HTML error pages for
  non-API routes (product 404 is a page, not JSON).

### Out of scope

- Cart/checkout, admin upload UI (API-first until the auth module), image resizing/thumbnails,
  pagination.

## Functional Requirements

- FR-1: `/products` lists every stored product; empty state links the API/seed.
- FR-2: `/products/:id` renders the product; unknown id → HTML 404 page; `/api/products/:id` keeps
  the JSON envelope.
- FR-3: Product pages emit dynamic `<title>`, description and og:image.
- FR-4: Upload validates by magic bytes (client type/filename untrusted), enforces the 1 MB ceiling,
  404s on unknown products, and sets `imageUrl` to the serving endpoint.
- FR-5: Uploaded images render on the showcase and product view.
- FR-6: Blobs larger than one KV value round-trip intact (chunking).

## Non Functional Requirements

- NFR-1: Zero new dependencies; existing tests unchanged and green.
- NFR-2: All product data escaped before HTML interpolation.
- NFR-3: Works with both storage drivers; durable under `STORAGE_DRIVER=kv`.

## Acceptance Criteria

Covered 1:1 by `test/integration/products_showcase_test.ts`,
`test/integration/product_image_test.ts` and `test/unit/images_test.ts` (hostile-name escaping,
exact-bytes image roundtrip, 150 KB chunking, field errors, HTML vs JSON 404s, dynamic metadata).

## Security Considerations

Magic-byte sniffing prevents content-type spoofing (e.g. scripts named `.png`); size ceiling under
the global body limit; served images carry the detected content type (never user-controlled); API
remains unauthenticated by design until the auth module (0.5) — uploads share the global rate limit.

## Performance Considerations

SSR reads via the shared service (no HTTP-to-self); product lookup done once per request (meta
resolver stashes the entity in context); images served with `Cache-Control: max-age=300`; chunked
reads are sequential KV gets.

## Tests

13 new tests across unit (sniffing) and integration (showcase, view, metadata, escaping,
upload/serving, chunking, error modes).
