/**
 * Integration tests — product SKU: sparse uniqueness, lifecycle through
 * PATCH, snapshot propagation and page display.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";
import {
  InMemoryEventLedger,
  InMemoryPaymentRepository,
} from "@/api/payments/payment.repository.ts";
import { PaymentService } from "@/api/payments/payment.service.ts";
import { MockProvider } from "@/api/payments/provider.ts";
import { productService } from "@/api/products/product.routes.ts";
import { adminCookie, userCookie } from "../helpers/auth.ts";

Deno.env.set("AUTH_PBKDF2_ITERATIONS", "1000");
const ADMIN = await adminCookie();

let n = 0;
/** Creates a product (optionally with a sku); returns its data. */
async function createProduct(sku?: string): Promise<Record<string, string>> {
  const res = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ADMIN },
    body: JSON.stringify({
      name: `Skued ${++n}`,
      price: 10,
      ...(sku !== undefined ? { sku } : {}),
    }),
  });
  return { status: String(res.status), ...(await res.json()).data };
}

/** PATCHes a product's sku; returns the response. */
async function patchSku(id: string, sku: string): Promise<Response> {
  return await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: ADMIN },
    body: JSON.stringify({ sku }),
  });
}

Deno.test("create: valid sku persists; duplicate 409; invalid format 400", async () => {
  const first = await createProduct("DNX-TEE.001");
  assertEquals(first.sku, "DNX-TEE.001");

  const dup = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ADMIN },
    body: JSON.stringify({ name: "Clone", price: 1, sku: "DNX-TEE.001" }),
  });
  assertEquals(dup.status, 409);
  await dup.body?.cancel();

  const bad = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ADMIN },
    body: JSON.stringify({ name: "Bad", price: 1, sku: "no spaces!" }),
  });
  assertEquals(bad.status, 400);
  assertEquals(typeof (await bad.json()).error.details.fields.sku, "string");
});

Deno.test("PATCH: set, conflict, change releases the old sku, clear frees it", async () => {
  const a = await createProduct();
  const b = await createProduct();

  assertEquals((await (await patchSku(a.id!, "SKU-A")).json()).data.sku, "SKU-A");
  const conflict = await patchSku(b.id!, "SKU-A");
  assertEquals(conflict.status, 409);
  await conflict.body?.cancel();

  // Change: SKU-A is released and immediately claimable by b.
  await (await patchSku(a.id!, "SKU-A2")).body?.cancel();
  assertEquals((await patchSku(b.id!, "SKU-A")).status, 200);

  // Clear: empty string removes the field and frees the index.
  const cleared = await (await patchSku(b.id!, "")).json();
  assertEquals(cleared.data.sku, undefined);
  assertEquals((await patchSku(a.id!, "SKU-A")).status, 200);
});

Deno.test("snapshot carries the sku when present, omits it when not", async () => {
  const service = new PaymentService(
    new InMemoryPaymentRepository(),
    new InMemoryEventLedger(),
    new MockProvider(),
    productService,
  );
  const { userId } = await userCookie();
  const withSku = await createProduct("SNAP-42");
  const without = await createProduct();

  const snap = await service.checkout(userId, { kind: "product", productId: withSku.id! });
  const paid = await service.getById(snap.paymentId);
  assertEquals(paid?.productSnapshot?.sku, "SNAP-42");

  const plain = await service.checkout(userId, { kind: "product", productId: without.id! });
  const record = await service.getById(plain.paymentId);
  assertEquals(record?.productSnapshot?.sku, undefined);
  assertEquals("sku" in (record?.productSnapshot ?? {}), false);
});

Deno.test("product page shows the SKU line escaped, only when present", async () => {
  const withSku = await createProduct("PAGE-SKU-9");
  const page = await app.request(`http://localhost/products/${withSku.slug}`);
  assertStringIncludes(await page.text(), "SKU: PAGE-SKU-9");

  const without = await createProduct();
  const clean = await app.request(`http://localhost/products/${without.slug}`);
  assertEquals((await clean.text()).includes("product-sku"), false);
});
