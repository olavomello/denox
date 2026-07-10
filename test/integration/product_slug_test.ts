/**
 * Integration tests — friendly product URLs and dynamic sitemap.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";

/** Creates a product and returns {id, slug}. */
async function createProduct(name: string): Promise<{ id: string; slug: string }> {
  const res = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, price: 10 }),
  });
  const body = await res.json();
  return { id: body.data.id, slug: body.data.slug };
}

Deno.test("creation derives a friendly slug and suffixes collisions", async () => {
  const first = await createProduct("Boné DenoX Édition!");
  assertEquals(first.slug, "bone-denox-edition");
  const second = await createProduct("Boné DenoX Édition!");
  assertEquals(second.slug, "bone-denox-edition-2");
});

Deno.test("concurrent same-name creations get distinct slugs", async () => {
  const results = await Promise.all(
    Array.from({ length: 4 }, () => createProduct("Racy Product")),
  );
  const slugs = new Set(results.map((r) => r.slug));
  assertEquals(slugs.size, 4);
});

Deno.test("product page is served by slug, and the UUID URL 301s to it", async () => {
  const { id, slug } = await createProduct("Slugged Tee");

  const bySlug = await app.request(`http://localhost/products/${slug}`);
  assertEquals(bySlug.status, 200);
  assertStringIncludes(await bySlug.text(), "Slugged Tee");

  const byId = await app.request(`http://localhost/products/${id}`);
  assertEquals(byId.status, 301);
  assertEquals(byId.headers.get("location"), `/products/${slug}`);
  await byId.body?.cancel();
});

Deno.test("PATCH changes the slug; the stale slug 301s; duplicates conflict", async () => {
  const { id, slug } = await createProduct("Renamable");
  const other = await createProduct("Occupied Name");

  const res = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "renamed-by-hand" }),
  });
  assertEquals(res.status, 200);
  assertEquals((await res.json()).data.slug, "renamed-by-hand");

  const fresh = await app.request("http://localhost/products/renamed-by-hand");
  assertEquals(fresh.status, 200);
  await fresh.body?.cancel();

  const stale = await app.request(`http://localhost/products/${slug}`);
  assertEquals(stale.status, 301);
  assertEquals(stale.headers.get("location"), "/products/renamed-by-hand");
  await stale.body?.cancel();

  const conflict = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: other.slug }),
  });
  assertEquals(conflict.status, 409);
  await conflict.body?.cancel();

  const invalid = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "Not Valid!" }),
  });
  assertEquals(invalid.status, 400);
  const body = await invalid.json();
  assertEquals(typeof body.error.details.fields.slug, "string");
});

Deno.test("renaming the product does NOT change its slug (stable URLs)", async () => {
  const { id, slug } = await createProduct("Original Name");
  const res = await app.request(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Completely Different" }),
  });
  assertEquals((await res.json()).data.slug, slug);
});

Deno.test("sitemap lists product slug URLs with their lastmod", async () => {
  const { slug } = await createProduct("Sitemap Star");
  const res = await app.request("http://localhost/sitemap.xml");
  assertEquals(res.status, 200);
  const xml = await res.text();
  assertStringIncludes(xml, `/products/${slug}</loc>`);
  assertStringIncludes(xml, "<lastmod>");
  assertEquals(xml.includes("/products/:slug"), false);
});
