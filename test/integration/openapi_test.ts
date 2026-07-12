/**
 * Integration tests — OpenAPI document, parity, reference page and the
 * generated Insomnia collection staleness check.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { Hono } from "hono";
import { app } from "@/app.ts";
import { registerOpenApiRoutes } from "@/frontend/openapi.routes.ts";
import { buildOpenApiDocument, registeredOperations } from "@/shared/openapi.ts";
import { buildInsomniaCollection } from "../../scripts/generate_insomnia.ts";

Deno.test("FR-1: /openapi.json serves a valid 3.1 document", async () => {
  const res = await app.request("http://localhost/openapi.json");
  assertEquals(res.status, 200);
  const doc = await res.json();
  assertEquals(doc.openapi, "3.1.0");
  assertEquals(typeof doc.paths["/api/payments/checkout"].post, "object");
});

Deno.test("FR-2: served routes and document agree in BOTH directions", () => {
  // Real /api routes Hono serves (dedup; middleware entries filtered out).
  const served = new Set<string>();
  for (const route of app.routes) {
    if (!route.path.startsWith("/api/") && route.path !== "/api") continue;
    if (!["GET", "POST", "PATCH", "DELETE"].includes(route.method)) continue;
    if (route.handler.length < 1) continue;
    served.add(`${route.method} ${route.path.replace(/:(\w+)/g, "{$1}")}`);
  }
  const documented = new Set(
    registeredOperations().map((op) => `${op.method} ${op.path}`),
  );
  const missingDocs = [...served].filter((r) => !documented.has(r));
  const ghostDocs = [...documented].filter((r) => !served.has(r));
  assertEquals(missingDocs, []); // every served route is described
  assertEquals(ghostDocs, []); // every description matches a real route
});

Deno.test("FR-3: DTO-backed operations carry matching request schemas", () => {
  const doc = buildOpenApiDocument();
  const signup = doc.paths["/api/auth/signup"].post.requestBody.content["application/json"].schema;
  assertEquals(signup.properties.password.minLength, 8);
  assertEquals(signup.required.includes("email"), true);
  const checkout = doc.paths["/api/payments/checkout"].post.requestBody
    .content["application/json"].schema;
  assertEquals(checkout.oneOf.length, 2);
  const slug = doc.paths["/api/products/{id}"].patch.requestBody
    .content["application/json"].schema;
  assertEquals(slug.properties.slug.pattern, "^[a-z0-9-]{1,80}$");
});

Deno.test("FR-4: reference page renders tags escaped, and the toggle removes it", async () => {
  const res = await app.request("http://localhost/docs/api-reference");
  assertEquals(res.status, 200);
  const html = await res.text();
  assertStringIncludes(html, "<h2>Payments</h2>");
  assertStringIncludes(html, "badge-admin");
  assertEquals(html.includes("<script"), false); // CSP-clean, zero deps

  const off = new Hono();
  registerOpenApiRoutes(off, false);
  const disabled = await off.request("http://localhost/openapi.json");
  assertEquals(disabled.status, 404);
  await disabled.body?.cancel();
});

Deno.test("FR-5: committed Insomnia collection matches the generator (staleness gate)", async () => {
  const generated = JSON.stringify(buildInsomniaCollection(), null, 2) + "\n";
  const committed = await Deno.readTextFile("docs/denox-insomnia.json");
  assertEquals(committed, generated);
});

Deno.test("FR-6: role requirements are machine-readable", () => {
  const doc = buildOpenApiDocument();
  assertEquals(doc.paths["/api/users"].get["x-denox-role"], "admin");
  assertEquals(doc.paths["/api/payments"].get.security[0].sessionCookie.length, 0);
});
