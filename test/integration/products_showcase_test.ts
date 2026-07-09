/**
 * Integration tests — products showcase and product view pages.
 * Exercises the shared service (API + SSR), dynamic route, per-request
 * metadata, layouts and HTML error pages.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";

/** Creates a product through the API and returns its id. */
async function createProduct(payload: Record<string, unknown>): Promise<string> {
  const res = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assertEquals(res.status, 201);
  const body = await res.json();
  return body.data.id;
}

Deno.test("showcase renders products created through the API", async () => {
  await createProduct({
    name: "Showcase Tee",
    price: 42,
    description: "A very nice tee.",
  });

  const res = await app.request("http://localhost/products");
  assertEquals(res.status, 200);
  const html = await res.text();
  assertStringIncludes(html, 'class="product-grid"');
  assertStringIncludes(html, "Showcase Tee");
  assertStringIncludes(html, "A very nice tee.");
  assertStringIncludes(html, "$42.00");
  assertStringIncludes(html, 'class="layout-showcase"');
});

Deno.test("product view renders the entity with dynamic SEO metadata", async () => {
  const id = await createProduct({
    name: "View Mug",
    price: 19.9,
    description: "Hot deploys only.",
  });

  const res = await app.request(`http://localhost/products/${id}`);
  assertEquals(res.status, 200);
  const html = await res.text();
  assertStringIncludes(html, "<title>View Mug — DenoX</title>");
  assertStringIncludes(html, 'property="og:title" content="View Mug — DenoX"');
  assertStringIncludes(html, "Hot deploys only.");
  assertStringIncludes(html, 'class="layout-product"');
  assertStringIncludes(html, "← All products");
});

Deno.test("product view escapes hostile product data", async () => {
  const id = await createProduct({
    name: '<script>alert("x")</script>',
    price: 1,
  });

  const res = await app.request(`http://localhost/products/${id}`);
  const html = await res.text();
  assertEquals(html.includes('<script>alert("x")</script>'), false);
  assertStringIncludes(html, "&lt;script&gt;");
});

Deno.test("unknown product returns an HTML 404 page (not JSON)", async () => {
  const res = await app.request("http://localhost/products/does-not-exist");
  assertEquals(res.status, 404);
  assertStringIncludes(res.headers.get("content-type") ?? "", "text/html");
  const html = await res.text();
  assertStringIncludes(html, "404");
});

Deno.test("API error responses remain JSON envelopes", async () => {
  const res = await app.request("http://localhost/api/products/does-not-exist");
  assertEquals(res.status, 404);
  const body = await res.json();
  assertEquals(body.error.code, "NOT_FOUND");
});

Deno.test("POST /api/products validates the optional showcase fields", async () => {
  const res = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Bad", price: 5, description: "" }),
  });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(typeof body.error.details.fields.description, "string");
});
