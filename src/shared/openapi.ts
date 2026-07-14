/**
 * OpenAPI 3.1 description layer — zero dependencies.
 *
 * Slices describe their endpoints where they live (registerOpenApiPaths in
 * each *.routes.ts, same colocation philosophy as the registries); the
 * assembler merges everything into a single document served at
 * /openapi.json. The Insomnia collection is GENERATED from this document
 * (deno task insomnia) — one source of truth for the API surface, kept
 * honest by the bidirectional parity test.
 */

import { site } from "@/config/site.ts";

/** Permissive JSON-schema-ish object (the subset we emit). */
// deno-lint-ignore no-explicit-any
export type SchemaObject = Record<string, any>;

/** A single OpenAPI operation. */
export interface OperationObject {
  readonly operationId: string;
  readonly summary: string;
  readonly description?: string;
  readonly tags: readonly string[];
  readonly security?: readonly Record<string, readonly string[]>[];
  /** DenoX extension: role demanded by the middleware. */
  readonly "x-denox-role"?: "admin" | "user";
  /** DenoX extension: practical ordering inside the Insomnia folder. */
  readonly "x-denox-sort"?: number;
  /** DenoX extension: named request examples (one Insomnia request each). */
  readonly "x-denox-examples"?: readonly {
    readonly name: string;
    readonly body?: unknown;
    readonly multipart?: readonly {
      name: string;
      value?: string;
      file?: boolean;
      disabled?: boolean;
    }[];
  }[];
  readonly parameters?: readonly SchemaObject[];
  readonly requestBody?: SchemaObject;
  readonly responses: Record<string, SchemaObject>;
}

/** Methods we serve. */
export type HttpMethod = "get" | "post" | "patch" | "delete";

/** Operations for one path, keyed by method. */
export type PathItem = Partial<Record<HttpMethod, OperationObject>>;

const registry = new Map<string, PathItem>();

/**
 * Registers a slice's endpoint descriptions (fail-fast on duplicates).
 *
 * @param paths OpenAPI paths (templated: /api/products/{id}).
 */
export function registerOpenApiPaths(paths: Record<string, PathItem>): void {
  for (const [path, item] of Object.entries(paths)) {
    const existing = registry.get(path) ?? {};
    for (const method of Object.keys(item) as HttpMethod[]) {
      if (existing[method] !== undefined) {
        throw new Error(`Duplicate OpenAPI operation: ${method.toUpperCase()} ${path}`);
      }
    }
    registry.set(path, { ...existing, ...item });
  }
}

/** Session-cookie security requirement (any authenticated user). */
export const userSecurity = [{ sessionCookie: [] as string[] }] as const;

/** Convenience: JSON request body from a schema. */
export function jsonBody(schema: SchemaObject, required = true): SchemaObject {
  return { required, content: { "application/json": { schema } } };
}

/** Convenience: 2xx envelope response referencing a data schema. */
export function okResponse(description: string, dataSchema: SchemaObject): SchemaObject {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: { success: { type: "boolean", const: true }, data: dataSchema },
          required: ["success", "data"],
        },
      },
    },
  };
}

/** Convenience: error envelope response. */
export function errorResponse(description: string): SchemaObject {
  return {
    description,
    content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
  };
}

/** Convenience: a path parameter. */
export function pathParam(
  name: string,
  description: string,
  schema: SchemaObject = { type: "string" },
): SchemaObject {
  return { name, in: "path", required: true, description, schema };
}

/** Convenience: a query parameter. */
export function queryParam(name: string, description: string, schema: SchemaObject): SchemaObject {
  return { name, in: "query", required: false, description, schema };
}

