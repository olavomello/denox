/**
 * Public media routes — `/uploads/**`.
 *
 * Uploaded files are served under the public namespace (same URL space as
 * the `public/` folder) instead of `/api`, following the project convention
 * for user-facing assets. The bytes live in the driver-aware BlobStorage —
 * on Deno Deploy the filesystem is read-only at runtime, so uploads cannot
 * be written into `public/` as physical files; this route makes them
 * indistinguishable from public assets URL-wise while keeping them durable
 * in KV. The static handler (`public/`) takes precedence for real files and
 * falls through to these routes.
 */

import type { Hono } from "hono";
import { productService } from "@/api/products/product.routes.ts";
import { BadRequestException } from "@/shared/exceptions/app_exception.ts";

const IMAGE_ID_PATTERN = /^[a-z0-9-]+\.(png|jpg|webp)$/;

/**
 * Registers the public upload-serving routes.
 *
 * @param app Frontend router.
 */
export function registerMediaRoutes(app: Hono): void {
  app.get("/uploads/products/:id/:imageId", async (c) => {
    const imageId = c.req.param("imageId") ?? "";
    if (!IMAGE_ID_PATTERN.test(imageId)) {
      throw new BadRequestException("Invalid image identifier");
    }
    const blob = await productService.getImage(c.req.param("id") ?? "", imageId);
    return c.body(blob.bytes.slice().buffer, 200, {
      "content-type": blob.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    });
  });
}
