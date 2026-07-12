# OpenAPI — Architecture

```
src/shared/openapi.ts          types (OAS 3.1 subset), registry (fail-fast
                               duplicates), assembler, helper builders
src/api/*/*.routes.ts          colocated registerOpenApiPaths per slice
src/frontend/openapi.routes.ts /openapi.json + server-rendered reference
scripts/generate_insomnia.ts   OpenAPI → Insomnia v4 converter (task)
```

## Decisions

- **Zero dependencies end to end**: hand-rolled types for the subset we emit; the reference page is
  server-rendered HTML (no Swagger UI bundle, no CDN scripts — CSP untouched). External UIs consume
  /openapi.json.
- **Colocation over centralization**: descriptions live next to the routes they describe (registry
  philosophy); duplicates fail fast.
- **Parity both ways**: the test diff between Hono's served /api routes and registered operations
  catches undocumented endpoints AND ghost documentation — the mechanism that keeps contracts honest
  over time.
- **Insomnia as artifact**: the standing "update the collection" rule became `deno task insomnia` +
  an in-suite staleness gate (string equality against the committed file; deterministic ids/sort
  keys).
- Document assembled at boot; serialization memoized.
