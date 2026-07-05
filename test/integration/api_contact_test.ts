/**
 * Integration tests — contact form interaction (API, page markup, no-JS PRG).
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";

Deno.test("POST /api/contact stores a message and returns 201", async () => {
  const res = await app.request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Ada", email: "ada@example.com", message: "Hello" }),
  });
  assertEquals(res.status, 201);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(body.data.email, "ada@example.com");
  assertEquals(typeof body.data.id, "string");
});

Deno.test("POST /api/contact returns per-field validation details", async () => {
  const res = await app.request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "A", email: "nope", message: "" }),
  });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertEquals(typeof body.error.details.fields.email, "string");
});

Deno.test("GET /contact ships the data-api form and the helper script", async () => {
  const res = await app.request("http://localhost/contact");
  const html = await res.text();
  assertStringIncludes(html, 'data-api="/api/contact"');
  assertStringIncludes(html, 'data-error-for="email"');
  assertStringIncludes(html, "/assets/js/denox-form.js");
  assertStringIncludes(html, '<template id="contact-ok">');
});

Deno.test("no-JS POST /contact follows Post-Redirect-Get on success", async () => {
  const form = new URLSearchParams({
    name: "Ada",
    email: "ada@example.com",
    message: "Hello from a form",
  });
  const res = await app.request("http://localhost/contact", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "http://localhost",
    },
    body: form.toString(),
  });
  assertEquals(res.status, 303);
  assertEquals(res.headers.get("location"), "/contact?sent=1");
});

Deno.test("no-JS POST /contact redirects with an error flag when invalid", async () => {
  const form = new URLSearchParams({ name: "A", email: "nope", message: "" });
  const res = await app.request("http://localhost/contact", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "http://localhost",
    },
    body: form.toString(),
  });
  assertEquals(res.status, 303);
  assertEquals(res.headers.get("location"), "/contact?error=1");
});

Deno.test("GET /contact?sent=1 renders the confirmation note", async () => {
  const res = await app.request("http://localhost/contact?sent=1");
  const html = await res.text();
  assertStringIncludes(html, "We received your message");
});
