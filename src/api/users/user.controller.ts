/**
 * User HTTP controller.
 *
 * Controllers only: receive the request, parse/validate input, call the
 * service and shape the response envelope. No business rules, no
 * persistence, no file operations. Errors are thrown and handled by the
 * centralized error handler.
 */

import type { Context } from "hono";
import { parseCreateUserDto } from "@/api/users/user.dto.ts";
import type { UserService } from "@/api/users/user.service.ts";
import { BadRequestException } from "@/shared/exceptions/app_exception.ts";
import { ok } from "@/shared/http.ts";

/** HTTP adapter for the users feature. */
export class UserController {
  constructor(private readonly service: UserService) {}

  /**
   * `GET /api/users` — lists users.
   *
   * @param c Request context.
   * @returns 200 with the user list.
   */
  index = async (c: Context): Promise<Response> => {
    const users = await this.service.list();
    return c.json(ok(users), 200);
  };

  /**
   * `GET /api/users/:id` — fetches a single user.
   *
   * @param c Request context.
   * @returns 200 with the user, or 404 via the error handler.
   */
  show = async (c: Context): Promise<Response> => {
    const user = await this.service.getById(c.req.param("id") ?? "");
    return c.json(ok(user), 200);
  };

  /**
   * `POST /api/users` — creates a user.
   *
   * @param c Request context.
   * @returns 201 with the created user.
   */
  store = async (c: Context): Promise<Response> => {
    const body: unknown = await c.req.json().catch(() => {
      throw new BadRequestException("Request body must be valid JSON");
    });
    const dto = parseCreateUserDto(body);
    const user = await this.service.create(dto);
    return c.json(ok(user), 201);
  };
}
