/**
 * Unit tests — image magic-byte sniffing (src/shared/images.ts).
 */

import { assertEquals } from "@std/assert";
import { sniffImageType } from "@/shared/images.ts";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP = new Uint8Array([
  0x52,
  0x49,
  0x46,
  0x46,
  0x00,
  0x00,
  0x00,
  0x00,
  0x57,
  0x45,
  0x42,
  0x50,
]);

Deno.test("sniffImageType detects supported formats from magic bytes", () => {
  assertEquals(sniffImageType(PNG), "image/png");
  assertEquals(sniffImageType(JPEG), "image/jpeg");
  assertEquals(sniffImageType(WEBP), "image/webp");
});

Deno.test("sniffImageType rejects unsupported or truncated content", () => {
  assertEquals(sniffImageType(new Uint8Array([0x47, 0x49, 0x46])), null); // GIF
  assertEquals(sniffImageType(new TextEncoder().encode("<svg></svg>")), null);
  assertEquals(sniffImageType(new Uint8Array([])), null);
  assertEquals(sniffImageType(PNG.subarray(0, 3)), null);
});
