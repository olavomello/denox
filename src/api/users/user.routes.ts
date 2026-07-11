/**
 * User routes — composition root of the users feature.
 *
 * Registration moved to the auth slice (signup): user creation now always
 * carries credentials. Read endpoints are admin-only (PII).
 */

import type { Hono } from "hono";
import { UserController } from "@/api/users/user.controller.ts";
import { userService } from "@/api/users/user.singletons.ts";
import { requireRole } from "@/middleware/auth.ts";

/**
 * Registers the users feature on the given router.
 *
 * @param app API router.
 */
export function registerUserRoutes(app: Hono): void {
  const controller = new UserController(userService);

  app.get("/users", requireRole("admin"), controller.index);
  app.get("/users/:id", requireRole("admin"), controller.show);
}
