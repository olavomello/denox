# Production Ready by Default — Implementation Plan

1. `define_config.ts` — types, defaults, merge (pure) + unit tests.
2. Root `denox.config.ts` + `site.ts` singleton.
3. `optimize.ts` (lazy images) + unit tests.
4. `head.ts` — base URL resolver, asset discovery, tag builder, injector.
5. `seo.routes.ts` + `pwa.routes.ts`; remove static site.webmanifest.
6. Integrate: render.ts (meta + inject + lazify), frontend/main.ts, security.ts toggle, app.ts
   ordering + static cache.
7. Integration tests; keep all existing tests green (no breaking changes).
8. Docs + CHANGELOG + VERSION.

Definition of done: `deno task ci` green; acceptance criteria covered.
