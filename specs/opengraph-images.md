---
feature: opengraph-images
status: draft
author: olavomello
reviewed_by:
date: 2026-07-11
---

# Open Graph Images — Specification (0.6, part 2)

## Objective

Give every page and product a correct, controllable social-sharing image through a dedicated
`opengraph-image.ts` convention module — with the metadata scrapers actually require: **absolute**
URLs, declared dimensions and alt text — layered over what already exists (site default in
`seo.image`, dynamic per-request images from page meta resolvers).

## Scope

### In scope

1. **`src/frontend/opengraph-image.ts` convention module** (explicit, user-editable — same
   philosophy as the layout/cron registries):

   ```ts
   export const ogImages: OgImageRegistry = {
     // Site-wide fallback lives in denox.config.ts (seo.image); entries
     // here override it per route:
     "/about": { image: "/images/og/about.png", width: 1200, height: 630, alt: "About DenoX" },
     "/products": { image: "/images/og/store.png", width: 1200, height: 630, alt: "Store" },
   };
   ```

2. **`OgImage` type** `{ image, width?, height?, alt? }`; `PageMeta.image` widens to
   `string | OgImage` (backward compatible) so dynamic meta resolvers can also declare
   dimensions/alt.
3. **Precedence** (most specific wins): page `meta.image` (incl. dynamic resolvers) →
   `opengraph-image.ts` route entry → `seo.image` site default.
4. **Correct emission in the head builder**:
   - `og:image` (and `twitter:image`) resolved to an **absolute URL** against the request base
     (relative URLs are invalid per the OG spec and break most scrapers — this also fixes the
     current product pages);
   - `og:image:width` / `og:image:height` when known;
   - `og:image:alt` / `twitter:image:alt` when provided;
   - `twitter:card` stays `summary_large_image` only when an image resolves, falling back to
     `summary` otherwise (today it always claims a large image even without one).
5. **Products get dimensions for free**: the product view's meta resolver passes the cover's
   `ProductImage` width/height (from part 1's header sniffing) into the emitted tags.
6. **Boot validation**: registry entries pointing at local paths (`/...`) are checked against
   `public/` at startup — a missing file logs a structured warning (not fatal: the asset may ship
   later or be remote).
7. Default registry ships **empty** with commented examples (framework provides mechanism;
   `seo.image` remains the out-of-the-box behavior).

### Out of scope

- **Dynamic OG image generation** (rendering title/text into a PNG needs font rasterization —
  satori/canvas territory; tracked as a possible 0.6.x follow-up on the wasm tier, not this cycle).
- Per-locale images; multiple `og:image` entries per page.

## Functional Requirements

- FR-1: A route present in the registry emits its image (absolute URL), dimensions and alt on that
  page only.
- FR-2: Page `meta.image` (string or OgImage) overrides the registry entry for the same route.
- FR-3: Pages with neither use `seo.image`; with `seo.image` empty, no `og:image` is emitted and
  `twitter:card` downgrades to `summary`.
- FR-4: Product view emits `og:image:width`/`height` matching the stored cover dimensions
  (upload-sniffed), and `og:image` is absolute.
- FR-5: Registry entry with a missing local file logs a warning at boot; the app still serves.
- FR-6: All emitted values are escaped; remote (https) image URLs pass through untouched.

## Non Functional Requirements

- NFR-1: Zero dependencies; no new HTTP endpoints.
- NFR-2: Existing pages/tests unaffected except the twitter:card no-image downgrade (documented;
  assertions updated).
- NFR-3: Registry read once at import (static data), absolutization per request (needs the host).

## Security Considerations

Escaping as everywhere; boot validation reads only inside `public/` (no path traversal — normalized
and prefix-checked); absolutization uses the framework's existing base-URL resolution (proxy-aware)
rather than trusting arbitrary Host reflection beyond what canonical URLs already do.

## Tests

Unit: precedence resolver matrix; OgImage/string widening; validation path-check. Integration: FR
matrix over real pages (registry entry via a test-scoped registry injection or the shipped example
route), product dimensions round-trip, twitter downgrade. Estimated +10–12 tests.

## Documentation

`docs/opengraph-images.md` (precedence, registry examples, image size guidance 1200×630, validating
with social debuggers), CHANGELOG, README feature line on release.
