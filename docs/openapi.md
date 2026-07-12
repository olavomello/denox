# OpenAPI

The API ships a machine-readable contract assembled from **colocated descriptions** in each slice's
routes file — one source of truth kept honest by a bidirectional parity test.

## Endpoints

- **`/openapi.json`** — the OpenAPI 3.1 document (info from `denox.config.ts`, cookie security
  scheme, shared schemas, every operation with auth requirements and the error envelope).
- **`/docs/api-reference`** — zero-dependency reference page rendered server-side from the document
  (no Swagger bundle, no CDN scripts — CSP unchanged). Prefer Swagger UI or Scalar? Point them at
  `/openapi.json`. Toggle both off with `api: { docs: false }`.

## Describing a new endpoint

In your slice's `*.routes.ts`, alongside the registration:

```ts
import { errorResponse, jsonBody, okResponse, registerOpenApiPaths } from "@/shared/openapi.ts";

registerOpenApiPaths({
  "/api/things/{id}": {
    get: {
      operationId: "getThing",
      summary: "Get thing by id",
      tags: ["Things"],
      responses: {
        "200": okResponse("The thing", { $ref: "#/components/schemas/Thing" }),
        "404": errorResponse("Unknown thing"),
      },
    },
  },
});
```

The **parity test** fails the suite when a served `/api` route lacks a description — or when a
description points at a route that doesn't exist. Admin endpoints declare `security` +
`x-denox-role: "admin"` (rendered as a badge and an `[ADMIN]` marker).

## Generated Insomnia collection

`docs/denox-insomnia.json` is now a **build artifact**:

```bash
deno task insomnia
```

Folders come from tags, request bodies from schema `example` fields, ids and sort keys are
deterministic (clean diffs). The suite includes a staleness gate — forget to regenerate after
changing descriptions and CI fails, same pattern as the generated routes check.
