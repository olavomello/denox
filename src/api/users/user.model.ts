/**
 * User entity.
 *
 * Pure data shape — no behavior, no persistence, no HTTP (MVC: models
 * represent entities only).
 */

/** A registered user. */
/** Assignable user roles. */
export type UserRole = "admin" | "user";

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  /** PBKDF2 hash — never serialized to clients (see toPublicUser). */
  readonly passwordHash: string;
  readonly role: UserRole;
  readonly createdAt: string;
}

/** Client-safe user shape (no credentials). */
export type PublicUser = Omit<User, "passwordHash">;

/**
 * Strips credentials for serialization. Every endpoint returning users
 * MUST pass through this mapper.
 *
 * @param user Full user entity.
 * @returns Public representation.
 */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _secret, ...publicUser } = user;
  return publicUser;
}

/** Data required to create a {@link User}. */
export interface NewUser {
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: UserRole;
}
