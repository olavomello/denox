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

import { okResponse, registerOpenApiPaths } from "@/shared/openapi.ts";

registerOpenApiPaths({
  "/api/ping": {
    get: {
      operationId: "ping",
      summary: "Ping",
      description: "Liveness probe.",
      "x-denox-sort": 1,
      tags: ["Health"],
      responses: {
        "200": okResponse("Pong", { type: "object", properties: { pong: { type: "boolean" } } }),
      },
    },
  },
  "/api/health": {
    get: {
      operationId: "health",
      summary: "Health",
      "x-denox-sort": 2,
      description: "Uptime, environment and storage driver.",
      tags: ["Health"],
      responses: {
        "200": okResponse("Health report", {
          type: "object",
          properties: {
            status: { type: "string" },
            uptimeSeconds: { type: "number" },
            environment: { type: "string" },
          },
        }),
      },
    },
  },
});
