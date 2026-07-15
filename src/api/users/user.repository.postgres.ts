/**
 * Postgres {@link UserRepository}. Uniqueness (email) is a native UNIQUE
 * constraint; conflicts surface as the same 409 the other drivers produce.
 */

import type { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import type { NewUser, User } from "@/api/users/user.model.ts";
import type { UserRepository } from "@/api/users/user.repository.ts";
import { ConflictException } from "@/shared/exceptions/app_exception.ts";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
}

/** @returns Domain user from a row. */
function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as User["role"],
    createdAt: row.created_at.toISOString(),
  };
}

/** Postgres-backed user store. */
export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  /** @returns Every user. */
  async findAll(): Promise<readonly User[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject<UserRow>("SELECT * FROM users ORDER BY created_at");
      return result.rows.map(toUser);
    } finally {
      client.release();
    }
  }

  /** @returns The user with the given id, or null. */
  async findById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
      return result.rows[0] ? toUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /** @returns The user with the given e-mail, or null. */
  async findByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject<UserRow>(
        "SELECT * FROM users WHERE email = $1",
        [email],
      );
      return result.rows[0] ? toUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /** Creates a user (409 on duplicate e-mail via the UNIQUE constraint). */
  async create(data: NewUser): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      createdAt: new Date().toISOString(),
    };
    const client = await this.pool.connect();
    try {
      await client.queryObject(
        `INSERT INTO users (id, name, email, password_hash, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, user.name, user.email, user.passwordHash, user.role, user.createdAt],
      );
      return user;
    } catch (error) {
      if (String(error).includes("users_email_key")) {
        throw new ConflictException("E-mail already registered");
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
