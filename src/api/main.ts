/**
 * API router. Aggregates every feature router under `/api`. New features
 * are added with one `registerXRoutes(api)` line — nothing else changes.
 */

import { Hono } from "hono";
import { registerHealthRoutes } from "@/api/health/health.routes.ts";
import { registerProductRoutes } from "@/api/products/product.routes.ts";
import { registerUserRoutes } from "@/api/users/user.routes.ts";

const api = new Hono();

registerHealthRoutes(api);
registerUserRoutes(api);
registerProductRoutes(api);

export default api;
