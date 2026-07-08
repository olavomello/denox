/**
 * Integration tests — product image upload/serving and chunked KV blobs.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";
import { KvBlobStorage } from "@/shared/blob_storage.ts";

/** 1x1 transparent PNG. */
const PNG_BYTES = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

/** Creates a product through the API and returns its id. */
async function createProduct(name: string): Promise<string> {
  const res = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, price: 10 }),
  });
  const body = await res.json();
  return body.data.id;
}

/** Uploads bytes as the product image via multipart. */
async function uploadImage(id: string, bytes: Uint8Array, filename = "x.png"): Promise<Response> {
  const form = new FormData();
  form.append("image", new File([bytes.slice()], filename, { type: "application/octet-stream" }));
  return await app.request(`http://localhost/api/products/${id}/image`, {
    method: "POST",
    body: form,
  });
}

Deno.test("uploading a PNG sets imageUrl and serves the exact bytes back", async () => {
  const id = await createProduct("Pictured");

  const uploaded = await uploadImage(id, PNG_BYTES);
  assertEquals(uploaded.status, 200);
  const body = await uploaded.json();
  assertEquals(body.data.imageUrl, `/api/products/${id}/image`);

  const served = await app.request(`http://localhost/api/products/${id}/image`);
  assertEquals(served.status, 200);
  assertEquals(served.headers.get("content-type"), "image/png");
  const bytes = new Uint8Array(await served.arrayBuffer());
  assertEquals(bytes.length, PNG_BYTES.length);
  assertEquals([...bytes.slice(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
});

Deno.test("showcase and product view render the uploaded image", async () => {
  const id = await createProduct("Visible");
  await (await uploadImage(id, PNG_BYTES)).body?.cancel();

  const showcase = await app.request("http://localhost/products");
  assertStringIncludes(await showcase.text(), `src="/api/products/${id}/image"`);

  const view = await app.request(`http://localhost/products/${id}`);
  const html = await view.text();
  assertStringIncludes(html, `src="/api/products/${id}/image"`);
  assertStringIncludes(html, `property="og:image"`);
});

Deno.test("upload rejects non-image content with a field error", async () => {
  const id = await createProduct("Guarded");
  const res = await uploadImage(id, new TextEncoder().encode("#!/bin/sh evil"), "evil.png");
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertEquals(typeof body.error.details.fields.image, "string");
});

Deno.test("upload to an unknown product returns 404; missing image returns 404", async () => {
  const missing = await uploadImage("nope", PNG_BYTES);
  assertEquals(missing.status, 404);
  await missing.body?.cancel();

  const id = await createProduct("Imageless");
  const noImage = await app.request(`http://localhost/api/products/${id}/image`);
  assertEquals(noImage.status, 404);
  await noImage.body?.cancel();
});

Deno.test("KvBlobStorage chunks blobs beyond the 64KiB KV value limit", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const storage = new KvBlobStorage(kv);
    const big = new Uint8Array(150_000);
    for (let i = 0; i < big.length; i++) big[i] = i % 251;

    await storage.put("test/big", { contentType: "image/png", bytes: big });
    const loaded = await storage.get("test/big");

    assertEquals(loaded?.contentType, "image/png");
    assertEquals(loaded?.bytes.length, 150_000);
    assertEquals(loaded?.bytes[149_999], 149_999 % 251);

    await storage.delete("test/big");
    assertEquals(await storage.get("test/big"), null);
  } finally {
    kv.close();
  }
});
