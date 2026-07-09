/**
 * Product DTOs and validation. Parses untrusted input at the boundary and
 * throws {@link ValidationException} with per-field details on failure.
 */

import { ValidationException } from "@/shared/exceptions/app_exception.ts";
import type { NewProduct } from "@/api/products/product.model.ts";

/** Partial payload accepted by `PATCH /api/products/:id`. */
export type UpdateProductDto = Partial<NewProduct>;

/** Payload accepted by `POST /api/products`. */
export type CreateProductDto = NewProduct;

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const PRICE_MAX = 1_000_000;
const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Validates and normalizes the create-product payload.
 *
 * @param input Untrusted request body.
 * @returns Typed, trimmed DTO.
 * @throws {ValidationException} When any field is invalid.
 */
export function parseCreateProductDto(input: unknown): CreateProductDto {
  const fields: Record<string, string> = {};

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationException("Request body must be a JSON object");
  }

  const body = input as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    fields.name = `name must be a string with ${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} characters`;
  }

  const price = typeof body.price === "number" ? body.price : Number.NaN;
  if (!Number.isFinite(price) || price <= 0 || price > PRICE_MAX) {
    fields.price = `price must be a number between 0 (exclusive) and ${PRICE_MAX}`;
  }

  let description: string | undefined;
  if (body.description !== undefined) {
    description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length === 0 || description.length > DESCRIPTION_MAX_LENGTH) {
      fields.description =
        `description must be a non-empty string with up to ${DESCRIPTION_MAX_LENGTH} characters`;
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationException("Invalid product payload", { fields });
  }

  return {
    name,
    price,
    ...(description !== undefined ? { description } : {}),
  };
}

/**
 * Validates the partial update payload — every field optional, at least one
 * required. Reuses the create validation for each provided field.
 *
 * @param input Untrusted request body.
 * @returns Typed patch with only the provided fields.
 * @throws {ValidationException} When empty or any provided field is invalid.
 */
export function parseUpdateProductDto(input: unknown): UpdateProductDto {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationException("Request body must be a JSON object");
  }
  const body = input as Record<string, unknown>;
  const provided = ["name", "price", "description"].filter((key) => body[key] !== undefined);
  if (provided.length === 0) {
    throw new ValidationException(
      "At least one field (name, price, description) must be provided",
    );
  }
  // Fill omitted fields with valid placeholders, validate, then keep only
  // the provided ones — single source of truth for the field rules.
  const validated = parseCreateProductDto({
    name: body.name ?? "placeholder",
    price: body.price ?? 1,
    ...(body.description !== undefined ? { description: body.description } : {}),
  });
  const patch: Record<string, unknown> = {};
  for (const key of provided) {
    patch[key] = validated[key as keyof typeof validated];
  }
  return patch as UpdateProductDto;
}
