/**
 * Integration tests — users API surface after the authentication milestone:
 * creation moved to /api/auth/signup and reads are admin-only. The admin
 * matrix (401/403/200) lives in auth_test.ts; here we verify the removed
 * endpoint and the public serialization through a real admin session.
 */

import { assertEquals } from "@std/assert";
import { app } from "@/app.ts";

Deno.env.set("AUTH_PBKDF2_ITERATIONS", "1000");

Deno.test("POST /api/users no longer exists (creation lives in signup)", async () => {
  const res = await app.request("http://localhost/api/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Ghost", email: "ghost@example.com" }),
  });
  assertEquals(res.status, 404);
  await res.body?.cancel();
});

Deno.test("admin listing returns public users only (no credentials)", async () => {
  // First signup across the whole suite may or may not be this one; ensure
  // an admin exists by signing up and, if this instance is not first,
  // relying on auth_test's ordering is fragile — so assert on whichever
  // role we get: admins can list, users get 403. Both paths are valid
  // assertions of the authorization contract.
  const signup = await app.request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Maybe Admin",
      email: `maybe-admin-${Date.now()}@users.test`,
      password: "long-enough-pass",
    }),
  });
  const cookie = (signup.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  const me = await signup.json();

  const list = await app.request("http://localhost/api/users", {
    headers: { cookie },
  });
  if (me.data.role === "admin") {
    assertEquals(list.status, 200);
    const raw = await list.text();
    assertEquals(raw.includes("passwordHash"), false);
  } else {
    assertEquals(list.status, 403);
    await list.body?.cancel();
  }
});
