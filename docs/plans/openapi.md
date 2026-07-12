# OpenAPI — Implementation Plan

1. shared/openapi.ts: types, registry with duplicate fail-fast, envelope/ param helpers, components
   (security scheme + shared schemas), sorted deterministic assembler; `api.docs` config section.
2. Colocated descriptions across health, auth, users, products, contact and payments (20 operations,
   DTO-faithful schemas, role extension).
3. frontend/openapi.routes.ts: /openapi.json + zero-dep reference page (injectable toggle).
4. scripts/generate_insomnia.ts + `deno task insomnia`; regenerate the committed collection from the
   document.
5. Tests: assembler units (shape, determinism, duplicates, envelope) + FR matrix (document,
   bidirectional parity, DTO schemas, reference render/toggle, staleness gate, role extension). 9
   files → 154 total.
6. Docs (openapi, architecture), guide step swap (Insomnia manual → register + task), ROADMAP
   housekeeping, CHANGELOG.
