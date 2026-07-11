/**
 * Auth controller — HTTP adapter for signup/login/logout/me.
 *
 * Owns the session cookie (HttpOnly, SameSite=Lax, Secure outside
 * development); everything user-facing goes through toPublicUser.
 */

import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { parseLoginDto, parseSignupDto } from "@/api/auth/auth.dto.ts";
import type { AuthService } from "@/api/auth/auth.service.ts";
import { SESSION_TTL_MS } from "@/api/auth/session.store.ts";
import { toPublicUser, type User } from "@/api/users/user.model.ts";
import { env } from "@/config/env.ts";
import { SESSION_COOKIE } from "@/middleware/auth.ts";
import { BadRequestException } from "@/shared/exceptions/app_exception.ts";
import { ok } from "@/shared/http.ts";

/** HTTP layer of the auth feature. */
export class AuthController {
  constructor(private readonly service: AuthService) {}

  /** Sets the session cookie on a response. */
  private attachSession(c: Context, sessionId: string): void {
    setCookie(c, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      secure: env.APP_ENV !== "development",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
  }

  /** Parses a JSON body or throws a 400. */
  private async json(c: Context): Promise<unknown> {
    return await c.req.json().catch(() => {
      throw new BadRequestException("Request body must be valid JSON");
    });
  }

  /**
   * `POST /api/auth/signup` — registers and signs in.
   *
   * @param c Request context.
   * @returns 201 with the public user; session cookie set.
   */
  signup = async (c: Context): Promise<Response> => {
    const dto = parseSignupDto(await this.json(c));
    const { user, session } = await this.service.signup(dto);
    this.attachSession(c, session.id);
    return c.json(ok(toPublicUser(user)), 201);
  };

  /**
   * `POST /api/auth/login` — verifies credentials and signs in.
   *
   * @param c Request context.
   * @returns 200 with the public user; session cookie set.
   */
  login = async (c: Context): Promise<Response> => {
    const dto = parseLoginDto(await this.json(c));
    const { user, session } = await this.service.login(dto);
    this.attachSession(c, session.id);
    return c.json(ok(toPublicUser(user)), 200);
  };

  /**
   * `POST /api/auth/logout` — revokes the current session.
   *
   * @param c Request context.
   * @returns 204; cookie cleared.
   */
  logout = async (c: Context): Promise<Response> => {
    const sessionId = getCookie(c, SESSION_COOKIE);
    if (sessionId !== undefined && sessionId !== "") {
      await this.service.logout(sessionId);
    }
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.body(null, 204);
  };

  /**
   * `GET /api/auth/me` — the authenticated user (requireAuth stashes it).
   *
   * @param c Request context.
   * @returns 200 with the public user.
   */
  me = (c: Context): Response => {
    const user = (c as unknown as { get(key: string): unknown }).get("authUser") as User;
    return c.json(ok(toPublicUser(user)));
  };
}
