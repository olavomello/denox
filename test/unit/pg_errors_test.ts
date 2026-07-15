/**
 * Unit tests — Postgres error interpretation (SQLSTATE-based, no DB).
 */

import { assertEquals } from "@std/assert";
import { isUniqueViolation } from "@/shared/pg_errors.ts";

/** Builds a PostgresError-like object. */
function pgError(code: string, constraint?: string): unknown {
  return { fields: { code, ...(constraint ? { constraint } : {}) } };
}

Deno.test("isUniqueViolation keys on SQLSTATE 23505, not the message", () => {
  assertEquals(isUniqueViolation(pgError("23505")), true);
  assertEquals(isUniqueViolation(pgError("23505", "products_sku_key")), true);
  // Wrong code / not a pg error / plain Error → false.
  assertEquals(isUniqueViolation(pgError("23503")), false); // foreign_key_violation
  assertEquals(isUniqueViolation(new Error("products_sku_key")), false);
  assertEquals(isUniqueViolation("just a string"), false);
});

Deno.test("isUniqueViolation can require a specific constraint", () => {
  assertEquals(isUniqueViolation(pgError("23505", "users_email_key"), "users_email_key"), true);
  assertEquals(isUniqueViolation(pgError("23505", "products_sku_key"), "users_email_key"), false);
  // 23505 without the named constraint → not a match for that constraint.
  assertEquals(isUniqueViolation(pgError("23505"), "users_email_key"), false);
});
