# Friendly Product URLs — Architecture

## Components

```
src/shared/slug.ts                    slugify + collision candidates (pure)
src/api/products/product.model.ts     slug: string on Product
product.repository(.kv).ts            findBySlug, atomic slug claim, lazy
                                      migration of pre-slug records
src/frontend/pages/products/[slug].ts product view addressed by slug
src/frontend/main.ts                  resolution middleware (301s) +
                                      products sitemap provider
src/frontend/seo.routes.ts            registerSitemapProvider mechanism
```

## Key decisions

- **Uniqueness is persistence**: the repositories own slug claiming — KV uses the
  `["product_slugs", slug] → id` index claimed in an atomic transaction (same pattern as the users
  e-mail index); collisions retry with deterministic `-2, -3` suffixes. Verified under concurrency.
- **Stable URLs**: renaming a product never regenerates its slug; changing the slug is an explicit
  PATCH act. Old index entries are kept so stale slugs 301 to the current URL (SEO-preserving; stale
  keys are cheap).
- **Resolution middleware, not page logic**: `/products/:slug` middleware handles UUID-pattern 301s,
  stale-slug 301s and stashes the resolved entity for the page (single lookup per request). Pages
  can't redirect (they return strings), middleware can.
- **Lazy migration** at the persistence boundary: pre-slug KV records get a slug materialized
  (atomically, suffix-safe) on first read — consistent with the hydration precedent from the images
  revision.
- **API stays id-addressed**: ids are the machine identifier; slugs are presentation. Responses
  expose `slug` so clients can build page URLs.
- **Sitemap providers**: `seo.routes` exposes `registerSitemapProvider`; the products provider is
  registered in the frontend composition root. Providers run per request — new products appear
  without restart.

## Flows

Create → repo claims slug atomically (suffix loop) → response carries slug. GET /products/<slug> →
middleware: uuid? → 301; stale? → 301; canonical → stash → page meta (dynamic SEO) → body. PATCH
slug → atomic claim of new index → old stays → 409 on conflict. Sitemap → static routes + awaited
providers → slug URLs with lastmod.
