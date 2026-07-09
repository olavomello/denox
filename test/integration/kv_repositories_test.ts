/**
 * Integration tests — Deno KV repositories against an in-memory KV database.
 * Covers CRUD paths, the atomic e-mail uniqueness index (sequential and
 * concurrent) and contact persistence.
 */

import { assertEquals, assertRejects } from "@std/assert";
import { KvUserRepository } from "@/api/users/user.repository.kv.ts";
import { KvProductRepository } from "@/api/products/product.repository.kv.ts";
import { KvContactRepository } from "@/api/contact/contact.repository.kv.ts";
import { ConflictException } from "@/shared/exceptions/app_exception.ts";

/** Runs a test body against a fresh in-memory KV, always closing it. */
async function withKv(run: (kv: Deno.Kv) => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  try {
    await run(kv);
  } finally {
    kv.close();
  }
}

Deno.test("KvUserRepository creates and finds users by id and email", async () => {
  await withKv(async (kv) => {
    const repository = new KvUserRepository(kv);
    const created = await repository.create({ name: "Ada", email: "ada@example.com" });

    assertEquals((await repository.findById(created.id))?.email, "ada@example.com");
    assertEquals((await repository.findByEmail("ada@example.com"))?.id, created.id);
    assertEquals((await repository.findAll()).length, 1);
    assertEquals(await repository.findById("missing"), null);
    assertEquals(await repository.findByEmail("missing@example.com"), null);
  });
});

Deno.test("KvUserRepository rejects a duplicate email sequentially", async () => {
  await withKv(async (kv) => {
    const repository = new KvUserRepository(kv);
    await repository.create({ name: "Ada", email: "dup@example.com" });
    await assertRejects(
      () => repository.create({ name: "Clone", email: "dup@example.com" }),
      ConflictException,
    );
  });
});

Deno.test("KvUserRepository email uniqueness holds under concurrency", async () => {
  await withKv(async (kv) => {
    const repository = new KvUserRepository(kv);
    const results = await Promise.allSettled([
      repository.create({ name: "A", email: "race@example.com" }),
      repository.create({ name: "B", email: "race@example.com" }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assertEquals(fulfilled.length, 1);
    assertEquals(rejected.length, 1);
    assertEquals((await repository.findAll()).length, 1);
  });
});

Deno.test("KvProductRepository stores and lists products", async () => {
  await withKv(async (kv) => {
    const repository = new KvProductRepository(kv);
    const created = await repository.create({ name: "Sticker", price: 9.9 });
    assertEquals((await repository.findById(created.id))?.price, 9.9);
    assertEquals((await repository.findAll()).length, 1);
  });
});

Deno.test("KvContactRepository persists contact messages", async () => {
  await withKv(async (kv) => {
    const repository = new KvContactRepository(kv);
    await repository.create({ name: "Ada", email: "ada@example.com", message: "Hello" });
    const all = await repository.findAll();
    assertEquals(all.length, 1);
    assertEquals(all[0]?.message, "Hello");
  });
});

Deno.test("KvProductRepository hydrates records written before the images revision", async () => {
  await withKv(async (kv) => {
    // Simulates a production record from the single-image era: no `images`,
    // legacy `imageUrl` pointing at the removed /api serving route.
    await kv.set(["products", "legacy-1"], {
      id: "legacy-1",
      name: "Legacy Product",
      price: 10,
      imageUrl: "/api/products/legacy-1/image",
      createdAt: "2026-07-08T00:00:00.000Z",
    });

    const repository = new KvProductRepository(kv);

    const byId = await repository.findById("legacy-1");
    assertEquals(byId?.images, []);
    assertEquals("imageUrl" in (byId ?? {}), false);

    const all = await repository.findAll();
    assertEquals(all[0]?.images, []);

    assertEquals(await repository.delete("legacy-1"), true);
  });
});
