/**
 * Deno KV backed {@link UserRepository}.
 *
 * Key layout:
 *   ["users", id]             → User
 *   ["users_by_email", email] → id   (uniqueness index)
 *
 * E-mail uniqueness is enforced atomically: creation commits the entity and
 * its index in one transaction guarded by a versionstamp check, so exactly
 * one of two concurrent creations with the same e-mail can succeed.
 */

import type { NewUser, User } from "@/api/users/user.model.ts";
import type { UserRepository } from "@/api/users/user.repository.ts";
import { ConflictException } from "@/shared/exceptions/app_exception.ts";

/** KV implementation of {@link UserRepository}. */
export class KvUserRepository implements UserRepository {
  constructor(private readonly kv: Deno.Kv) {}

  /** @returns Every stored user. */
  async findAll(): Promise<readonly User[]> {
    const users: User[] = [];
    for await (const entry of this.kv.list<User>({ prefix: ["users"] })) {
      users.push(entry.value);
    }
    return users;
  }

  /** @returns The user with the given id, or null. */
  async findById(id: string): Promise<User | null> {
    const entry = await this.kv.get<User>(["users", id]);
    return entry.value;
  }

  /** @returns The user with the given email, or null. */
  async findByEmail(email: string): Promise<User | null> {
    const index = await this.kv.get<string>(["users_by_email", email]);
    if (index.value === null) return null;
    return await this.findById(index.value);
  }

  /**
   * Persists a new user atomically together with its e-mail index.
   *
   * @throws {ConflictException} When the e-mail index already exists
   * (including under concurrent creation).
   */
  async create(data: NewUser): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      createdAt: new Date().toISOString(),
    };
    const result = await this.kv.atomic()
      .check({ key: ["users_by_email", user.email], versionstamp: null })
      .set(["users", user.id], user)
      .set(["users_by_email", user.email], user.id)
      .commit();
    if (!result.ok) {
      throw new ConflictException(`Email "${user.email}" is already registered`);
    }
    return user;
  }
}
