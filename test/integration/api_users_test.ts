/**
 * Integration tests — users API through the full middleware pipeline.
 * Exercises the real app via `app.request()` (no socket needed).
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";
import { validCreateUserPayload } from "../fixtures/users.ts";

Deno.test("GET /api/users returns the success envelope", async () => {
  const res = await app.request("/api/users");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(Array.isArray(body.data), true);
});

Deno.test("POST /api/users creates a user and returns 201", async () => {
  const res = await app.request("/api/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validCreateUserPayload),
  });
  assertEquals(res.status, 201);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(body.data.email, validCreateUserPayload.email);
  assertEquals(typeof body.data.id, "string");
});

Deno.test("POST /api/users twice with the same email returns 409", async () => {
  const payload = { name: "Dup", email: "dup@example.com" };
  const post = () =>
    app.request("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  const first = await post();
  assertEquals(first.status, 201);
  await first.body?.cancel();

  const second = await post();
  assertEquals(second.status, 409);
  const body = await second.json();
  assertEquals(body.error.code, "CONFLICT");
});

Deno.test("POST /api/users with an invalid payload returns 400 with field details", async () => {
  const res = await app.request("/api/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "A", email: "nope" }),
  });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertStringIncludes(JSON.stringify(body.error.details.fields), "email");
});

Deno.test("POST /api/users with malformed JSON returns 400", async () => {
  const res = await app.request("/api/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not json",
  });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error.code, "BAD_REQUEST");
});

Deno.test("GET /api/users/:id returns 404 for unknown ids", async () => {
  const res = await app.request("/api/users/does-not-exist");
  assertEquals(res.status, 404);
  const body = await res.json();
  assertEquals(body.error.code, "NOT_FOUND");
});
