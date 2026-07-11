/**
 * Authorization middleware.
 *
 * `requireAuth` resolves the session cookie into a user (stashed in the
 * context as "authUser"); `requireRole` additionally enforces a role.
 * API paths get JSON envelopes (401/403); page paths redirect to /login
 * or render the HTML error page. `originCheck` closes the CSRF surface on
 * cookie-authenticated mutations.
 */

import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { authService } from "@/api/auth/auth.singletons.ts";
import type { User, UserRole } from "@/api/users/user.model.ts";
import { ForbiddenException, UnauthorizedException } from "@/shared/exceptions/app_exception.ts";

/** Session cookie name. */
export const SESSION_COOKIE = "denox_session";

/** Resolves the authenticated user for a request, or null. */
async function resolveUser(c: Context): Promise<User | null> {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId === undefined || sessionId === "") return null;
  return await authService.resolve(sessionId);
}

/** Stashes the user for downstream handlers/pages. */
function stash(c: Context, user: User): void {
  (c as unknown as { set(key: string, value: unknown): void }).set("authUser", user);
}

/**
 * Requires a valid session. API requests get 401 envelopes; page requests
 * are redirected to /login.
 *
 * @returns Middleware handler.
 */
export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    const user = await resolveUser(c);
    if (user === null) {
      if (c.req.path.startsWith("/api")) {
        throw new UnauthorizedException();
      }
      return c.redirect("/login", 302);
    }
    stash(c, user);
    await next();
    return;
  };
}

/**
 * Requires a valid session with the given role (401 without a session,
 * 403 with the wrong role).
 *
 * @param role Required role.
 * @returns Middleware handler.
 */
export function requireRole(role: UserRole): MiddlewareHandler {
  return async (c, next) => {
    const user = await resolveUser(c);
    if (user === null) {
      if (c.req.path.startsWith("/api")) {
        throw new UnauthorizedException();
      }
      return c.redirect("/login", 302);
    }
    if (user.role !== role) {
      throw new ForbiddenException();
    }
    stash(c, user);
    await next();
    return;
  };
}

/**
 * CSRF guard for cookie-authenticated state changes: mutations carrying a
 * session cookie must present a same-origin Origin header or none at all
 * (non-browser clients). Cross-origin browser form posts are rejected.
 *
 * @returns Middleware handler (register once on the API router).
 */
export function originCheck(): MiddlewareHandler {
  const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  return async (c, next) => {
    if (
      MUTATING.has(c.req.method) &&
      getCookie(c, SESSION_COOKIE) !== undefined
    ) {
      const origin = c.req.header("origin");
      if (origin !== undefined) {
        const requestHost = c.req.header("host");
        let originHost: string | null = null;
        try {
          originHost = new URL(origin).host;
        } catch {
          originHost = null;
        }
        if (originHost === null || originHost !== requestHost) {
          throw new ForbiddenException("Cross-origin request rejected");
        }
      }
    }
    await next();
  };
}
