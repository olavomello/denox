# Products Showcase — Architecture

## Components

```
src/frontend/pages/products/main.ts   showcase grid (layout: showcase)
src/frontend/pages/products/[id].ts   product view (layout: product,
                                      per-request meta resolver)
src/frontend/layouts/{showcase,product}.ts  independently editable shells
src/shared/images.ts                  magic-byte sniffing (pure)
src/shared/blob_storage.ts            BlobStorage: memory + chunked KV
src/api/products/*                    +description/imageUrl, update(),
                                      attachImage/getImage, image routes
src/middleware/error_handler.ts       HTML error pages for non-/api paths
src/frontend/render.ts                meta: PageMeta | (c) => PageMeta
```

## Flows

**Showcase**: page → shared `productService.list()` (same source as the API, DB-connected) → escaped
cards → showcase layout → injected SEO head.

**Product view**: meta resolver fetches the product (404 → HTML error page), stashes it via
`c.set("product")` and returns dynamic PageMeta; the body reuses the stashed entity (single lookup
per request).

**Upload**: multipart → controller extracts the file → service sniffs magic bytes + enforces the
ceiling → `BlobStorage.put("products/<id>")` → `repository.update(imageUrl)`. Serving: `get`
reassembles chunks and streams with the detected content type.

## KV blob layout

```
["blobs", key, "meta"]     → { contentType, size, chunks }
["blobs", key, "chunk", i] → Uint8Array (≤ 60 000 bytes)
```

Meta written last (readers never see partial blobs); replace clears old chunks first.

## Risks

- No auth on upload yet (whole API is open by design until 0.5) — rate limited globally.
- No image resizing: large-dimension (≤1 MB) images render as-is.
- Chunked reads are N sequential gets (fine at 1 MB ceiling ≈ 17 chunks).
