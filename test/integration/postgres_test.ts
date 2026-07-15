/**
 * Integration tests — the Postgres repositories against a REAL database.
 *
 * Gated on TEST_DATABASE_URL: without it the whole file self-skips, so the
 * suite stays green without a Postgres server. CI provides the URL via a
 * Postgres service container.
 */

import { assertEquals } from "@std/assert";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { migrate } from "@/shared/migrate.ts";
import { PostgresUserRepository } from "@/api/users/user.repository.postgres.ts";
import { PostgresProductRepository } from "@/api/products/product.repository.postgres.ts";
import { PostgresPaymentRepository } from "@/api/payments/payment.repository.postgres.ts";

const url = Deno.env.get("TEST_DATABASE_URL");
const gated = url === undefined || url === "";

/** Fresh pool against a clean, migrated schema. */
async function freshPool(): Promise<Pool> {
  const pool = new Pool(url as string, 4, true);
  const client = await pool.connect();
  try {
    await client.queryObject(`
      DROP TABLE IF EXISTS _denox_payment_events, _denox_migrations,
        contact_messages, payments, product_slugs, products, users CASCADE
    `);
  } finally {
    client.release();
  }
  await migrate(pool, "migrations");
  return pool;
}

Deno.test({
  name: "migrate applies the schema and is idempotent",
  ignore: gated,
  fn: async () => {
    const pool = await freshPool();
    try {
      const second = await migrate(pool, "migrations");
      assertEquals(second.applied, []);
      assertEquals(second.skipped.includes("0001_init.sql"), true);
    } finally {
      await pool.end();
    }
  },
});

Deno.test({
  name: "PostgresUserRepository: create, read, unique e-mail (409)",
  ignore: gated,
  fn: async () => {
    const pool = await freshPool();
    try {
      const repo = new PostgresUserRepository(pool);
      const user = await repo.create({
        name: "Grace",
        email: "grace@example.com",
        passwordHash: "hash",
        role: "admin",
      });
      assertEquals((await repo.findByEmail("grace@example.com"))?.id, user.id);
      let conflict = 0;
      await repo.create({
        name: "Dup",
        email: "grace@example.com",
        passwordHash: "h",
        role: "user",
      })
        .catch((e: { status?: number }) => conflict = e.status ?? 0);
      assertEquals(conflict, 409);
    } finally {
      await pool.end();
    }
  },
});

Deno.test({
  name: "PostgresProductRepository: slug dedupe, sku 409, stale slug, images",
  ignore: gated,
  fn: async () => {
    const pool = await freshPool();
    try {
      const repo = new PostgresProductRepository(pool);
      const a = await repo.create({ name: "DenoX Tee", price: 49.9, sku: "TEE-1" });
      const b = await repo.create({ name: "DenoX Tee", price: 49.9 });
      assertEquals(a.slug, "denox-tee");
      assertEquals(b.slug !== a.slug, true);
      let conflict = 0;
      await repo.create({ name: "Clone", price: 1, sku: "TEE-1" })
        .catch((e: { status?: number }) => conflict = e.status ?? 0);
      assertEquals(conflict, 409);
      await repo.update(a.id, { name: "Renamed" });
      assertEquals((await repo.findBySlug("denox-tee"))?.id, a.id);
      const withImg = await repo.update(a.id, {
        images: [{ url: "/x.png", width: 10, height: 20, alt: "x" }],
      });
      assertEquals(withImg?.images[0]?.width, 10);
    } finally {
      await pool.end();
    }
  },
});

Deno.test({
  name: "PostgresPaymentRepository: transitions and refundedCents persist",
  ignore: gated,
  fn: async () => {
    const pool = await freshPool();
    try {
      const repo = new PostgresPaymentRepository(pool);
      const payment = await repo.create({
        provider: "stripe",
        providerId: "cs_1",
        status: "pending",
        amountCents: 1000,
        currency: "usd",
        userId: crypto.randomUUID(),
        productSnapshot: { id: "p1", name: "Tee", price: 10 },
      });
      await repo.applyTransition(payment.id, {
        status: "paid",
        source: "webhook",
        eventId: "evt_1",
      });
      await repo.applyTransition(payment.id, {
        status: "partially_refunded",
        source: "admin",
        actorId: "admin-1",
        refundedCents: 400,
      });
      const reloaded = await repo.findById(payment.id);
      assertEquals(reloaded?.refundedCents, 400);
      assertEquals(reloaded?.transitions.length, 2);
      assertEquals(reloaded?.transitions[1]?.actorId, "admin-1");
      assertEquals(reloaded?.productSnapshot?.name, "Tee");
      assertEquals(reloaded?.paidAt !== undefined, true);
    } finally {
      await pool.end();
    }
  },
});
