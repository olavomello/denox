/**
 * Product HTTP controller. Receives requests, validates input, calls the
 * service and shapes the response envelope — nothing else.
 */

import type { Context } from "hono";
import { parseCreateProductDto, parseUpdateProductDto } from "@/api/products/product.dto.ts";
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
   * `PATCH /api/products/:id` — partial product update.
   *
   * JSON body: name, price and/or description.
   * multipart/form-data: the same text fields plus repeatable `image` files
   * to attach and repeatable `removeImages` ids to delete — data and photos
   * updated in a single request.
   *
   * @param c Request context.
   * @returns 200 with the updated product.
   */
  update = async (c: Context): Promise<Response> => {
    const id = c.req.param("id") ?? "";

    if (c.req.header("content-type")?.includes("multipart/form-data")) {
      const body = await c.req.parseBody({ all: true }).catch(() => {
        throw new BadRequestException("Request body must be valid multipart/form-data");
      });

      const dataFields: Record<string, unknown> = {};
      const name = body["name"];
      if (typeof name === "string") dataFields.name = name;
      const description = body["description"];
      if (typeof description === "string") dataFields.description = description;
      const slug = body["slug"];
      if (typeof slug === "string" && slug !== "") dataFields.slug = slug;
      const price = body["price"];
      if (typeof price === "string" && price.trim() !== "") dataFields.price = Number(price);

      const patch = Object.keys(dataFields).length > 0 ? parseUpdateProductDto(dataFields) : {};

      const imageField = body["image"];
      const imageEntries = Array.isArray(imageField)
        ? imageField
        : imageField !== undefined
        ? [imageField]
        : [];
      const files = imageEntries.filter((entry): entry is File => entry instanceof File);
      const newImages = await Promise.all(
        files.map(async (file) => new Uint8Array(await file.arrayBuffer())),
      );

      const removeField = body["removeImages"];
      const removeEntries = Array.isArray(removeField)
        ? removeField
        : removeField !== undefined
        ? [removeField]
        : [];
      const removeImageIds = removeEntries.filter((entry): entry is string =>
        typeof entry === "string" && entry !== ""
      );
      for (const imageId of removeImageIds) {
        if (!/^[a-z0-9-]+\.(png|jpg|webp)$/.test(imageId)) {
          throw new ValidationException("Invalid image upload", {
            fields: { removeImages: `"${imageId}" is not a valid image identifier` },
          });
        }
      }

      const altsField = body["alts"];
      const altsEntries = Array.isArray(altsField)
        ? altsField
        : altsField !== undefined
        ? [altsField]
        : [];
      const alts = altsEntries.filter((entry): entry is string => typeof entry === "string");

      const product = await this.service.updateProduct(
        id,
        patch,
        newImages,
        removeImageIds,
        alts,
      );
      return c.json(ok(product), 200);
    }

    const body: unknown = await c.req.json().catch(() => {
      throw new BadRequestException("Request body must be valid JSON");
    });
    const patch = parseUpdateProductDto(body);
    const product = await this.service.updateDetails(id, patch);
    return c.json(ok(product), 200);
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
