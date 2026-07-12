/**
 * Public media routes — `/uploads/**` and the remote image proxy `/img`.
 *
 * Uploaded files are served under the public namespace (bytes live in the
 * driver-aware BlobStorage — Deno Deploy's filesystem is read-only at
 * runtime). Variant params (?w=&f=) are processed through the configured
 * ImageProcessor: passthrough serves originals (stable URL contract), the
 * wasm tier resizes/transcodes with results cached in BlobStorage and
 * deduplicated in flight.
 */

import type { Context, Hono } from "hono";
import { productService } from "@/api/products/product.routes.ts";
import { site } from "@/config/site.ts";
import { type Blob, createBlobStorage } from "@/shared/blob_storage.ts";
import { BadRequestException, NotFoundException } from "@/shared/exceptions/app_exception.ts";
import { getImageProcessor } from "@/shared/image_processor.ts";
import { sniffImageType } from "@/shared/images.ts";

const IMAGE_ID_PATTERN = /^[a-z0-9-]+\.(png|jpg|webp)$/;
const REMOTE_MAX_BYTES = 5 * 1024 * 1024;

const variantCache = createBlobStorage();
/** In-flight processing, deduplicated per variant key (NFR-4). */
const inFlight = new Map<string, Promise<Blob>>();

/** Parses and validates ?w= and ?f= against the configuration. */
function parseVariantParams(c: Context): { width?: number; format?: "webp" } {
  const rawWidth = c.req.query("w");
  const rawFormat = c.req.query("f");
  const params: { width?: number; format?: "webp" } = {};
  if (rawWidth !== undefined) {
    const width = Number(rawWidth);
    if (!site.media.widths.includes(width)) {
      throw new BadRequestException(
        `Unsupported width; allowed: ${site.media.widths.join(", ")}`,
      );
    }
    params.width = width;
  }
  if (rawFormat !== undefined) {
    if (rawFormat !== "webp") {
      throw new BadRequestException('Unsupported format; allowed: "webp"');
    }
    params.format = "webp";
  }
  return params;
}

/** Processes (or reuses) a variant, caching by key. */
async function variant(
  key: string,
  original: Blob,
  params: { width?: number; format?: "webp" },
): Promise<Blob> {
  if (params.width === undefined && params.format === undefined) return original;
  const cached = await variantCache.get(key);
  if (cached !== null) return cached;
  const pending = inFlight.get(key);
  if (pending !== undefined) return await pending;

  const work = (async () => {
    const processor = await getImageProcessor();
    const processed = await processor.process(original.bytes, original.contentType, {
      ...params,
      quality: site.media.quality,
    });
    const blob: Blob = { contentType: processed.contentType, bytes: processed.bytes };
    if (blob.bytes !== original.bytes) {
      await variantCache.put(key, blob);
    }
    return blob;
  })();
  inFlight.set(key, work);
  try {
    return await work;
  } finally {
    inFlight.delete(key);
  }
}

/** Serves a blob with long-lived caching. */
function serveBlob(c: Context, blob: Blob): Response {
  return c.body(blob.bytes.slice().buffer, 200, {
    "content-type": blob.contentType,
    "cache-control": "public, max-age=31536000, immutable",
  });
}

/** Options for the remote image handler (injectable for tests). */
export interface RemoteImageOptions {
  readonly remotePatterns: readonly string[];
}

/**
 * Builds the `/img` remote proxy handler (SSRF-guarded: https only,
 * allowlisted hosts, size ceiling, no redirects, magic-byte validation).
 *
 * @param options Allowlist (empty disables the endpoint).
 * @returns Hono handler.
 */
export function createRemoteImageHandler(options: RemoteImageOptions) {
  return async (c: Context): Promise<Response> => {
    if (options.remotePatterns.length === 0) {
      throw new NotFoundException("Remote image proxy is disabled");
    }
    const src = c.req.query("src") ?? "";
    let url: URL;
    try {
      url = new URL(src);
    } catch {
      throw new BadRequestException("src must be an absolute URL");
    }
    if (url.protocol !== "https:") {
      throw new BadRequestException("src must use https");
    }
    if (!options.remotePatterns.includes(url.host)) {
      throw new BadRequestException("src host is not allowlisted");
    }
    const params = parseVariantParams(c);
    const key = `remote/${encodeURIComponent(url.href)}`;

    let original = await variantCache.get(key);
    if (original === null) {
      const response = await fetch(url, { redirect: "error" });
      if (!response.ok) {
        throw new NotFoundException("Remote image could not be fetched");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length === 0 || bytes.length > REMOTE_MAX_BYTES) {
        throw new BadRequestException("Remote image exceeds the size limit");
      }
      const contentType = sniffImageType(bytes);
      if (contentType === null) {
        throw new BadRequestException("Remote content is not a supported image");
      }
      original = { contentType, bytes };
      await variantCache.put(key, original);
    }
    const blob = await variant(
      `${key}@w${params.width ?? 0}.${params.format ?? "orig"}`,
      original,
      params,
    );
    return serveBlob(c, blob);
  };
}

/**
 * Registers the public media routes.
 *
 * @param app Frontend router.
 */
export function registerMediaRoutes(app: Hono): void {
  app.get("/uploads/products/:id/:imageId", async (c) => {
    const imageId = c.req.param("imageId") ?? "";
    if (!IMAGE_ID_PATTERN.test(imageId)) {
      throw new BadRequestException("Invalid image identifier");
    }
    const params = parseVariantParams(c);
    const original = await productService.getImage(c.req.param("id") ?? "", imageId);
    const blob = await variant(
      `variants/products/${c.req.param("id")}/${imageId}@w${params.width ?? 0}.${
        params.format ?? "orig"
      }`,
      original,
      params,
    );
    return serveBlob(c, blob);
  });

  app.get("/img", createRemoteImageHandler({ remotePatterns: site.media.remotePatterns }));
}
