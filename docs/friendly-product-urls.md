# Friendly Product URLs & Dynamic Sitemap

Product pages are addressed by unique, human-readable slugs derived from the product name:
`/products/camiseta-denox-preta` instead of `/products/<uuid>`.

## Behavior

- **Creation**: the slug is generated automatically (lowercase, accents stripped, hyphens, max 80
  chars); name collisions get deterministic suffixes (`-2`, `-3`, ...) claimed atomically — unique
  under concurrency.
- **Stability**: renaming a product does **not** change its slug (links never break). To change the
  URL, PATCH the `slug` field explicitly (`^[a-z0-9-]{1,80}$`, 409 when taken):

```bash
curl -X PATCH http://localhost:8000/api/products/<id> \
  -H "content-type: application/json" \
  -d '{"slug":"my-custom-url"}'
```

- **Redirects**: legacy UUID URLs and stale (previous) slugs respond with **301** to the current
  address — SEO juice preserved, nothing breaks.
- **API**: endpoints remain id-addressed; responses include `slug` for building page URLs.
- **Legacy data**: products persisted before this feature get a slug materialized automatically on
  first read (atomic, collision-safe).

## Dynamic sitemap

`/sitemap.xml` now combines the static route table with entries from registered providers. Products
ship a provider out of the box (slug URLs + `createdAt` lastmod, reflecting current data on every
request). Feature slices can contribute their own:

```ts
import { registerSitemapProvider } from "@/frontend/seo.routes.ts";

registerSitemapProvider(async () =>
  (await postService.list()).map((post) => ({
    path: `/blog/${post.slug}`,
    lastmod: post.updatedAt,
  }))
);
```
