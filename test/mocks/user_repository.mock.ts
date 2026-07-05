/**
 * Mock UserRepository for unit tests.
 *
 * Records calls and returns scripted results so UserService can be tested
 * with zero real persistence.
 */

import type { NewUser, User } from "@/api/users/user.model.ts";
import type { UserRepository } from "@/api/users/user.repository.ts";

/** Call-recording mock of {@link UserRepository}. */
export class MockUserRepository implements UserRepository {
  readonly calls: { method: string; args: unknown[] }[] = [];

  constructor(private readonly users: readonly User[] = []) {}

  /** @returns The scripted user list. */
  findAll(): Promise<readonly User[]> {
    this.calls.push({ method: "findAll", args: [] });
    return Promise.resolve(this.users);
  }

  /** @returns The scripted user with the given id, or null. */
  findById(id: string): Promise<User | null> {
    this.calls.push({ method: "findById", args: [id] });
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  /** @returns The scripted user with the given email, or null. */
  findByEmail(email: string): Promise<User | null> {
    this.calls.push({ method: "findByEmail", args: [email] });
    return Promise.resolve(this.users.find((user) => user.email === email) ?? null);
  }

  /** Echoes the payload back as a created user. */
  create(data: NewUser): Promise<User> {
    this.calls.push({ method: "create", args: [data] });
    return Promise.resolve({
      id: "33333333-3333-4333-8333-333333333333",
      name: data.name,
      email: data.email,
      createdAt: "2026-01-03T00:00:00.000Z",
    });
  }
}
