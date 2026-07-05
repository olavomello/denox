/**
 * Integration tests — health endpoints and error envelope for unmatched
 * API routes.
 */

import { assertEquals } from "@std/assert";
import { app } from "@/app.ts";

Deno.test("GET /api/ping returns pong", async () => {
  const res = await app.request("/api/ping");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.message, "pong");
});

Deno.test("GET /api/health reports status and uptime", async () => {
  const res = await app.request("/api/health");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.status, "healthy");
  assertEquals(typeof body.data.uptimeSeconds, "number");
});

Deno.test("unknown routes return the standard 404 envelope", async () => {
  const res = await app.request("/api/nope");
  assertEquals(res.status, 404);
  const body = await res.json();
  assertEquals(body.success, false);
  assertEquals(body.error.code, "NOT_FOUND");
});

Deno.test("responses carry security headers", async () => {
  const res = await app.request("/api/ping");
  assertEquals(res.headers.get("x-frame-options"), "DENY");
  assertEquals(typeof res.headers.get("content-security-policy"), "string");
});
