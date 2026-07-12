/**
 * Auth routes — composition root of the auth feature.
 *
 * Login gets its own stricter rate limit bucket (brute-force protection)
 * on top of the global limiter.
 */

import type { Hono } from "hono";
import { AuthController } from "@/api/auth/auth.controller.ts";
import { authService } from "@/api/auth/auth.singletons.ts";
import { requireAuth } from "@/middleware/auth.ts";
import { rateLimit } from "@/middleware/rate_limit.ts";

const LOGIN_RATE_MAX = Number(Deno.env.get("LOGIN_RATE_LIMIT_MAX") ?? 10);
const LOGIN_RATE_WINDOW_MS = Number(
  Deno.env.get("LOGIN_RATE_LIMIT_WINDOW_MS") ?? 15 * 60 * 1000,
);

/**
 * Registers the auth feature on the given router.
 *
 * @param app API router.
 */
export function registerAuthRoutes(app: Hono): void {
  const controller = new AuthController(authService);

  app.post("/auth/signup", controller.signup);
  app.post(
    "/auth/login",
    rateLimit({ max: LOGIN_RATE_MAX, windowMs: LOGIN_RATE_WINDOW_MS }),
    controller.login,
  );
  app.post("/auth/logout", controller.logout);
  app.get("/auth/me", requireAuth(), controller.me);
}

import {
  errorResponse,
  jsonBody,
  okResponse,
  registerOpenApiPaths,
  userSecurity,
} from "@/shared/openapi.ts";

const credentialErrors = {
  "400": errorResponse("Validation error (per-field details)"),
  "429": errorResponse("Rate limited"),
};

registerOpenApiPaths({
  "/api/auth/signup": {
    post: {
      operationId: "signup",
      summary: "Create account and start a session",
      description:
        "The FIRST user of the system becomes admin (scaffold convention). Sets the denox_session cookie.",
      tags: ["Auth"],
      requestBody: jsonBody({
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, maxLength: 120 },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8, maxLength: 128 },
        },
        required: ["name", "email", "password"],
        example: { name: "Grace Hopper", email: "grace@example.com", password: "compilers-rule" },
      }),
      responses: {
        "201": okResponse("Account created; session cookie set", {
          $ref: "#/components/schemas/PublicUser",
        }),
        "400": errorResponse("Validation error"),
        "409": errorResponse("E-mail already registered"),
      },
    },
  },
  "/api/auth/login": {
    post: {
      operationId: "login",
      summary: "Verify credentials and start a session",
      description:
        "Wrong e-mail and wrong password return the same generic 401 (no user enumeration). Stricter rate bucket: 10 attempts / 15 min per IP.",
      tags: ["Auth"],
      requestBody: jsonBody({
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
        required: ["email", "password"],
        example: { email: "admin@denox.dev", password: "denox-admin" },
      }),
      responses: {
        "200": okResponse("Session cookie set", { $ref: "#/components/schemas/PublicUser" }),
        "401": errorResponse("Invalid credentials (generic)"),
        ...credentialErrors,
      },
    },
  },
  "/api/auth/logout": {
    post: {
      operationId: "logout",
      summary: "Revoke the current session",
      description: "Replaying the old cookie afterwards returns 401.",
      tags: ["Auth"],
      responses: { "204": { description: "Session revoked; cookie cleared" } },
    },
  },
  "/api/auth/me": {
    get: {
      operationId: "me",
      summary: "Authenticated user",
      tags: ["Auth"],
      security: [...userSecurity],
      responses: {
        "200": okResponse("Current user", { $ref: "#/components/schemas/PublicUser" }),
        "401": errorResponse("No valid session"),
      },
    },
  },
});
