/**
 * User entity.
 *
 * Pure data shape — no behavior, no persistence, no HTTP (MVC: models
 * represent entities only).
 */

/** A registered user. */
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: string;
}

/** Data required to create a {@link User}. */
export interface NewUser {
  readonly name: string;
  readonly email: string;
}
