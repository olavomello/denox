---
feature: openapi
status: draft
author: olavomello
reviewed_by:
date: 2026-07-12
---

# OpenAPI — Specification (0.8)

## Objective

Give the DenoX API a machine-readable contract: an **OpenAPI 3.1 document** assembled from per-slice
route descriptions, served at `/openapi.json`, rendered by a built-in zero-dependency HTML reference
page — and used to **generate the Insomnia collection**, turning today's hand-maintained
`docs/denox-insomnia.json` (a standing rule on every endpoint change) into a build artifact. One
source of truth for the API surface.

## Scope

### In scope

**1. Description layer — `src/shared/openapi.ts`**

Zero-dependency OpenAPI 3.1 types (the subset we emit) and a document assembler. Slices describe
their endpoints where they live (colocation, same philosophy as the registries):

```ts
// in each *.routes.ts
registerOpenApiPaths({
  "/api/products": {
    get: { summary: "List products", tags: ["Products"], responses: {...} },
    post: { summary: "Create product", security: adminCookie, requestBody: {...} },
  },
});
```

Shared helpers for the envelope (`ok/error` response wrappers), cookie `securitySchemes`
(`sessionCookie`) and the `[ADMIN]` marker convention.

**2. Coverage of the existing surface**

Health, auth (signup/login/logout/me), users (admin reads), products (CRUD + images + variant
params), contact, payments (checkout/webhook/ reads) — with real request/response schemas for the
DTOs we already validate, parameter docs (slug, image variant `w`/`f`), auth requirements and error
envelope (401/403/404/409/422/429/501) documented once and referenced.

**3. Serving**

- `GET /openapi.json` — the document (public; it describes a public API).
- `GET /docs/api-reference` — server-rendered HTML reference built from the document itself:
  tag-grouped endpoints, methods, schemas, auth badges. **Zero dependencies and CSP-clean** (no
  Swagger UI bundle, no CDN scripts — users who prefer Swagger UI/Scalar can point them at
  `/openapi.json`). Toggle: `seo`-style config `api.docs: true`.

**4. Insomnia generation — `deno task insomnia`**

Script converting the OpenAPI document into `docs/denox-insomnia.json` (same folders/markers as
today: Auth, Products, Payments, [ADMIN] tags, cookie-jar note). The standing rule changes from
"edit the collection" to "run the task"; a CI step fails when the committed collection is stale
(same pattern as the generated routes check).

**5. Drift protection**

Parity test: every route Hono actually serves under `/api` must be described in the document, and
vice versa — new endpoints without docs fail the suite (the mechanism that keeps the contract
honest).

### Out of scope

Request validation driven by the schemas (DTOs remain the validators), client SDK generation,
webhooks payload modeling beyond a permissive object, versioned specs, publishing the spec to
registries, Swagger UI vendoring.

## Functional Requirements

- FR-1: `/openapi.json` returns a valid 3.1 document (`openapi`, `info` from `denox.config.ts` app
  section, `paths`, `components`).
- FR-2: every existing `/api` route appears with method, summary, tag, auth requirement and response
  envelope; parity test enforces both directions.
- FR-3: DTO-backed operations (signup, login, product create/patch, checkout, contact) carry request
  schemas matching the validators' rules (required fields, formats, enums).
- FR-4: `/docs/api-reference` renders all tags/operations server-side, escaped, no external scripts;
  disabled cleanly via config.
- FR-5: `deno task insomnia` regenerates the collection deterministically (stable ids/sort keys —
  clean diffs); CI fails on a stale committed collection.
- FR-6: admin/user auth requirements are machine-readable (`security: [{sessionCookie: []}]` +
  `x-denox-role: admin` extension).

## Non Functional Requirements

- NFR-1: zero dependencies (hand-rolled types + assembler + renderer).
- NFR-2: describing a new endpoint is one colocated call in the slice's routes file — documented in
  the creating-a-feature guide (which drops its manual-Insomnia step).
- NFR-3: document assembly at boot (static data), serialization cached.
- NFR-4: no secrets or internal paths leak into the document.

## Security Considerations

The document describes only what the API already exposes publicly; auth requirements are advertised,
secrets never appear (schema examples use placeholders); the reference page escapes every value and
ships no third-party scripts (CSP unchanged); `api.docs: false` removes both endpoints for teams
that want the surface dark.

## Tests

Unit: assembler (paths merge, components refs, deterministic output), Insomnia converter snapshot.
Integration: FR matrix — document shape, parity both directions, reference page render + config
toggle, stale- collection check logic. Estimated +12–15 tests.

## Documentation

`docs/openapi.md` (describing endpoints, the parity test, generating Insomnia, pointing external UIs
at the spec), guide update (Insomnia step replaced by the task), ROADMAP housekeeping in the same
cycle: mark the delivered 0.3–0.7 lines, fold the stale pre-milestone sections, renumber what
remains (CLI, WebSockets, JSX pages, skills, hardening).
