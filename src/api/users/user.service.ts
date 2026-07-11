/**
 * User business rules.
 *
 * Services contain business logic only: no HTTP, no HTML, no routing.
 * Dependencies are injected through the constructor (composition over
 * inheritance), which makes the service trivially unit testable with a
 * mocked repository.
 */

import type { User } from "@/api/users/user.model.ts";
import type { UserRepository } from "@/api/users/user.repository.ts";
import { NotFoundException } from "@/shared/exceptions/app_exception.ts";

/** Application service for the users feature. */
export class UserService {
  constructor(private readonly repository: UserRepository) {}

  /**
   * Lists every user.
   *
   * @returns All users.
   */
  list(): Promise<readonly User[]> {
    return this.repository.findAll();
  }

  /**
   * Finds a user by id.
   *
   * @param id User identifier.
   * @returns The user.
   * @throws {NotFoundException} When no user has the given id.
   */
  async getById(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (user === null) {
      throw new NotFoundException(`User "${id}" not found`);
    }
    return user;
  }
}
