# Products Showcase & Image Upload

## Pages

- `/products` — responsive storefront grid (layout `showcase`), server rendered from the
  database-connected product service. Empty state links the API and `deno task seed`.
- `/products/:slug` — product view by friendly URL (layout `product`; see
  docs/friendly-product-urls.md) with dynamic SEO (`<title>`, description and `og:image` from the
  entity) and an HTML 404 for unknown products.

Both layouts live in `src/frontend/layouts/` and are registered in `registry.ts` — edit
`showcase.ts` or `product.ts` to restyle each surface independently.

## Product fields

`description` (≤500 chars) and `imageUrl` (path or http(s)) are optional on `POST /api/products`.

## Product images

```bash
# upload (field `image` is repeatable — multiple photos in one request)
curl -X POST http://localhost:8000/api/products/<id>/images \
  -F image=@front.png -F image=@back.jpg

# delete one image
curl -X DELETE http://localhost:8000/api/products/<id>/images/<imageId>

# delete the product (and all of its image blobs)
curl -X DELETE http://localhost:8000/api/products/<id>
```

- Formats: PNG, JPEG or WebP, up to 1 MB each — detected by **magic bytes** (client content type and
  filename are ignored; a script named `photo.png` is rejected).
- Uploaded images are served from the **public namespace** — `GET /uploads/products/<id>/<imageId>`
  — never under `/api`, following the public-folder convention for user-facing assets. Note: on Deno
  Deploy the filesystem is read-only at runtime, so uploads cannot become physical files inside
  `public/`; the bytes live in the driver-aware BlobStorage (chunked Deno KV in production) and this
  route makes them URL-compatible with public assets. Real files in `public/` always take
  precedence.
- The product's `images` list holds the public URLs in upload order; the first one is the
  showcase/product-view cover and the rest render as a gallery. `og:image` uses the cover.
- Storage follows `STORAGE_DRIVER` (memory in dev, chunked KV in production — durable on Deno Deploy
  with zero external services).

The Insomnia collection (`docs/denox-insomnia.json`) covers upload, public serving and both delete
endpoints under **Products**.

## Updating a product

```bash
curl -X PATCH http://localhost:8000/api/products/<id> \
  -H "content-type: application/json" \
  -d '{"description":"Added after creation."}'
```

Partial: send any of `name`, `price`, `description` (at least one). Handy for adding descriptions to
products created before the field existed.

### Unified update (data + photos in one request)

The same endpoint accepts `multipart/form-data` to change everything at once — text fields, new
photos (`image`, repeatable) and photo removals (`removeImages` with the image id, repeatable):

```bash
curl -X PATCH http://localhost:8000/api/products/<id> \
  -F name="New name" -F price=59.9 \
  -F image=@new-photo.png \
  -F removeImages=<old-image-id>.png
```

At least one change is required; every removal is validated against the product before anything
mutates, and the final state is written in a single repository update.

## Image carousel

With two or more images the product view renders a scroll-snap carousel (swipe/scroll works without
JavaScript; `denox-carousel.js` adds prev/next buttons and the position counter). One image renders
plain; none renders the initial placeholder. The first image stays the showcase cover and og:image.

## SKU

Products accept an optional `sku` (`^[A-Za-z0-9._-]{1,64}$`) — **unique when present** (409 on
conflict, atomic on the KV driver). PATCH sets or changes it (the old SKU is released — operational
ids have no 301 semantics, unlike slugs) and `"sku": ""` clears it. The product view shows a muted
`SKU:` line when present, and payment snapshots carry it (see docs/payments.md).
