/**
 * Unit tests — password hashing (src/shared/password.ts).
 * AUTH_PBKDF2_ITERATIONS is lowered for test speed; parameters live inside
 * the stored hash, so verification remains representative.
 */

import { assertEquals, assertNotEquals, assertStringIncludes } from "@std/assert";
import { hashPassword, verifyPassword } from "@/shared/password.ts";

Deno.env.set("AUTH_PBKDF2_ITERATIONS", "1000");

Deno.test("hashPassword produces self-describing hashes with unique salts", async () => {
  const a = await hashPassword("correct horse battery staple");
  const b = await hashPassword("correct horse battery staple");
  assertStringIncludes(a, "pbkdf2:sha256:1000:");
  assertNotEquals(a, b); // per-user salt
});

Deno.test("verifyPassword accepts the right password and rejects wrong ones", async () => {
  const stored = await hashPassword("s3cret-value");
  assertEquals(await verifyPassword("s3cret-value", stored), true);
  assertEquals(await verifyPassword("s3cret-valuE", stored), false);
  assertEquals(await verifyPassword("", stored), false);
});

Deno.test("verifyPassword rejects tampered or malformed stored hashes", async () => {
  const stored = await hashPassword("victim");
  const tampered = stored.slice(0, -4) + "AAAA";
  assertEquals(await verifyPassword("victim", tampered), false);
  assertEquals(await verifyPassword("victim", "bcrypt:whatever"), false);
  assertEquals(await verifyPassword("victim", "pbkdf2:sha256:zero:!!:!!"), false);
});
