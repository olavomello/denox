/**
 * Integration tests — product images: multi-upload, public serving under
 * /uploads, image deletion, product deletion and chunked KV blobs.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";
import { adminCookie } from "../helpers/auth.ts";

const ADMIN = await adminCookie();
import { KvBlobStorage } from "@/shared/blob_storage.ts";

/** 1x1 transparent PNG. */
const PNG_BYTES = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

/** Minimal JPEG header bytes (sniffable, not a full image). */
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

/** Creates a product through the API and returns its id. */
async function createProduct(name: string): Promise<string> {
  const res = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ADMIN },
    body: JSON.stringify({ name, price: 10 }),
  });
  const body = await res.json();
  return body.data.id;
}

/** Fetches the current slug of a product. */
async function slugOf(id: string): Promise<string> {
  const res = await app.request(`http://localhost/api/products/${id}`);
  const body = await res.json();
  return body.data.slug;
}

/** Uploads one or more files as product images via multipart. */
async function uploadImages(id: string, files: readonly Uint8Array[]): Promise<Response> {
  const form = new FormData();
  for (const bytes of files) {
    form.append("image", new File([bytes.slice()], "upload.bin"));
  }
  return await app.request(`http://localhost/api/products/${id}/images`, {
    method: "POST",
    body: form,
    headers: { cookie: ADMIN },
  });
}

Deno.test("uploading multiple images appends public /uploads URLs", async () => {
  const id = await createProduct("Multi");

  const res = await uploadImages(id, [PNG_BYTES, JPEG_BYTES]);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.images.length, 2);
  assertStringIncludes(body.data.images[0], `/uploads/products/${id}/`);
  assertStringIncludes(body.data.images[0], ".png");
  assertStringIncludes(body.data.images[1], ".jpg");
  assertEquals(body.data.images[0].startsWith("/api/"), false);
});

Deno.test("uploaded images are served publicly with the sniffed type", async () => {
  const id = await createProduct("Served");
  const uploaded = await (await uploadImages(id, [PNG_BYTES])).json();
  const url: string = uploaded.data.images[0];

  const served = await app.request(`http://localhost${url}`);
  assertEquals(served.status, 200);
  assertEquals(served.headers.get("content-type"), "image/png");
  assertStringIncludes(served.headers.get("cache-control") ?? "", "immutable");
  const bytes = new Uint8Array(await served.arrayBuffer());
  assertEquals(bytes.length, PNG_BYTES.length);
});

Deno.test("showcase and product view render the first image as cover", async () => {
  const id = await createProduct("Covered");
  await (await uploadImages(id, [PNG_BYTES, PNG_BYTES])).body?.cancel();

  const showcase = await app.request("http://localhost/products");
  assertStringIncludes(await showcase.text(), `/uploads/products/${id}/`);

  const view = await app.request(`http://localhost/products/${await slugOf(id)}`);
  const html = await view.text();
  assertStringIncludes(html, "data-carousel");
  assertStringIncludes(html, 'property="og:image"');
});

Deno.test("deleting one image removes its blob and list entry", async () => {
  const id = await createProduct("Trimmed");
  const uploaded = await (await uploadImages(id, [PNG_BYTES, JPEG_BYTES])).json();
  const first: string = uploaded.data.images[0];
  const imageId = first.split("/").pop() ?? "";

  const res = await app.request(`http://localhost/api/products/${id}/images/${imageId}`, {
    method: "DELETE",
    headers: { cookie: ADMIN },
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.images.length, 1);

  const gone = await app.request(`http://localhost${first}`);
  assertEquals(gone.status, 404);
  await gone.body?.cancel();
});

Deno.test("deleting a product removes it and its image blobs", async () => {
  const id = await createProduct("Doomed");
  const uploaded = await (await uploadImages(id, [PNG_BYTES])).json();
  const url: string = uploaded.data.images[0];

  const res = await app.request(`http://localhost/api/products/${id}`, {
    method: "DELETE",
    headers: { cookie: ADMIN },
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.deleted, true);

  const product = await app.request(`http://localhost/api/products/${id}`);
  assertEquals(product.status, 404);
  await product.body?.cancel();

  const image = await app.request(`http://localhost${url}`);
  assertEquals(image.status, 404);
  await image.body?.cancel();

  const again = await app.request(`http://localhost/api/products/${id}`, {
    method: "DELETE",
    headers: { cookie: ADMIN },
  });
  assertEquals(again.status, 404);
  await again.body?.cancel();
});

Deno.test("upload rejects non-image content with a field error", async () => {
  const id = await createProduct("Guarded");
  const res = await uploadImages(id, [new TextEncoder().encode("#!/bin/sh evil")]);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertEquals(typeof body.error.details.fields.image, "string");
});

Deno.test("upload to an unknown product returns 404; hostile image ids are rejected", async () => {
  const missing = await uploadImages("nope", [PNG_BYTES]);
  assertEquals(missing.status, 404);
  await missing.body?.cancel();

  const traversal = await app.request(
    "http://localhost/uploads/products/x/..%2F..%2Fsecret.png",
  );
  assertEquals([400, 404].includes(traversal.status), true);
  await traversal.body?.cancel();
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

    await storage.delete("test/big");
    assertEquals(await storage.get("test/big"), null);
  } finally {
    kv.close();
  }
});
