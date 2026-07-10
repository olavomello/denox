/**
 * Unit tests — slug helpers (src/shared/slug.ts).
 */

import { assertEquals } from "@std/assert";
import { SLUG_MAX_LENGTH, slugCandidate, slugify } from "@/shared/slug.ts";

Deno.test("slugify lowercases, strips accents and collapses separators", () => {
  assertEquals(slugify("Camiseta DenoX Preta!"), "camiseta-denox-preta");
  assertEquals(slugify("Café com Açúcar"), "cafe-com-acucar");
  assertEquals(slugify("  --Hello__World--  "), "hello-world");
  assertEquals(slugify("100% Deno"), "100-deno");
});

Deno.test("slugify enforces the length ceiling without trailing hyphens", () => {
  const long = slugify("a".repeat(120));
  assertEquals(long.length, SLUG_MAX_LENGTH);
  const trimmed = slugify("a".repeat(79) + " b");
  assertEquals(trimmed.endsWith("-"), false);
});

Deno.test("slugify falls back when nothing slug-worthy remains", () => {
  assertEquals(slugify("!!!", "f4llb4ck"), "f4llb4ck");
  assertEquals(slugify("", "x"), "x");
});

Deno.test("slugCandidate suffixes collisions deterministically within the ceiling", () => {
  assertEquals(slugCandidate("tee", 1), "tee");
  assertEquals(slugCandidate("tee", 2), "tee-2");
  assertEquals(slugCandidate("a".repeat(80), 12).length <= 80, true);
  assertEquals(slugCandidate("a".repeat(80), 12).endsWith("-12"), true);
});
