/**
 * User routes — composition root of the users feature.
 *
 * Registration moved to the auth slice (signup): user creation now always
 * carries credentials. Read endpoints are admin-only (PII).
 */

import type { Hono } from "hono";
import { UserController } from "@/api/users/user.controller.ts";
import { userService } from "@/api/users/user.singletons.ts";
import { requireRole } from "@/middleware/auth.ts";

/**
 * Registers the users feature on the given router.
 *
 * @param app API router.
 */
export function registerUserRoutes(app: Hono): void {
  const controller = new UserController(userService);

  app.get("/users", requireRole("admin"), controller.index);
  app.get("/users/:id", requireRole("admin"), controller.show);
}

import {
  errorResponse,
  okResponse,
  pathParam,
  registerOpenApiPaths,
  userSecurity,
} from "@/shared/openapi.ts";

const adminGuard = {
  security: [...userSecurity],
  "x-denox-role": "admin" as const,
};

registerOpenApiPaths({
  "/api/users": {
    get: {
      operationId: "listUsers",
      summary: "List users",
      "x-denox-sort": 1,
      tags: ["Users"],
      ...adminGuard,
      responses: {
        "200": okResponse("Every user (credentials never serialized)", {
          type: "array",
          items: { $ref: "#/components/schemas/PublicUser" },
        }),
        "401": errorResponse("No session"),
        "403": errorResponse("Not an admin"),
      },
    },
  },
  "/api/users/{id}": {
    get: {
      operationId: "getUser",
      summary: "Get user",
      "x-denox-sort": 2,
      tags: ["Users"],
      ...adminGuard,
      parameters: [pathParam("id", "User id", { type: "string", format: "uuid" })],
      responses: {
        "200": okResponse("The user", { $ref: "#/components/schemas/PublicUser" }),
        "401": errorResponse("No session"),
        "403": errorResponse("Not an admin"),
        "404": errorResponse("Unknown user"),
      },
    },
  },
});
