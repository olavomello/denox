One source of truth for the API surface — still zero runtime dependencies beyond Hono.

**OpenAPI (0.8):** the API now ships a machine-readable OpenAPI 3.1 contract assembled from
colocated per-slice descriptions (duplicate registrations fail fast), covering all 20 operations
with DTO-faithful request schemas, the cookie security scheme and an x-denox-role extension marking
admin endpoints. Served at /openapi.json alongside a zero-dependency reference page at
/docs/api-reference — server-rendered from the document itself, no Swagger bundle, no CDN scripts,
CSP unchanged (point Swagger UI or Scalar at the JSON if you prefer them). Toggle both off with api:
{ docs: false }.

**Insomnia collection is now a generated artifact:** deno task insomnia converts the document into
docs/denox-insomnia.json (folders from tags, request bodies from schema examples, [ADMIN] markers,
deterministic ids for clean diffs), and an in-suite staleness gate fails CI whenever the committed
collection drifts — the long-standing manual maintenance rule is retired.

**Drift protection:** a bidirectional parity test compares the routes Hono actually serves against
the registered descriptions — undocumented endpoints and ghost documentation both fail the build.
Documenting a new endpoint is one colocated registerOpenApiPaths call in the slice's routes file
(the creating-a-feature guide was updated accordingly).

Also in this release: ROADMAP housekeeping marking milestones 0.3-0.8 as delivered and consolidating
what remains.

Suite: 154 tests (+2 gated/conditional). Full details in CHANGELOG.md.
