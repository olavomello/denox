/**
 * Integration tests — file based pages rendered through layouts.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";

Deno.test("GET / renders the home page inside the default layout", async () => {
  const res = await app.request("/");
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("content-type") ?? "", "text/html");
  const html = await res.text();
  assertStringIncludes(html, "<!DOCTYPE html>");
  assertStringIncludes(html, "Hello, world!");
});

Deno.test("GET /?name=<script> escapes untrusted input", async () => {
  const res = await app.request("/?name=%3Cscript%3E");
  const html = await res.text();
  assertStringIncludes(html, "&lt;script&gt;");
  assertEquals(html.includes("<script>"), false);
});

Deno.test("generated routes serve every page", async () => {
  for (const path of ["/about", "/users", "/products"]) {
    const res = await app.request(path);
    assertEquals(res.status, 200, `expected 200 for ${path}`);
    await res.body?.cancel();
  }
});
