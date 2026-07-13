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
    const created = await repository.create({
      name: "Ada",
      email: "ada@example.com",
      passwordHash: "pbkdf2:sha256:1000:c2FsdA==:aGFzaA==",
      role: "user" as const,
    });

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
    await repository.create({
      name: "Ada",
      email: "dup@example.com",
      passwordHash: "pbkdf2:sha256:1000:c2FsdA==:aGFzaA==",
      role: "user" as const,
    });
    await assertRejects(
      () =>
        repository.create({
          name: "Clone",
          email: "dup@example.com",
          passwordHash: "pbkdf2:sha256:1000:c2FsdA==:aGFzaA==",
          role: "user" as const,
        }),
      ConflictException,
    );
  });
});

Deno.test("KvUserRepository email uniqueness holds under concurrency", async () => {
  await withKv(async (kv) => {
    const repository = new KvUserRepository(kv);
    const results = await Promise.allSettled([
      repository.create({
        name: "A",
        email: "race@example.com",
        passwordHash: "pbkdf2:sha256:1000:c2FsdA==:aGFzaA==",
        role: "user" as const,
      }),
      repository.create({
        name: "B",
        email: "race@example.com",
        passwordHash: "pbkdf2:sha256:1000:c2FsdA==:aGFzaA==",
        role: "user" as const,
      }),
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
    // Slug revision: legacy records get a slug materialized on first read,
    // persisted atomically with its uniqueness index.
    assertEquals(byId?.slug, "legacy-product");
    const bySlug = await repository.findBySlug("legacy-product");
    assertEquals(bySlug?.id, "legacy-1");

    const all = await repository.findAll();
    assertEquals(all[0]?.images, []);

    assertEquals(await repository.delete("legacy-1"), true);
  });
});

// ---------------------------------------------------------------------------
// Payments (FR-8: KV persistence — record + indexes survive independent of
// process memory; restart semantics are provided by Deno KV itself).
// ---------------------------------------------------------------------------

Deno.test("KvPaymentRepository persists payments with provider and user indexes", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const { KvPaymentRepository } = await import("@/api/payments/payment.repository.kv.ts");
    const repository = new KvPaymentRepository(kv);
    const payment = await repository.create({
      provider: "stripe",
      providerId: "cs_kv_1",
      status: "pending",
      amountCents: 990,
      currency: "usd",
      userId: "user-1",
      productSnapshot: { id: "p1", name: "Snap", price: 9.9 },
    });

    // Fresh repository instance over the same KV = same data (no memory state).
    const rehydrated = new KvPaymentRepository(kv);
    assertEquals((await rehydrated.findById(payment.id))?.amountCents, 990);
    assertEquals((await rehydrated.findByProviderId("cs_kv_1"))?.id, payment.id);
    assertEquals(
      (await kv.get(["payments_by_user", "user-1", payment.id])).value,
      payment.id,
    );

    const paid = await rehydrated.updateStatus(payment.id, "paid", "2026-07-11T00:00:00.000Z");
    assertEquals(paid.status, "paid");
    assertEquals((await rehydrated.findById(payment.id))?.paidAt, "2026-07-11T00:00:00.000Z");
    assertEquals((await rehydrated.findById(payment.id))?.productSnapshot?.name, "Snap");
  } finally {
    kv.close();
  }
});

Deno.test("KvEventLedger marks event ids exactly once", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const { KvEventLedger } = await import("@/api/payments/payment.repository.kv.ts");
    const ledger = new KvEventLedger(kv);
    assertEquals(await ledger.seen("evt_a"), false);
    assertEquals(await ledger.seen("evt_a"), true);
    assertEquals(await ledger.seen("evt_b"), false);
  } finally {
    kv.close();
  }
});

Deno.test("KvProductRepository enforces sparse SKU uniqueness atomically", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const { KvProductRepository } = await import("@/api/products/product.repository.kv.ts");
    const repository = new KvProductRepository(kv);
    const a = await repository.create({ name: "Kv Sku A", price: 1, sku: "KV-1" });
    await assertRejectsConflict(() =>
      repository.create({ name: "Kv Sku B", price: 1, sku: "KV-1" })
    );

    // Change releases; clear frees; delete releases too.
    await repository.update(a.id, { sku: "KV-2" });
    const b = await repository.create({ name: "Kv Sku B", price: 1, sku: "KV-1" });
    await repository.update(b.id, { sku: "" });
    assertEquals((await repository.findById(b.id))?.sku, undefined);
    await repository.delete(a.id);
    const c = await repository.create({ name: "Kv Sku C", price: 1, sku: "KV-2" });
    assertEquals(c.sku, "KV-2");
  } finally {
    kv.close();
  }
});

/** Asserts the promise rejects with a 409 ConflictException. */
async function assertRejectsConflict(run: () => Promise<unknown>): Promise<void> {
  let status = 0;
  try {
    await run();
  } catch (error) {
    status = (error as { status?: number }).status ?? 0;
  }
  assertEquals(status, 409);
}
