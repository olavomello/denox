/**
 * Unit tests — header-based dimension sniffing (no codec).
 */

import { assertEquals } from "@std/assert";
import { imageDimensions } from "@/shared/images.ts";

const PNG_1x1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

/** Minimal JPEG with a SOF0 frame declaring 7x5 px. */
const JPEG_7x5 = new Uint8Array([
  0xff,
  0xd8, // SOI
  0xff,
  0xe0,
  0x00,
  0x04,
  0x00,
  0x00, // APP0 (len 4)
  0xff,
  0xc0,
  0x00,
  0x0b,
  0x08,
  0x00,
  0x05,
  0x00,
  0x07,
  0x01,
  0x00,
  0x11,
  0x00, // SOF0 h=5 w=7
]);

/** WebP VP8X header declaring 16x9 px. */
const WEBP_16x9 = new Uint8Array([
  0x52,
  0x49,
  0x46,
  0x46,
  0x00,
  0x00,
  0x00,
  0x00, // RIFF
  0x57,
  0x45,
  0x42,
  0x50, // WEBP
  0x56,
  0x50,
  0x38,
  0x58, // VP8X
  0x0a,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x0f,
  0x00,
  0x00, // width-1 = 15
  0x08,
  0x00,
  0x00, // height-1 = 8
]);

Deno.test("imageDimensions reads PNG, JPEG and WebP headers", () => {
  assertEquals(imageDimensions(PNG_1x1), { width: 1, height: 1 });
  assertEquals(imageDimensions(JPEG_7x5), { width: 7, height: 5 });
  assertEquals(imageDimensions(WEBP_16x9), { width: 16, height: 9 });
});

Deno.test("imageDimensions returns null for unknown or truncated content", () => {
  assertEquals(imageDimensions(new TextEncoder().encode("not an image")), null);
  assertEquals(imageDimensions(PNG_1x1.subarray(0, 10)), null);
  assertEquals(imageDimensions(JPEG_7x5.subarray(0, 8)), null);
});
