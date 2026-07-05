---
feature: production-ready
status: approved
author: claude (from maintainer directive)
reviewed_by: olavomello
date: 2026-07-05
---

# Production Ready by Default — Specification

## Objective

Every DenoX project must be automatically optimized for SEO, performance, security, PWA readiness
and modern web best practices with zero additional configuration. All features are modular,
configurable and disabled only when explicitly requested.

## Scope

### In scope

- Root `denox.config.ts` with a typed `defineConfig()` (app metadata + feature toggles), merged over
  production-ready defaults.
- SEO: injected title/description/keywords/author, canonical, Open Graph, Twitter Cards, JSON-LD;
  generated `/sitemap.xml` (from the file based route table) and `/robots.txt`.
- PWA: `/site.webmanifest` generated from the configuration (replaces the hand-maintained static
  file); manifest link + theme-color injected.
- Performance: preload hints for `public/assets/css|fonts`, lazy images on page content,
  Cache-Control on static assets.
- Security: existing secure-headers stack becomes config-toggleable; static assets now pass through
  the security middleware.
- Per-page metadata via the existing page `config` export (`config.meta`).

### Out of scope

- Service worker / offline support (PWA phase 2).
- Image optimization/resizing; critical CSS extraction.
- i18n routing.

## Functional Requirements

- FR-1: `defineConfig({})` yields a complete config with every feature enabled.
- FR-2: Head tags are injected before `</head>` without changing the layout contract; tags already
  present in the document are not duplicated.
- FR-3: `/sitemap.xml` lists static file based routes with absolute URLs; dynamic `:param` routes
  are excluded.
- FR-4: `/robots.txt` allows crawling and references the sitemap when enabled.
- FR-5: `/site.webmanifest` reflects name, colors, locale and icons from config.
- FR-6: Page-content `<img>` tags without `loading` receive `loading="lazy" decoding="async"`;
  explicit values are preserved; layout markup is not transformed.
- FR-7: `app.url` empty resolves the base URL from the request, honoring `x-forwarded-proto`.
- FR-8: Each toggle (`seo.*`, `pwa.enabled`, `performance.*`, `security.headers`) disables exactly
  its feature.

## Non Functional Requirements

- NFR-1: No new external dependencies.
- NFR-2: No breaking changes — existing pages, layouts and tests run unchanged.
- NFR-3: All injected values are HTML-escaped; JSON-LD hardened against script breakout.
- NFR-4: Asset discovery runs once at startup (no per-request filesystem I/O).

## Acceptance Criteria

- AC-1: Fresh project → `GET /` contains title, description, canonical, OG, Twitter and JSON-LD tags
  with zero config.
- AC-2: `GET /sitemap.xml` returns 200 XML including `/about`.
- AC-3: `GET /site.webmanifest` returns the config-driven manifest.
- AC-4: Static CSS responses carry Cache-Control and security headers.
- AC-5: Page with `config.meta.title = "About"` renders `<title>About — DenoX</title>`.

## Security Considerations

Escaped interpolation for all config/meta values; JSON-LD `<` escaping; static assets now behind the
security middleware; `noindex` supported per page.

## Performance Considerations

Head building is string concatenation per request (micro-cost); asset discovery cached at module
load; static cache TTL configurable (`performance.staticCacheSeconds`, default 3600).

## Tests

Unit (config merge, lazy images transform); integration (sitemap, robots, manifest, injected tags,
per-page meta, static cache+security headers).
