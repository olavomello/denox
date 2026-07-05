import type { Hono } from "hono";
import { STATUS_CODE } from "@std/http/status";

export function registerPingRoutes(app: Hono) {
  app.get("/ping", async (c) => {
    return c.json(
      {
        success: true,
        message: "Pong",
        timestamp: new Date().toISOString(),
      },
      STATUS_CODE.OK,
    );
  });
}