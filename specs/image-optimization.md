---
feature: image-optimization
status: draft
author: olavomello
reviewed_by:
date: 2026-07-11
---

# Image Optimization Pipeline — Specification (0.6, part 1)

## Objective

Serve product (and remote) images the modern way — correctly sized per device, modern formats
(WebP), zero layout shift, native lazy loading with blur-up placeholders, and automatic SEO alt text
— while resolving the core tension honestly: **on-demand resizing/transcoding requires an image
codec, and Deno has none built in.** The design keeps the zero-dependency default fully functional
and isolates the codec behind an interface.

## The processor decision (the heart of this spec)

`ImageProcessor` interface with two implementations:

- **`PassthroughProcessor` (default, zero dependencies)** — serves original bytes; resize/format
  params are accepted but ignored (URL contract stable). Everything codec-free still ships:
  dimension sniffing, CLS prevention, lazy loading, caching, alt SEO, shimmer placeholders.
- **`WasmProcessor` (opt-in)** — pure-wasm codec (Deno Deploy compatible; native bindings like sharp
  are ruled out), dynamically imported only when `media.optimization: true`. Enables real resizing,
  WebP encoding, quality control and blur-up placeholder generation. Final library (candidates:
  `imagescript`, `@jsquash/resize` + `@jsquash/webp`) is chosen in the architecture step with a
  size/latency benchmark — the interface makes the choice swappable.

This is a deliberate, documented exception to the zero-dependency principle: **optional, isolated,
off by default.**

## Scope

### In scope

1. **Dimension sniffing at upload (pure TS)** — parse PNG/JPEG/WebP headers (~80 lines, no codec)
   and store `width`/`height` per image. **Model change**: `Product.images` evolves `string[]` →
   `ProductImage[]` `{ url, width, height, alt }` — legacy string entries hydrated at the
   persistence boundary (established pattern).
2. **CLS prevention** — pages emit `width`/`height` (+ existing `aspect-ratio` CSS) on every product
   image; zero layout shift without any codec.
3. **Variant serving** — `GET /uploads/products/:id/:imageId?w=<int>&f=webp`: `w` restricted to the
   configured width allowlist (prevents cache-busting abuse), `f` ∈ {webp}; processed variants
   cached in BlobStorage under parameter-derived keys (compute once). Passthrough serves originals
   for any params.
4. **`imageTag()` shared helper** — emits `<img>` with `srcset` (configured widths), `sizes`,
   `loading="lazy"` / `decoding="async"` (first image `eager` for LCP), dimensions and alt; adopted
   by showcase, product view and carousel.
5. **Blur-up placeholders** — wasm tier: ~16px variant generated at upload, stored as a data URI (≤1
   KB) in the image metadata, CSS crossfade on load. Passthrough tier: neutral CSS shimmer (no fake
   blur).
6. **Remote images** — `GET /img?src=<url>&w=<int>`: proxies and (wasm tier) resizes remote images.
   **SSRF-guarded**: https only, host must match a non-empty `media.remotePatterns` allowlist (empty
   list = endpoint disabled), response size ceiling (5 MB), no redirect following, magic-byte
   validation, cached in BlobStorage.
7. **Alt SEO formalized** — alt derived automatically: `"<product name> — photo N"`
   (description-based summaries considered and rejected: too long for alt). Optional per-image `alt`
   accepted in the unified PATCH (repeatable `alts` field aligned by upload order).
8. **Config** — `media` section:
   `{ optimization: false, widths: [320,
   640, 960, 1280], quality: 80, remotePatterns: [] }`.

### Out of scope

- AVIF (encoder wasm size unjustified today), art direction (`<picture>`), EXIF handling in
  passthrough (wasm re-encode strips it; documented), upload-time eager variant pre-generation, CDN
  integration, animated image handling (GIF unsupported since upload validation).

## Functional Requirements

- FR-1: Upload stores real dimensions for PNG/JPEG/WebP; pages render `width`/`height` attributes
  (asserted in HTML).
- FR-2: Legacy `string[]` image records hydrate to `ProductImage[]` (dimensions 0×0 → attributes
  omitted) without errors.
- FR-3: With optimization **off**: `?w=640&f=webp` returns the original bytes/type, 200 (contract
  stable).
- FR-4: With optimization **on** (wasm): `?w=640` returns width ≤ 640 with the same aspect ratio;
  `?f=webp` returns `image/webp`; second request hits the variant cache (asserted via processor
  call-count).
- FR-5: `?w=999` (not in allowlist) → 400.
- FR-6: `/img` rejects non-https, non-allowlisted hosts and oversized bodies; allowlisted fetch
  round-trips (mock server in tests).
- FR-7: `imageTag()` output: srcset with every configured width, sizes, lazy/eager policy, derived
  alt.
- FR-8: PATCH `alts` sets per-image alt, rendered on the page.

## Non Functional Requirements

- NFR-1: Default path zero-dependency; wasm loaded only when enabled.
- NFR-2: Deno Deploy compatible (pure wasm, no FS writes).
- NFR-3: Existing image tests remain green (model hydration transparent).
- NFR-4: Variant processing bounded: one in-flight process per variant key (concurrent requests
  await the same computation).

## Security Considerations

Width allowlist bounds cache/CPU abuse; `/img` SSRF controls as FR-6 (plus DNS-rebinding note: host
check on the URL, fetch without redirects); processed outputs served with detected content type;
remote bytes magic-byte validated before processing; data-URI placeholders capped at 1 KB.

## Tests

Unit: dimension sniffing matrix (including truncated files), imageTag, allowlist validation, remote
URL guard. Integration: FR matrix on passthrough (always) + wasm tier behind an env flag so CI
without the dependency still passes (`IMAGE_OPTIMIZATION_TESTS=1` job note). Estimated +18–22 tests.

## Documentation

`docs/image-optimization.md` (tiers, config, enabling wasm, remote patterns, SSRF notes), products
docs update, Insomnia (variant params on the image GET), CHANGELOG (model change flagged).
