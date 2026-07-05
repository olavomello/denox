/**
 * Product routes — composition root of the products feature. Wires
 * repository → service → controller and registers the HTTP routes.
 */

import type { Hono } from "hono";
import { ProductController } from "@/api/products/product.controller.ts";
import { InMemoryProductRepository } from "@/api/products/product.repository.ts";
import { ProductService } from "@/api/products/product.service.ts";

/**
 * Registers the products feature on the given router.
 *
 * @param app API router.
 */
export function registerProductRoutes(app: Hono): void {
  const repository = new InMemoryProductRepository();
  const service = new ProductService(repository);
  const controller = new ProductController(service);

  app.get("/products", controller.index);
  app.get("/products/:id", controller.show);
  app.post("/products", controller.store);
}
