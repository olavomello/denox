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
import { site } from "@/config/site.ts";

/**
 * Creates a fully wired application instance.
 *
 * @returns Configured Hono app.
 */
export function createApp(): Hono {
  const app = new Hono();

  app.use("*", requestLogger());
  for (const middleware of security()) {
    app.use("*", middleware);
  }

  // Static files — after the security stack so assets also carry secure
  // headers, with configurable cache headers for performance.
  app.use(
    "/*",
    serveStatic({
      root: "./public",
      onFound: (_path, c) => {
        c.header(
          "Cache-Control",
          `public, max-age=${site.performance.staticCacheSeconds}`,
        );
      },
    }),
  );

  app.use("/api/*", rateLimit());

  app.route("/api", apiRoutes);
  app.route("/", webRoutes);

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
}

/** Default application instance used by the server entrypoint and tests. */
export const app: Hono = createApp();
