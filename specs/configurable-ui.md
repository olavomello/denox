---
feature: configurable-ui
status: approved
author: olavomello
reviewed_by: olavomello
date: 2026-07-09
---

# Configurable UI, Product Carousel & Partial Update — Specification

## Objective

Move site identity (favicons, stylesheets, brand, navigation, footer) into `denox.config.ts` so it
is edited in one place and rendered safely by the framework; upgrade the product view images to a
carousel; add a partial product update endpoint (the practical gap behind "add description to
products": the field existed since the showcase spec, but entities created before it had no way to
receive one).

## Scope

### In scope

- `ui` section in `defineConfig` (favicons, stylesheets, brand, nav — global by decision, per-layout
  override deferred as YAGNI — and footer), defaults identical to the current markup (zero
  breaking).
- Config is **data only**: markup is rendered and escaped by the framework (`layouts/partials.ts`
  for header/footer; head injector for favicons and stylesheets, with dedupe). CSS preload now uses
  the configured stylesheet list. The three layouts shrink to what differentiates them.
- Product view carousel for 2+ images: CSS scroll-snap track (works without JS) +
  `denox-carousel.js` wiring prev/next buttons and a position counter; single image and no-image
  cases keep the simple rendering.
- `PATCH /api/products/:id`: partial update of name, price, description — at least one field, each
  validated by the same rules as creation.
- **Rev. 2 (maintainer directive)**: the same endpoint accepts `multipart/form-data` combining
  partial text fields, repeatable `image` attachments and repeatable `removeImages` deletions in one
  request — removals validated up front, single repository write for the final state. JSON mode
  unchanged.

### Out of scope

- Per-layout navigation overrides (future extension).
- Rich/long-form product description field; carousel thumbnails/zoom.

## Acceptance Criteria (covered by tests)

- Header brand/nav/footer/favicons/stylesheet render from config on every layout, injected exactly
  once.
- `defineConfig({ ui: { nav: [...] } })` replaces the menu wholesale while keeping the other ui
  defaults.
- 2+ images → `data-carousel` markup + carousel script; 1 image → plain media; 0 → placeholder
  initial.
- PATCH updates description on an existing product (rendered on the view), rejects empty patches and
  invalid fields, 404s on unknown products.

## Security Considerations

All ui config values pass through `escapeHtml` at render time (config cannot inject markup);
carousel script is an external file (CSP `script-src 'self'`); PATCH reuses the creation validation
rules.

## Tests

5 new integration tests (PATCH matrix, carousel, single-image, config-driven UI with
single-injection assertion) + defineConfig ui merge unit test; legacy gallery expectation updated to
the carousel.
