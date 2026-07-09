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

/** Uploads initial images and returns their imageIds. */
async function seedImages(id: string, count: number): Promise<string[]> {
  const form = new FormData();
  for (let i = 0; i < count; i++) {
    form.append("image", new File([PNG_BYTES.slice()], `seed-${i}.png`));
  }
  const res = await app.request(`http://localhost/api/products/${id}/images`, {
    method: "POST",
    body: form,
  });
  const body = await res.json();
  return body.data.images.map((url: string) => url.split("/").pop());
}

Deno.test("multipart PATCH updates data and adds photos in one request", async () => {
  const id = await createProduct("Unified");

  const form = new FormData();
  form.append("name", "Unified Renamed");
  form.append("price", "59.9");
  form.append("image", new File([PNG_BYTES.slice()], "new.png"));

  const res = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    body: form,
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.name, "Unified Renamed");
  assertEquals(body.data.price, 59.9);
  assertEquals(body.data.images.length, 1);
});

Deno.test("multipart PATCH removes and adds photos atomically with data", async () => {
  const id = await createProduct("Swapper");
  const [first, second] = await seedImages(id, 2);

  const form = new FormData();
  form.append("description", "Photos swapped.");
  form.append("removeImages", first ?? "");
  form.append("image", new File([PNG_BYTES.slice()], "third.png"));

  const res = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    body: form,
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.description, "Photos swapped.");
  assertEquals(body.data.images.length, 2);
  assertEquals(
    body.data.images.some((url: string) => url.endsWith(first ?? "?")),
    false,
  );
  assertEquals(
    body.data.images.some((url: string) => url.endsWith(second ?? "?")),
    true,
  );

  const removed = await app.request(`http://localhost/uploads/products/${id}/${first}`);
  assertEquals(removed.status, 404);
  await removed.body?.cancel();
});

Deno.test("multipart PATCH with only photos (no data fields) is accepted", async () => {
  const id = await createProduct("PhotosOnly");
  const form = new FormData();
  form.append("image", new File([PNG_BYTES.slice()], "solo.png"));

  const res = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    body: form,
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.images.length, 1);
});

Deno.test("multipart PATCH rejects empty payloads and unknown removals", async () => {
  const id = await createProduct("Empty");

  const empty = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    body: new FormData(),
  });
  assertEquals(empty.status, 400);
  await empty.body?.cancel();

  const form = new FormData();
  form.append("removeImages", "00000000-0000-4000-8000-000000000000.png");
  const missing = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    body: form,
  });
  assertEquals(missing.status, 404);
  await missing.body?.cancel();

  const hostile = new FormData();
  hostile.append("removeImages", "../secret.png");
  const rejected = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    body: hostile,
  });
  assertEquals(rejected.status, 400);
  await rejected.body?.cancel();
});