/** Shared component schemas referenced across operations. */
const components: SchemaObject = {
  securitySchemes: {
    sessionCookie: {
      type: "apiKey",
      in: "cookie",
      name: "denox_session",
      description: "Revocable server-side session started by /api/auth/signup or /api/auth/login.",
    },
  },
  schemas: {
    ErrorEnvelope: {
      type: "object",
      properties: {
        success: { type: "boolean", const: false },
        error: {
          type: "object",
          properties: {
            code: { type: "string" },
            message: { type: "string" },
            details: { type: "object" },
          },
          required: ["code", "message"],
        },
      },
      required: ["success", "error"],
    },
    PublicUser: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        email: { type: "string", format: "email" },
        role: { type: "string", enum: ["admin", "user"] },
        createdAt: { type: "string", format: "date-time" },
      },
      required: ["id", "name", "email", "role", "createdAt"],
    },
    ProductImage: {
      type: "object",
      properties: {
        url: { type: "string" },
        width: { type: "integer", description: "0 when unknown (legacy records)" },
        height: { type: "integer" },
        alt: { type: "string", description: "Empty = derived from product name" },
      },
      required: ["url", "width", "height", "alt"],
    },
    Product: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        slug: { type: "string", pattern: "^[a-z0-9-]{1,80}$" },
        sku: {
          type: "string",
          pattern: "^[A-Za-z0-9._-]{1,64}$",
          description: "Optional stock keeping unit — unique when present.",
        },
        price: { type: "number" },
        description: { type: "string" },
        images: { type: "array", items: { $ref: "#/components/schemas/ProductImage" } },
        createdAt: { type: "string", format: "date-time" },
      },
      required: ["id", "name", "slug", "price", "images", "createdAt"],
    },
    ProductSnapshot: {
      type: "object",
      description: "Product state at checkout time (purchase history survives edits/deletion).",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        sku: { type: "string", description: "Present when the product had one at checkout." },
        price: { type: "number" },
      },
      required: ["id", "name", "price"],
    },
    Payment: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        provider: { type: "string" },
        providerId: { type: "string" },
        status: {
          type: "string",
          enum: ["pending", "processing", "paid", "failed", "cancelled", "expired", "refunded"],
          description: "processing/cancelled/refunded are reserved for future events.",
        },
        amountCents: { type: "integer" },
        currency: { type: "string" },
        description: { type: "string" },
        productId: { type: "string" },
        productSnapshot: { $ref: "#/components/schemas/ProductSnapshot" },
        userId: { type: "string" },
        metadata: { type: "object", additionalProperties: { type: "string" } },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        paidAt: { type: "string", format: "date-time" },
      },
      required: [
        "id",
        "provider",
        "providerId",
        "status",
        "amountCents",
        "currency",
        "userId",
        "createdAt",
        "updatedAt",
      ],
    },
  },
};

let cached: string | null = null;

/**
 * Assembles the OpenAPI document from every registered slice.
 *
 * @returns The document object (paths sorted for determinism).
 */
export function buildOpenApiDocument(): SchemaObject {
  const paths: SchemaObject = {};
  for (const path of [...registry.keys()].sort()) {
    paths[path] = registry.get(path);
  }
  return {
    openapi: "3.1.0",
    info: {
      title: `${site.app.name} API`,
      description: site.app.description,
      version: "0.8.0",
    },
    servers: [{ url: site.app.url }, { url: "http://localhost:8000" }],
    paths,
    components,
  };
}

/**
 * Serialized document (memoized — registrations happen at boot).
 *
 * @returns Stable JSON string.
 */
export function openApiJson(): string {
  cached ??= JSON.stringify(buildOpenApiDocument(), null, 2);
  return cached;
}

/** Test seam: clears memoization/registry (unit tests only). */
export function resetOpenApiRegistry(): void {
  registry.clear();
  cached = null;
}

/** @returns Registered templated paths with their methods (parity test). */
export function registeredOperations(): readonly { method: string; path: string }[] {
  const out: { method: string; path: string }[] = [];
  for (const [path, item] of registry.entries()) {
    for (const method of Object.keys(item)) out.push({ method: method.toUpperCase(), path });
  }
  return out;
}
