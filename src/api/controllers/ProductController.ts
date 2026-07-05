import type { Context } from "hono";
import { STATUS_CODE } from "@std/http/status";

export class ProductController {
  static index(c: Context) {
    return c.json(
      {
        success: true,
        data: [
          {
            id: 1,
            name: "Product 1",
            price: 10.99,
          },
          {
            id: 2,
            name: "Product 2",
            price: 19.99,
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
        message: "Product created successfully",
        timestamp: new Date().toISOString(),
      },
      STATUS_CODE.OK,
    );
  }
}