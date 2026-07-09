/**
 * Integration tests — product PATCH endpoint, image carousel and
 * config-driven UI (header/nav/footer/favicons from denox.config.ts).
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";

const PNG_BYTES = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

/** Creates a product and returns its id. */
async function createProduct(name: string): Promise<string> {
  const res = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, price: 10 }),
  });
  const body = await res.json();
  return body.data.id;
}

Deno.test("PATCH /api/products/:id updates the description of an existing product", async () => {
  const id = await createProduct("Patchable");

  const res = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ description: "Added after creation." }),
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.description, "Added after creation.");
  assertEquals(body.data.name, "Patchable");

  const view = await app.request(`http://localhost/products/${id}`);
  assertStringIncludes(await view.text(), "Added after creation.");
});

Deno.test("PATCH validates fields and rejects empty patches", async () => {
  const id = await createProduct("Strict");

  const empty = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assertEquals(empty.status, 400);
  await empty.body?.cancel();

  const invalid = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ price: -5 }),
  });
  assertEquals(invalid.status, 400);
  const body = await invalid.json();
  assertEquals(typeof body.error.details.fields.price, "string");

  const missing = await app.request("http://localhost/api/products/nope", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "New" }),
  });
  assertEquals(missing.status, 404);
  await missing.body?.cancel();
});

Deno.test("product view renders a carousel for multiple images", async () => {
  const id = await createProduct("Carouseled");
  const form = new FormData();
  form.append("image", new File([PNG_BYTES.slice()], "a.png"));
  form.append("image", new File([PNG_BYTES.slice()], "b.png"));
  await (await app.request(`http://localhost/api/products/${id}/images`, {
    method: "POST",
    body: form,
  })).body?.cancel();

  const view = await app.request(`http://localhost/products/${id}`);
  const html = await view.text();
  assertStringIncludes(html, "data-carousel");
  assertStringIncludes(html, "data-carousel-track");
  assertStringIncludes(html, "denox-carousel.js");
});

Deno.test("single-image products render plain media (no carousel)", async () => {
  const id = await createProduct("Single");
  const form = new FormData();
  form.append("image", new File([PNG_BYTES.slice()], "a.png"));
  await (await app.request(`http://localhost/api/products/${id}/images`, {
    method: "POST",
    body: form,
  })).body?.cancel();

  const view = await app.request(`http://localhost/products/${id}`);
  const html = await view.text();
  assertEquals(html.includes("data-carousel"), false);
  assertStringIncludes(html, 'class="product-view-media"');
});

Deno.test("header, nav, footer and favicons render from the ui config", async () => {
  const res = await app.request("http://localhost/");
  const html = await res.text();
  assertStringIncludes(html, 'class="brand"');
  assertStringIncludes(html, '<a href="/products">Products</a>');
  assertStringIncludes(html, "Powered by");
  assertStringIncludes(html, 'href="https://github.com/olavomello/denox"');
  assertStringIncludes(html, 'href="/images/favicon/favicon-32x32.png"');
  assertStringIncludes(html, 'rel="stylesheet" href="/assets/css/default.css"');
  // injected once (layout no longer hardcodes them)
  assertEquals(html.split("favicon-32x32.png").length - 1, 1);
});
