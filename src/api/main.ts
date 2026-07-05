// src/api/main.ts

import { Hono } from "hono";

import { registerUserRoutes } from "./routes/users.ts";
import { registerProductRoutes } from "./routes/products.ts";
import { registerPingRoutes } from "./routes/ping.ts";

const api = new Hono();

registerUserRoutes(api);
registerProductRoutes(api);
registerPingRoutes(api);

export default api;