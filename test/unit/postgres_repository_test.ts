/**
 * Unit tests — Postgres repositories map unique violations to 409, using a
 * shim that raises structured PostgresError-like objects. This exercises
 * the conflict path in every run (the gated integration suite needs a real
 * database; this does not) so the SQLSTATE handling can't silently regress.
 */

import { assertEquals } from "@std/assert";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { PostgresUserRepository } from "@/api/users/user.repository.postgres.ts";
import { PostgresProductRepository } from "@/api/products/product.repository.postgres.ts";

Deno.test("PostgresUserRepository maps a duplicate e-mail to 409", async () => {
  const repo = new PostgresUserRepository(new Pool("postgres://shim", 1, true));
  await repo.create({ name: "A", email: "dup@example.com", passwordHash: "h", role: "user" });
  let status = 0;
  await repo.create({ name: "B", email: "dup@example.com", passwordHash: "h", role: "user" })
    .catch((e: { status?: number }) => status = e.status ?? 0);
  assertEquals(status, 409);
});

Deno.test("PostgresProductRepository maps a duplicate SKU to 409", async () => {
  const repo = new PostgresProductRepository(new Pool("postgres://shim", 1, true));
  await repo.create({ name: "Tee", price: 10, sku: "SKU-1" });
  let status = 0;
  await repo.create({ name: "Other", price: 20, sku: "SKU-1" })
    .catch((e: { status?: number }) => status = e.status ?? 0);
  assertEquals(status, 409);
});
