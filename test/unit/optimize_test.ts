/**
 * Unit tests — HTML output optimizations (src/frontend/optimize.ts).
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { lazifyImages } from "@/frontend/optimize.ts";

Deno.test("lazifyImages adds lazy loading to plain images", () => {
  const out = lazifyImages('<p><img src="/a.png" alt="a"></p>');
  assertStringIncludes(out, '<img loading="lazy" decoding="async" src="/a.png" alt="a">');
});

Deno.test("lazifyImages respects an explicit loading attribute", () => {
  const html = '<img loading="eager" src="/hero.png">';
  assertEquals(lazifyImages(html), html);
});

Deno.test("lazifyImages handles self-closing and multiple images", () => {
  const out = lazifyImages('<img src="/a.png"/><img src="/b.png">');
  assertEquals((out.match(/loading="lazy"/g) ?? []).length, 2);
});
