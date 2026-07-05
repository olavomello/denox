/**
 * Application composition root.
 *
 * Builds the Hono application: global middleware (logging, security, rate
 * limiting), feature routers and centralized error handling. Exported
 * separately from `main.ts` so tests can exercise the full app through
 * `app.request()` / `app.fetch` without opening a socket.
 */

import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import apiRoutes from "@/api/main.ts";
import webRoutes from "@/frontend/main.ts";
import { errorHandler, notFoundHandler } from "@/middleware/error_handler.ts";
import { rateLimit } from "@/middleware/rate_limit.ts";
import { requestLogger } from "@/middleware/request_logger.ts";
import { security } from "@/middleware/security.ts";

/**
 * Creates a fully wired application instance.
 *
 * @returns Configured Hono app.
 */
export function createApp(): Hono {
  const app = new Hono();

  // Static files
  app.use(
    "/assets/*",
    serveStatic({
      root: "./public",
    }),
  );

  app.use(
    "/images/*",
    serveStatic({
      root: "./public",
    }),
  );

  app.use("*", requestLogger());
  for (const middleware of security()) {
    app.use("*", middleware);
  }
  app.use("/api/*", rateLimit());

  app.route("/api", apiRoutes);
  app.route("/", webRoutes);

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
}

/** Default application instance used by the server entrypoint and tests. */
export const app: Hono = createApp();
