/**
 * Integration tests — wasm image processor tier (FR-4).
 *
 * Gated behind IMAGE_OPTIMIZATION_TESTS=1: the default CI stays free of
 * the optional dependency; enable the flag locally (or in a dedicated CI
 * job) after turning `media.optimization` on to exercise the real codec.
 */

import { assertEquals } from "@std/assert";
import { imageDimensions } from "@/shared/images.ts";

const enabled = Deno.env.get("IMAGE_OPTIMIZATION_TESTS") === "1";

Deno.test({
  name: "wasm tier resizes preserving aspect ratio and encodes WebP",
  ignore: !enabled,
  fn: async () => {
    const { WasmImageProcessor } = await import("@/shared/image_processor_wasm.ts");
    const processor = new WasmImageProcessor();

    // 4x4 red PNG generated on the fly via canvas-free constant.
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4nGP8z8DwnwEKmBhQAABBAgIBqzS2cQAAAABJRU5ErkJggg==",
      ),
      (c) => c.charCodeAt(0),
    );
    assertEquals(imageDimensions(png)?.width, 4);

    const resized = await processor.process(png, "image/png", { width: 2, quality: 80 });
    assertEquals(resized.contentType, "image/png");
    assertEquals(imageDimensions(resized.bytes)?.width, 2);
    assertEquals(imageDimensions(resized.bytes)?.height, 2);

    const webp = await processor.process(png, "image/png", { format: "webp", quality: 80 });
    assertEquals(webp.contentType, "image/webp");
    assertEquals(webp.bytes[8], 0x57); // 'W' of WEBP

    const both = await processor.process(png, "image/png", {
      width: 2,
      format: "webp",
      quality: 80,
    });
    assertEquals(both.contentType, "image/webp");
  },
});
