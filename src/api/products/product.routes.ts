/**
 * Product routes — composition root of the products feature. Wires
 * repository → service → controller and registers the HTTP routes.
 */

import type { Hono } from "hono";
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
  app.post("/products", controller.store);
  app.post("/products/:id/images", controller.uploadImages);
  app.delete("/products/:id/images/:imageId", controller.deleteImage);
  app.delete("/products/:id", controller.destroy);
}
