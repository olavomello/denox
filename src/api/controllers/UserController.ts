import type { Context } from "hono";
import { STATUS_CODE } from "@std/http/status";

export class UserController {
  static index(c: Context) {
    return c.json(
      {
        success: true,
        data: [
          {
            id: 1,
            name: "User 1",
            email: "user1@example.com",
          },
          {
            id: 2,
            name: "User 2",
            email: "user2@example.com",
          },
        ],
      },
      STATUS_CODE.OK,
    );
  }

  static store(c: Context) {
    return c.json(
      {
        success: true,
        message: "User created successfully",
        timestamp: new Date().toISOString(),
      },
      STATUS_CODE.OK,
    );
  }
}