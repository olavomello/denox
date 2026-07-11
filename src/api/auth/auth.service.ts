/**
 * Auth service — authentication and session lifecycle.
 *
 * Business rules only: hashing/verification, first-user-is-admin role
 * assignment, generic credential errors (no user enumeration) with timing
 * equalization, and session creation/revocation.
 */

import type { LoginDto, SignupDto } from "@/api/auth/auth.dto.ts";
import type { Session, SessionStore } from "@/api/auth/session.store.ts";
import type { User } from "@/api/users/user.model.ts";
import type { UserRepository } from "@/api/users/user.repository.ts";
import { ConflictException, UnauthorizedException } from "@/shared/exceptions/app_exception.ts";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/shared/password.ts";

/** Result of an authentication: the user and their fresh session. */
export interface AuthResult {
  readonly user: User;
  readonly session: Session;
}

/** Auth business rules. */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionStore,
  ) {}

  /**
   * Registers a new user and starts a session. The first user of the
   * system becomes `admin` (scaffold convention); everyone else is `user`.
   *
   * @param dto Validated signup payload.
   * @returns The created user and session.
   * @throws {ConflictException} When the e-mail is taken (repository index).
   */
  async signup(dto: SignupDto): Promise<AuthResult> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing !== null) {
      throw new ConflictException(`E-mail "${dto.email}" is already registered`);
    }
    const passwordHash = await hashPassword(dto.password);
    const isFirst = (await this.users.findAll()).length === 0;
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: isFirst ? "admin" : "user",
    });
    const session = await this.sessions.create(user.id);
    return { user, session };
  }

  /**
   * Verifies credentials and starts a session. Unknown e-mail and wrong
   * password return the same generic error; the unknown-e-mail path still
   * performs a hash verification so both failures cost the same.
   *
   * @param dto Validated login payload.
   * @returns The user and session.
   * @throws {UnauthorizedException} On any invalid credential.
   */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    if (user === null) {
      await verifyPassword(dto.password, await DUMMY_HASH);
      throw new UnauthorizedException("Invalid credentials");
    }
    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const session = await this.sessions.create(user.id);
    return { user, session };
  }

  /**
   * Revokes a session (replaying the old cookie afterwards is useless).
   *
   * @param sessionId Session identifier from the cookie.
   */
  async logout(sessionId: string): Promise<void> {
    await this.sessions.delete(sessionId);
  }

  /**
   * Resolves the user behind a session id.
   *
   * @param sessionId Session identifier from the cookie.
   * @returns The user, or null when the session is invalid/expired.
   */
  async resolve(sessionId: string): Promise<User | null> {
    const session = await this.sessions.get(sessionId);
    if (session === null) return null;
    return await this.users.findById(session.userId);
  }
}
