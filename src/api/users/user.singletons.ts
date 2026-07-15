/**
 * Shared users singletons.
 *
 * The repository/service instances live here (instead of the routes file)
 * so the auth slice and the auth middleware can depend on them without
 * import cycles: routes → middleware → auth singletons → these.
 */

import type { UserRepository } from "@/api/users/user.repository.ts";
import { InMemoryUserRepository } from "@/api/users/user.repository.ts";
import { KvUserRepository } from "@/api/users/user.repository.kv.ts";
import { PostgresUserRepository } from "@/api/users/user.repository.postgres.ts";
import { UserService } from "@/api/users/user.service.ts";
import { env } from "@/config/env.ts";
import { requireKv, requirePool } from "@/shared/storage.ts";

/**
 * Chooses the {@link UserRepository} implementation for the configured
 * storage driver (see STORAGE_DRIVER in .env.example).
 *
 * @returns Repository instance.
 */
export function createUserRepository(): UserRepository {
  switch (env.STORAGE_DRIVER) {
    case "postgres":
      return new PostgresUserRepository(requirePool());
    case "kv":
      return new KvUserRepository(requireKv());
    default:
      return new InMemoryUserRepository();
  }
}

/** Shared user repository instance. */
export const userRepository: UserRepository = createUserRepository();

/** Shared user service instance. */
export const userService: UserService = new UserService(userRepository);
