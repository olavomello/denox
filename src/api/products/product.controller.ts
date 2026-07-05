/**
 * Product HTTP controller. Receives requests, validates input, calls the
 * service and shapes the response envelope — nothing else.
 */

import type { Context } from "hono";
import { parseCreateProductDto } from "@/api/products/product.dto.ts";
import type { ProductService } from "@/api/products/product.service.ts";
import { BadRequestException } from "@/shared/exceptions/app_exception.ts";
import { ok } from "@/shared/http.ts";

/** HTTP adapter for the products feature. */
export class ProductController {
  constructor(private readonly service: ProductService) {}

  /**
   * `GET /api/products` — lists products.
   *
   * @param c Request context.
   * @returns 200 with the product list.
   */
  index = async (c: Context): Promise<Response> => {
    const products = await this.service.list();
    return c.json(ok(products), 200);
  };

  /**
   * `GET /api/products/:id` — fetches a single product.
   *
   * @param c Request context.
   * @returns 200 with the product, or 404 via the error handler.
   */
  show = async (c: Context): Promise<Response> => {
    const product = await this.service.getById(c.req.param("id") ?? "");
    return c.json(ok(product), 200);
  };

  /**
   * `POST /api/products` — creates a product.
   *
   * @param c Request context.
   * @returns 201 with the created product.
   */
  store = async (c: Context): Promise<Response> => {
    const body: unknown = await c.req.json().catch(() => {
      throw new BadRequestException("Request body must be valid JSON");
    });
    const dto = parseCreateProductDto(body);
    const product = await this.service.create(dto);
    return c.json(ok(product), 201);
  };
}
