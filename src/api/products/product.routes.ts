/**
 * Product routes — composition root of the products feature. Wires
 * repository → service → controller and registers the HTTP routes.
 */

import type { Hono } from "hono";
import { requireRole } from "@/middleware/auth.ts";
import { ProductController } from "@/api/products/product.controller.ts";
import type { ProductRepository } from "@/api/products/product.repository.ts";
import { InMemoryProductRepository } from "@/api/products/product.repository.ts";
import { KvProductRepository } from "@/api/products/product.repository.kv.ts";
import { ProductService } from "@/api/products/product.service.ts";
import { createBlobStorage } from "@/shared/blob_storage.ts";
import { env } from "@/config/env.ts";
import { requireKv } from "@/shared/storage.ts";

/**
 * Chooses the {@link ProductRepository} implementation for the configured
 * storage driver.
 *
 * @returns Repository instance.
 */
export function createProductRepository(): ProductRepository {
  return env.STORAGE_DRIVER === "kv"
    ? new KvProductRepository(requireKv())
    : new InMemoryProductRepository();
}

/** Shared product service instance (API + server-rendered pages). */
export const productService: ProductService = new ProductService(
  createProductRepository(),
  createBlobStorage(),
);

/**
 * Registers the products feature on the given router.
 *
 * @param app API router.
 */
export function registerProductRoutes(app: Hono): void {
  const controller = new ProductController(productService);

  app.get("/products", controller.index);
  app.get("/products/:id", controller.show);
  app.post("/products", requireRole("admin"), controller.store);
  app.patch("/products/:id", requireRole("admin"), controller.update);
  app.post("/products/:id/images", requireRole("admin"), controller.uploadImages);
  app.delete("/products/:id/images/:imageId", requireRole("admin"), controller.deleteImage);
  app.delete("/products/:id", requireRole("admin"), controller.destroy);
}

import {
  errorResponse,
  jsonBody,
  okResponse,
  pathParam,
  queryParam,
  registerOpenApiPaths,
  userSecurity,
} from "@/shared/openapi.ts";

const adminGuard = { security: [...userSecurity], "x-denox-role": "admin" as const };
const productOk = (description: string) =>
  okResponse(description, { $ref: "#/components/schemas/Product" });
const adminErrors = {
  "401": errorResponse("No session"),
  "403": errorResponse("Not an admin"),
};

