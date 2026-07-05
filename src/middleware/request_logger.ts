/**
 * Request logging middleware.
 *
 * Logs one structured line per request (method, path, status, duration)
 * through the shared logging abstraction.
 */

import type { MiddlewareHandler } from "hono";
import { logger } from "@/shared/logger.ts";

/**
 * Creates the request logging middleware.
 *
 * @returns Hono middleware logging every handled request.
 */
export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const startedAt = performance.now();
    await next();
    const durationMs = Math.round(performance.now() - startedAt);
    logger.info("request", {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs,
    });
  };
}
