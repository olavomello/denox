/**
 * Unit tests — OpenAPI assembler and helpers.
 */

import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildOpenApiDocument, okResponse, registerOpenApiPaths } from "@/shared/openapi.ts";
import "@/app.ts"; // boot registrations

Deno.test("document carries info from config, components and sorted paths", () => {
  const doc = buildOpenApiDocument();
  assertEquals(doc.openapi, "3.1.0");
  assertStringIncludes(doc.info.title, "API");
  assertEquals(typeof doc.components.securitySchemes.sessionCookie, "object");
  const paths = Object.keys(doc.paths);
  assertEquals(paths, [...paths].sort());
  assertEquals(paths.includes("/api/auth/login"), true);
});

Deno.test("duplicate operation registration fails fast", () => {
  assertThrows(
    () =>
      registerOpenApiPaths({
        "/api/ping": { get: { operationId: "x", summary: "dup", tags: ["Health"], responses: {} } },
      }),
    Error,
  );
});

Deno.test("okResponse wraps data in the success envelope", () => {
  const r = okResponse("ok", { type: "string" });
  const schema = r.content["application/json"].schema;
  assertEquals(schema.properties.success.const, true);
  assertEquals(schema.properties.data.type, "string");
});
