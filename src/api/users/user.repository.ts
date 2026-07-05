/**
 * User persistence.
 *
 * {@link UserRepository} is the contract the service layer depends on
 * (dependency inversion). {@link InMemoryUserRepository} is the default
 * implementation for development and tests; a database-backed
 * implementation can replace it without touching services or controllers.
 */

import type { NewUser, User } from "@/api/users/user.model.ts";

/** Persistence contract for users. */
export interface UserRepository {
  findAll(): Promise<readonly User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: NewUser): Promise<User>;
}

/**
 * In memory {@link UserRepository}.
 *
 * State lives inside the instance (no static/global state), so each
 * composition — including each test — gets an isolated store.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  constructor(seed: readonly User[] = []) {
    for (const user of seed) {
      this.users.set(user.id, user);
    }
  }

  /** @returns Every stored user. */
  findAll(): Promise<readonly User[]> {
    return Promise.resolve([...this.users.values()]);
  }

  /** @returns The user with the given id, or null. */
  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  /** @returns The user with the given email, or null. */
  findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return Promise.resolve(user);
    }
    return Promise.resolve(null);
  }

  /** Persists a new user and returns it with generated fields. */
  create(data: NewUser): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return Promise.resolve(user);
  }
}
