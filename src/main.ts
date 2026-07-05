/**
 * Server entrypoint.
 *
 * Boots the HTTP server with the validated configuration. Keep this file
 * minimal: all wiring lives in `src/app.ts`, all configuration in
 * `src/config/env.ts`.
 */

import { app } from "@/app.ts";
import { env } from "@/config/env.ts";
import { logger } from "@/shared/logger.ts";

Deno.serve(
  {
    port: env.PORT,
    hostname: env.HOSTNAME,
    onListen: ({ hostname, port }) => {
      logger.info(`Denox listening on http://${hostname}:${port}`, { env: env.APP_ENV });
    },
  },
  app.fetch,
);
