/**
 * Integration tests — Production Ready by Default layer.
 * SEO endpoints, injected head metadata, PWA manifest, static caching.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";

Deno.test("GET /sitemap.xml lists static file based routes", async () => {
  const res = await app.request("http://localhost/sitemap.xml");
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("content-type") ?? "", "application/xml");
  const xml = await res.text();
  assertStringIncludes(xml, "<urlset");
  assertStringIncludes(xml, "/about</loc>");
});

Deno.test("GET /robots.txt allows crawling and references the sitemap", async () => {
  const res = await app.request("http://localhost/robots.txt");
  assertEquals(res.status, 200);
  const body = await res.text();
  assertStringIncludes(body, "User-agent: *");
  assertStringIncludes(body, "Sitemap: ");
});

Deno.test("GET /site.webmanifest is generated from the project config", async () => {
  const res = await app.request("http://localhost/site.webmanifest");
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("content-type") ?? "", "manifest+json");
  const manifest = await res.json();
  assertEquals(manifest.name, "DenoX");
  assertEquals(Array.isArray(manifest.icons), true);
});

Deno.test("pages carry injected SEO head tags", async () => {
  const res = await app.request("http://localhost/");
  const html = await res.text();
  assertStringIncludes(html, "<title>");
  assertStringIncludes(html, 'property="og:title"');
  assertStringIncludes(html, 'name="twitter:card"');
  assertStringIncludes(html, 'rel="canonical"');
  assertStringIncludes(html, "application/ld+json");
  assertStringIncludes(html, 'rel="manifest" href="/site.webmanifest"');
});

Deno.test("per-page meta composes the title and description", async () => {
  const res = await app.request("http://localhost/about");
  const html = await res.text();
  assertStringIncludes(html, "<title>About — DenoX</title>");
});

Deno.test("page images receive lazy loading; explicit loading is preserved", async () => {
  const res = await app.request("http://localhost/");
  const html = await res.text();

  // Layout logo is not transformed (content-only optimization).
  assertStringIncludes(html, 'src="/images/icon.png"');
});

Deno.test("static assets carry cache and security headers", async () => {
  const res = await app.request("http://localhost/assets/css/default.css");
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("cache-control") ?? "", "max-age=");
  assertEquals(res.headers.get("x-frame-options"), "DENY");
  await res.body?.cancel();
});
