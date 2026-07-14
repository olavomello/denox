/**
 * API router. Aggregates every feature router under `/api`. New features
 * are added with one `registerXRoutes(api)` line — nothing else changes.
 */

import { Hono } from "hono";
import { registerAuthRoutes } from "@/api/auth/auth.routes.ts";
import { registerContactRoutes } from "@/api/contact/contact.routes.ts";
import { registerHealthRoutes } from "@/api/health/health.routes.ts";
import { registerPaymentRoutes } from "@/api/payments/payment.routes.ts";
import { originCheck } from "@/middleware/auth.ts";
import { registerProductRoutes } from "@/api/products/product.routes.ts";
import { registerUserRoutes } from "@/api/users/user.routes.ts";
import { registerWidgetsRoutes } from "@/api/widgets/widgets.routes.ts";

const api = new Hono();

api.use("*", originCheck());

registerHealthRoutes(api);
registerAuthRoutes(api);
registerUserRoutes(api);
registerProductRoutes(api);
registerContactRoutes(api);
registerPaymentRoutes(api);
registerWidgetsRoutes(api);
// denox:features — `denox generate feature` wires new slices below.

export default api;
