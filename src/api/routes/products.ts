// src/api/routes/products.ts

import type { Hono } from "hono";
import { ProductController } from "../controllers/ProductController.ts";

export function registerProductRoutes(app: Hono) {
  app.get("/products", ProductController.index);
  app.post("/products", ProductController.store);
}