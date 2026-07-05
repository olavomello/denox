/**
 * User routes — composition root of the users feature.
 *
 * Wires repository → service → controller (constructor injection) and
 * registers the HTTP routes. This is the only file in the feature that
 * knows about concrete implementations.
 */

import type { Hono } from "hono";
import { UserController } from "@/api/users/user.controller.ts";
import { InMemoryUserRepository } from "@/api/users/user.repository.ts";
import { UserService } from "@/api/users/user.service.ts";

/**
 * Registers the users feature on the given router.
 *
 * @param app API router.
 */
export function registerUserRoutes(app: Hono): void {
  const repository = new InMemoryUserRepository();
  const service = new UserService(repository);
  const controller = new UserController(service);

  app.get("/users", controller.index);
  app.get("/users/:id", controller.show);
  app.post("/users", controller.store);
}