registerOpenApiPaths({
  "/api/products": {
    get: {
      operationId: "listProducts",
      summary: "List products",
      "x-denox-sort": 1,
      tags: ["Products"],
      responses: {
        "200": okResponse("Every product", {
          type: "array",
          items: { $ref: "#/components/schemas/Product" },
        }),
      },
    },
    post: {
      operationId: "createProduct",
      summary: "Create product",
      "x-denox-sort": 2,
      description: "The friendly slug is derived from the name (collisions get -2, -3 suffixes).",
      tags: ["Products"],
      ...adminGuard,
      requestBody: jsonBody({
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, maxLength: 200 },
          price: { type: "number", exclusiveMinimum: 0 },
          description: { type: "string", maxLength: 2000 },
          sku: { type: "string", pattern: "^[A-Za-z0-9._-]{1,64}$" },
        },
        required: ["name", "price"],
        example: { name: "DenoX T-Shirt", price: 49.9, description: "Soft cotton tee." },
      }),
      responses: {
        "201": productOk("Created"),
        "400": errorResponse("Validation error"),
        ...adminErrors,
      },
    },
  },
  "/api/products/{id}": {
    get: {
      operationId: "getProduct",
      summary: "Get product",
      "x-denox-sort": 3,
      tags: ["Products"],
      parameters: [pathParam("id", "Product id", { type: "string", format: "uuid" })],
      responses: { "200": productOk("The product"), "404": errorResponse("Unknown product") },
    },
    patch: {
      operationId: "updateProduct",
      summary: "Update product",
      "x-denox-sort": 4,
      description:
        "JSON: partial name/price/description/slug (slug must match ^[a-z0-9-]{1,80}$, 409 on conflict; renames never change the slug). Multipart: same text fields plus repeatable `image` files, repeatable `removeImages` ids and repeatable `alts` aligned to the new uploads.",
      tags: ["Products"],
      ...adminGuard,
      parameters: [pathParam("id", "Product id", { type: "string", format: "uuid" })],
      requestBody: jsonBody({
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "number" },
          description: { type: "string" },
          slug: { type: "string", pattern: "^[a-z0-9-]{1,80}$" },
          sku: {
            type: "string",
            description: "Set/change the unique SKU; empty string clears it.",
          },
        },
        example: { description: "Updated copy.", slug: "denox-t-shirt" },
      }, false),
      responses: {
        "200": productOk("Updated"),
        "400": errorResponse("Validation error"),
        "404": errorResponse("Unknown product or image"),
        "409": errorResponse("Slug already taken"),
        ...adminErrors,
      },
    },
    delete: {
      operationId: "deleteProduct",
      summary: "Delete product",
      description: "Cascades stored images.",
      "x-denox-sort": 7,
      tags: ["Products"],
      ...adminGuard,
      parameters: [pathParam("id", "Product id", { type: "string", format: "uuid" })],
      responses: {
        "204": { description: "Deleted" },
        "404": errorResponse("Unknown product"),
        ...adminErrors,
      },
    },
  },
  "/api/products/{id}/images": {
    post: {
      operationId: "uploadProductImages",
      summary: "Upload images",
      "x-denox-sort": 5,
      description:
        "Repeatable `image` files (PNG/JPEG/WebP, 1MB each, magic-byte validated). Dimensions are sniffed and stored per image.",
      tags: ["Products"],
      ...adminGuard,
      parameters: [pathParam("id", "Product id", { type: "string", format: "uuid" })],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                image: { type: "array", items: { type: "string", format: "binary" } },
              },
            },
          },
        },
      },
      responses: {
        "200": productOk("Images attached"),
        "400": errorResponse("Invalid upload"),
        ...adminErrors,
      },
      "x-denox-examples": [{ name: "upload", multipart: [{ name: "image", file: true }] }],
    },
  },
  "/uploads/products/{id}/{imageId}": {
    get: {
      operationId: "getProductImage",
      summary: "Get image (variants)",
      description:
        "Serves an uploaded image from the public namespace. Optional variant params: w (configured allowlist, default 320/640/960/1280) and f=webp — processed on the wasm tier (media.optimization), original bytes on the passthrough default.",
      tags: ["Products"],
      "x-denox-sort": 8,
      parameters: [
        pathParam("id", "Product id", { type: "string", format: "uuid" }),
        pathParam("imageId", "Image file id (e.g. <uuid>.png)"),
        queryParam("w", "Variant width (must be in media.widths)", {
          type: "integer",
          enum: [320, 640, 960, 1280],
        }),
        queryParam("f", "Variant format", { type: "string", enum: ["webp"] }),
      ],
      responses: {
        "200": { description: "Image bytes (long-lived immutable cache)" },
        "400": errorResponse("Width outside the allowlist / bad format"),
        "404": errorResponse("Unknown product or image"),
      },
    },
  },
  "/api/products/{id}/images/{imageId}": {
    delete: {
      operationId: "deleteProductImage",
      summary: "Delete image",
      "x-denox-sort": 6,
      tags: ["Products"],
      ...adminGuard,
      parameters: [
        pathParam("id", "Product id", { type: "string", format: "uuid" }),
        pathParam("imageId", "Image file id (e.g. <uuid>.png)"),
      ],
      responses: {
        "200": productOk("Image removed"),
        "404": errorResponse("Unknown product/image"),
        ...adminErrors,
      },
    },
  },
});
