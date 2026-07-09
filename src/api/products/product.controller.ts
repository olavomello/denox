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
   * `POST /api/products/:id/images` — attaches one or more images
   * (multipart field `image`, repeatable).
   *
   * @param c Request context.
   * @returns 200 with the updated product (images list extended).
   */
  uploadImages = async (c: Context): Promise<Response> => {
    const body = await c.req.parseBody({ all: true }).catch(() => {
      throw new BadRequestException("Request body must be multipart/form-data");
    });
    const field = body["image"];
    const entries = Array.isArray(field) ? field : field !== undefined ? [field] : [];
    const files = entries.filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      throw new ValidationException("Invalid image upload", {
        fields: { image: 'multipart field "image" with at least one file is required' },
      });
    }
    const bytes = await Promise.all(
      files.map(async (file) => new Uint8Array(await file.arrayBuffer())),
    );
    const product = await this.service.attachImages(c.req.param("id") ?? "", bytes);
    return c.json(ok(product), 200);
  };

  /**
   * `DELETE /api/products/:id/images/:imageId` — removes one image.
   *
   * @param c Request context.
   * @returns 200 with the updated product.
   */
  deleteImage = async (c: Context): Promise<Response> => {
    const product = await this.service.removeImage(
      c.req.param("id") ?? "",
      c.req.param("imageId") ?? "",
    );
    return c.json(ok(product), 200);
  };

  /**
   * `DELETE /api/products/:id` — deletes the product and its images.
   *
   * @param c Request context.
   * @returns 200 with a deletion confirmation.
   */
  destroy = async (c: Context): Promise<Response> => {
    const id = c.req.param("id") ?? "";
    await this.service.remove(id);
    return c.json(ok({ deleted: true, id }), 200);
  };
}
