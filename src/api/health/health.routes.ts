/**
 * Health feature — liveness and readiness endpoints for monitoring,
 * load balancers and container orchestrators.
 */

import type { Hono } from "hono";
import { ok } from "@/shared/http.ts";
import { env } from "@/config/env.ts";

const startedAt = Date.now();

/**
 * Registers health endpoints on the given router.
 *
 * @param app API router.
 */
export function registerHealthRoutes(app: Hono): void {
  app.get("/ping", (c) => c.json(ok({ message: "pong", timestamp: new Date().toISOString() })));

  app.get("/health", (c) =>
    c.json(ok({
      status: "healthy",
      environment: env.APP_ENV,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    })));
}
