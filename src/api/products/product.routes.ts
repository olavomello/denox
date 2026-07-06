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

/**
 * Registers the products feature on the given router.
 *
 * @param app API router.
 */
export function registerProductRoutes(app: Hono): void {
  const repository = createProductRepository();
  const service = new ProductService(repository);
  const controller = new ProductController(service);

  app.get("/products", controller.index);
  app.get("/products/:id", controller.show);
  app.post("/products", controller.store);
}
