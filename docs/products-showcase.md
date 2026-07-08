# Products Showcase & Image Upload

## Pages

- `/products` — responsive storefront grid (layout `showcase`), server rendered from the
  database-connected product service. Empty state links the API and `deno task seed`.
- `/products/:id` — product view (layout `product`) with dynamic SEO (`<title>`, description and
  `og:image` from the entity) and an HTML 404 for unknown products.

Both layouts live in `src/frontend/layouts/` and are registered in `registry.ts` — edit
`showcase.ts` or `product.ts` to restyle each surface independently.

## Product fields

`description` (≤500 chars) and `imageUrl` (path or http(s)) are optional on `POST /api/products`.

## Image upload

```bash
curl -X POST http://localhost:8000/api/products/<id>/image \
  -F image=@photo.png
```

- Multipart field `image`; PNG, JPEG or WebP up to 1 MB.
- The format is detected from **magic bytes** — client content type and filename are ignored (a
  script named `photo.png` is rejected).
- On success the product's `imageUrl` points to `GET /api/products/<id>/image`, which serves the
  stored bytes with the detected content type — the showcase and product view render it
  automatically.
- Storage follows `STORAGE_DRIVER`: in-memory (dev) or Deno KV, where blobs are chunked across
  values (64 KiB limit) — durable on Deno Deploy with zero external services.

The Insomnia collection (`docs/denox-insomnia.json`) includes both requests under **Products**.
