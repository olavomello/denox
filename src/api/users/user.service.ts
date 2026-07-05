/**
 * User business rules.
 *
 * Services contain business logic only: no HTTP, no HTML, no routing.
 * Dependencies are injected through the constructor (composition over
 * inheritance), which makes the service trivially unit testable with a
 * mocked repository.
 */

import type { CreateUserDto } from "@/api/users/user.dto.ts";
import type { User } from "@/api/users/user.model.ts";
import type { UserRepository } from "@/api/users/user.repository.ts";
import { ConflictException, NotFoundException } from "@/shared/exceptions/app_exception.ts";

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

  /**
   * Creates a new user.
   *
   * @param dto Validated user creation data.
   * @returns Created user.
   * @throws {ConflictException} When the email is already registered.
   */
  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.repository.findByEmail(dto.email);
    if (existing !== null) {
      throw new ConflictException(`Email "${dto.email}" is already registered`);
    }
    return await this.repository.create(dto);
  }
}
