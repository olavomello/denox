/**
 * Product HTTP controller. Receives requests, validates input, calls the
 * service and shapes the response envelope — nothing else.
 */

import type { Context } from "hono";
import { parseCreateProductDto } from "@/api/products/product.dto.ts";
import type { ProductService } from "@/api/products/product.service.ts";
import { BadRequestException, ValidationException } from "@/shared/exceptions/app_exception.ts";
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

  /**
   * `POST /api/products/:id/image` — attaches an image (multipart field
   * `image`).
   *
   * @param c Request context.
   * @returns 200 with the updated product (imageUrl set).
   */
  uploadImage = async (c: Context): Promise<Response> => {
    const body = await c.req.parseBody().catch(() => {
      throw new BadRequestException("Request body must be multipart/form-data");
    });
    const file = body["image"];
    if (!(file instanceof File)) {
      throw new ValidationException("Invalid image upload", {
        fields: { image: 'multipart field "image" with a file is required' },
      });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const product = await this.service.attachImage(c.req.param("id") ?? "", bytes);
    return c.json(ok(product), 200);
  };

  /**
   * `GET /api/products/:id/image` — serves the stored product image.
   *
   * @param c Request context.
   * @returns Image bytes with its detected content type.
   */
  image = async (c: Context): Promise<Response> => {
    const blob = await this.service.getImage(c.req.param("id") ?? "");
    return c.body(blob.bytes.slice().buffer, 200, {
      "content-type": blob.contentType,
      "cache-control": "public, max-age=300",
    });
  };
}
