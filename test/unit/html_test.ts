/**
 * Unit tests — HTML escaping (src/shared/html.ts).
 */

import { assertEquals } from "@std/assert";
import { escapeHtml } from "@/shared/html.ts";

Deno.test("escapeHtml neutralizes markup and quotes", () => {
  assertEquals(
    escapeHtml(`<script>alert("x&y")</script>'`),
    "&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;&#39;",
  );
});

Deno.test("escapeHtml leaves safe text untouched", () => {
  assertEquals(escapeHtml("plain text 123"), "plain text 123");
});
