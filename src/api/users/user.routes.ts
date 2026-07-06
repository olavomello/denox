/**
 * User routes — composition root of the users feature.
 *
 * Wires repository → service → controller (constructor injection) and
 * registers the HTTP routes. This is the only file in the feature that
 * knows about concrete implementations.
 */

import type { Hono } from "hono";
import { UserController } from "@/api/users/user.controller.ts";
import type { UserRepository } from "@/api/users/user.repository.ts";
import { InMemoryUserRepository } from "@/api/users/user.repository.ts";
import { KvUserRepository } from "@/api/users/user.repository.kv.ts";
import { UserService } from "@/api/users/user.service.ts";
import { env } from "@/config/env.ts";
import { requireKv } from "@/shared/storage.ts";

/**
 * Chooses the {@link UserRepository} implementation for the configured
 * storage driver (see STORAGE_DRIVER in .env.example).
 *
 * @returns Repository instance.
 */
export function createUserRepository(): UserRepository {
  return env.STORAGE_DRIVER === "kv"
    ? new KvUserRepository(requireKv())
    : new InMemoryUserRepository();
}

/**
 * Registers the users feature on the given router.
 *
 * @param app API router.
 */
export function registerUserRoutes(app: Hono): void {
  const repository = createUserRepository();
  const service = new UserService(repository);
  const controller = new UserController(service);

  app.get("/users", controller.index);
  app.get("/users/:id", controller.show);
  app.post("/users", controller.store);
}
