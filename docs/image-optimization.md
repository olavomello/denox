# Image Optimization

Product images are served through a two-tier pipeline. **Everything below except
resizing/transcoding works with zero dependencies.**

## Always on (passthrough tier — the default)

- **Real dimensions** read from PNG/JPEG/WebP headers at upload (pure TS, no codec) and stored per
  image; pages emit `width`/`height` — **zero layout shift** while images load.
- **Responsive markup** via the `imageTag()` helper: `srcset` over the configured widths, `sizes`,
  native `loading="lazy"` (`eager` + `fetchpriority=high` for the LCP image), `decoding="async"`.
- **SEO alt text** derived automatically from the product name (`"<name> —
  photo N"`), overridable
  per image with the repeatable `alts` field on the unified multipart PATCH.
- Variant URLs (`?w=`, `?f=webp`) are **accepted and stable** — the passthrough tier serves the
  original bytes for any params, so templates never change when you enable optimization later.

## Opt-in (wasm tier)

```ts
// denox.config.ts
media: {
  optimization: true,          // loads the wasm codec (imagescript)
  widths: [320, 640, 960, 1280], // ?w= allowlist (bounds cache/CPU abuse)
  quality: 80,
  remotePatterns: [],          // hosts allowed on /img (empty = disabled)
}
```

With optimization on, `GET /uploads/products/<id>/<imageId>?w=640&f=webp` resizes (aspect preserved,
never upscales) and/or transcodes to WebP; variants are computed once, cached in BlobStorage and
deduplicated in flight. This is the framework's one deliberate dependency exception: **optional,
isolated, off by default** — and pure wasm (the npm build of imagescript uses native FFI codecs and
is NOT Deno Deploy compatible; the framework loads the deno.land/x pure-wasm build).

## Remote images — `/img`

`GET /img?src=https://cdn.example.com/a.jpg&w=640` proxies (and, on the wasm tier, resizes) remote
images. SSRF-guarded: disabled until `media.remotePatterns` lists hosts, https-only, no redirect
following, 5 MB ceiling, magic-byte validation, cached.

## Testing the wasm tier

Default CI never touches the dependency. Enable locally: `media.optimization: true` +
`IMAGE_OPTIMIZATION_TESTS=1 deno task test` (runs the gated codec test — resize + WebP round-trip).
