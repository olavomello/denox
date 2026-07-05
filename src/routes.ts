import { Hono } from "hono";

import apiRoutes from "./api/main.ts";
import webRoutes  from "./frontend/main.ts";

const app = new Hono();

app.route("/api", apiRoutes);
app.route("/", webRoutes);

export default app;