/**
 * Auth routes — composition root of the auth feature.
 *
 * Login gets its own stricter rate limit bucket (brute-force protection)
 * on top of the global limiter.
 */

import type { Hono } from "hono";
import { AuthController } from "@/api/auth/auth.controller.ts";
import { authService } from "@/api/auth/auth.singletons.ts";
import { requireAuth } from "@/middleware/auth.ts";
import { rateLimit } from "@/middleware/rate_limit.ts";

const LOGIN_RATE_MAX = Number(Deno.env.get("LOGIN_RATE_LIMIT_MAX") ?? 10);
const LOGIN_RATE_WINDOW_MS = Number(
  Deno.env.get("LOGIN_RATE_LIMIT_WINDOW_MS") ?? 15 * 60 * 1000,
);

/**
 * Registers the auth feature on the given router.
 *
 * @param app API router.
 */
export function registerAuthRoutes(app: Hono): void {
  const controller = new AuthController(authService);

  app.post("/auth/signup", controller.signup);
  app.post(
    "/auth/login",
    rateLimit({ max: LOGIN_RATE_MAX, windowMs: LOGIN_RATE_WINDOW_MS }),
    controller.login,
  );
  app.post("/auth/logout", controller.logout);
  app.get("/auth/me", requireAuth(), controller.me);
}
